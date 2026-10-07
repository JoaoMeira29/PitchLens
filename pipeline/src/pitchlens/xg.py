"""xG model v1: logistic regression on shot geometry, body part and play type.

Trained on the league season and tested on the tournaments (config.TEST_COMPETITIONS), so the test
asks whether a model learned on one competition rates chances well in another. Penalties get a
separate value, the conversion rate of training-set penalties. Every number in the results comes
from `pitchlens evaluate`, never from hand-typed values.
"""

from collections.abc import Collection
from dataclasses import dataclass

import numpy as np
import numpy.typing as npt
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import brier_score_loss, log_loss
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

BODY_PARTS = ("foot", "head", "other")  # first value is the reference category
PLAY_TYPES = ("open_play", "set_piece", "counter", "direct_free_kick")
SET_PIECE_PATTERNS = ("From Corner", "From Free Kick", "From Throw In")
NUMERIC = ["distance", "angle", "first_time"]
CATEGORICAL = ["body_part_group", "play_type"]
CALIBRATION_BINS = (0.0, 0.05, 0.1, 0.2, 0.3, 0.5, 1.0)

Floats = npt.NDArray[np.float64]


def play_type(features: pd.DataFrame) -> pd.Series:
    """Group StatsBomb shot type and play pattern into the play types the model uses."""
    groups = np.select(
        [
            features.shot_type == "Free Kick",
            (features.shot_type == "Corner") | features.play_pattern.isin(SET_PIECE_PATTERNS),
            features.play_pattern == "From Counter",
        ],
        ["direct_free_kick", "set_piece", "counter"],
        default="open_play",
    )
    return pd.Series(groups, index=features.index, name="play_type")


def split(features: pd.DataFrame, test_competitions: Collection[str]) -> pd.Series:
    """'test' for shots in the test competitions, 'train' otherwise."""
    sides = np.where(features.competition.isin(list(test_competitions)), "test", "train")
    return pd.Series(sides, index=features.index, name="split")


def _design(features: pd.DataFrame) -> pd.DataFrame:
    return pd.DataFrame(
        {
            "distance": features.distance.astype(float),
            "angle": features.angle.astype(float),
            "first_time": features.first_time.astype(float),
            "body_part_group": features.body_part_group,
            "play_type": play_type(features),
        }
    )


@dataclass(frozen=True)
class XgModel:
    pipeline: Pipeline
    feature_names: list[str]
    coefficients: list[float]
    intercept: float


def fit_xg(features: pd.DataFrame) -> XgModel:
    """Fit the logistic regression (L2, C=1.0: scikit-learn's default) on the given shots."""
    encoder = OneHotEncoder(categories=[list(BODY_PARTS), list(PLAY_TYPES)], drop="first")
    pipeline = Pipeline(
        [
            (
                "encode",
                ColumnTransformer(
                    [("categories", encoder, CATEGORICAL), ("numbers", "passthrough", NUMERIC)],
                    verbose_feature_names_out=False,
                ),
            ),
            ("model", LogisticRegression(C=1.0, max_iter=1000)),
        ]
    )
    pipeline.fit(_design(features), features.is_goal.astype(int))
    model = pipeline.named_steps["model"]
    names = [str(name) for name in pipeline.named_steps["encode"].get_feature_names_out()]
    return XgModel(
        pipeline=pipeline,
        feature_names=names,
        coefficients=[float(value) for value in model.coef_[0]],
        intercept=float(model.intercept_[0]),
    )


def predict_xg(model: XgModel, features: pd.DataFrame) -> Floats:
    probabilities: Floats = model.pipeline.predict_proba(_design(features))[:, 1]
    return probabilities


def penalty_xg(shots: pd.DataFrame, train_competitions: Collection[str]) -> tuple[float, int]:
    """Conversion rate of match penalties (shootouts excluded) in the training competitions."""
    penalties = shots[
        (shots.period < 5)
        & (shots.shot_type == "Penalty")
        & shots.competition.isin(list(train_competitions))
    ]
    return float(penalties.is_goal.mean()), len(penalties)


def evaluate(predictions: pd.DataFrame) -> pd.DataFrame:
    """Log loss and Brier score on the test split for our xG, StatsBomb xG and a naive baseline."""
    train, test = (
        predictions[predictions.split == "train"],
        predictions[predictions.split == "test"],
    )
    goals = test.is_goal.astype(int).to_numpy()
    candidates = {
        "PitchLens xG v1": test.xg.to_numpy(),
        "StatsBomb xG": test.statsbomb_xg.to_numpy(),
        "Baseline (training goal rate)": np.full(len(test), train.is_goal.mean()),
    }
    rows = [
        {
            "model": name,
            "shots": len(test),
            "goals": int(goals.sum()),
            "log_loss": float(log_loss(goals, predicted, labels=[0, 1])),
            "brier": float(brier_score_loss(goals, predicted)),
        }
        for name, predicted in candidates.items()
    ]
    return pd.DataFrame(rows)


def calibration_table(predicted: Floats, goals: npt.NDArray[np.bool_]) -> pd.DataFrame:
    """Shots, goals, mean predicted xG and observed goal rate per predicted-probability bin."""
    frame = pd.DataFrame({"predicted": predicted, "goal": goals.astype(int)})
    frame["bin"] = pd.cut(frame.predicted, CALIBRATION_BINS, include_lowest=True)
    table = (
        frame.groupby("bin", observed=True)
        .agg(shots=("goal", "size"), goals=("goal", "sum"), mean_predicted=("predicted", "mean"))
        .reset_index()
    )
    table["observed_rate"] = table.goals / table.shots
    return table
