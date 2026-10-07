"""xG v1: split, model, penalties and evaluation.

The model tests use shots simulated from a known logistic rule (seeded), so every expectation is
derived from that rule rather than typed in: the fitted model must recover its direction and score
close to the true probabilities, and better than the naive baseline.
"""

from pathlib import Path

import numpy as np
import pandas as pd
import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from pitchlens.xg import (
    PLAY_TYPES,
    calibration_table,
    evaluate,
    fit_xg,
    penalty_xg,
    play_type,
    predict_xg,
    split,
)
from pitchlens.xg_run import train, write_results

TEST = ("Cup",)


def simulated_features(n: int = 4000, seed: int = 7) -> tuple[pd.DataFrame, np.ndarray]:
    """Shots whose true goal probability falls with distance and rises with angle."""
    rng = np.random.default_rng(seed)
    distance = rng.uniform(2, 35, n)
    angle = rng.uniform(0.05, 1.5, n)
    true_p = 1 / (1 + np.exp(-(-0.5 - 0.15 * distance + 1.2 * angle)))
    features = pd.DataFrame(
        {
            "event_id": [f"s{i}" for i in range(n)],
            "match_id": np.arange(n) // 20,
            "competition": np.where(np.arange(n) < n * 3 // 4, "League", "Cup"),
            "distance": distance,
            "angle": angle,
            "body_part_group": rng.choice(["foot", "head", "other"], n),
            "shot_type": "Open Play",
            "play_pattern": rng.choice(["Regular Play", "From Corner", "From Counter"], n),
            "first_time": rng.random(n) < 0.3,
            "is_goal": rng.random(n) < true_p,
            "statsbomb_xg": true_p,
        }
    )
    return features, true_p


def test_split_keeps_every_match_on_one_side() -> None:
    features, _ = simulated_features()
    sides = split(features, TEST)
    assert set(sides) == {"train", "test"}
    assert features.groupby("match_id").apply(lambda m: sides[m.index].nunique()).max() == 1
    assert set(features.competition[sides == "test"]) == set(TEST)


def test_play_type_groups() -> None:
    features = pd.DataFrame(
        {
            "shot_type": ["Free Kick", "Open Play", "Open Play", "Open Play", "Corner"],
            "play_pattern": [
                "From Free Kick",
                "From Corner",
                "From Counter",
                "Regular Play",
                "Other",
            ],
        }
    )
    assert list(play_type(features)) == [
        "direct_free_kick",
        "set_piece",
        "counter",
        "open_play",
        "set_piece",
    ]
    assert set(play_type(features)) <= set(PLAY_TYPES)


def test_model_learns_the_direction_of_the_true_rule() -> None:
    features, _ = simulated_features()
    model = fit_xg(features)
    coefficients = dict(zip(model.feature_names, model.coefficients, strict=True))
    assert coefficients["distance"] < 0
    assert coefficients["angle"] > 0


def test_model_scores_close_to_the_truth_and_beats_the_baseline() -> None:
    features, true_p = simulated_features()
    sides = split(features, TEST)
    model = fit_xg(features[sides == "train"])
    test = features[sides == "test"]
    predicted = predict_xg(model, test)
    goals = test.is_goal.to_numpy()

    def log_loss(p: np.ndarray) -> float:
        return float(-np.mean(goals * np.log(p) + (1 - goals) * np.log(1 - p)))

    baseline = np.full(len(test), features[sides == "train"].is_goal.mean())
    assert log_loss(predicted) < log_loss(baseline)
    assert log_loss(predicted) == pytest.approx(log_loss(true_p[sides == "test"]), abs=0.01)


@settings(max_examples=50, deadline=None)
@given(st.floats(0, 120), st.floats(0, np.pi))
def test_predictions_are_probabilities(distance: float, angle: float) -> None:
    features, _ = simulated_features(n=400)
    model = fit_xg(features)
    shot = features.head(1).assign(distance=distance, angle=angle)
    assert 0 <= predict_xg(model, shot)[0] <= 1


def test_penalty_xg_is_the_training_conversion_rate() -> None:
    shots = pd.DataFrame(
        {
            "period": [1, 2, 1, 5, 1],
            "shot_type": ["Penalty", "Penalty", "Penalty", "Penalty", "Open Play"],
            "is_goal": [True, True, False, True, True],
            "competition": ["League", "League", "League", "League", "League"],
        }
    )
    value, count = penalty_xg(shots, train_competitions={"League"})
    assert count == 3  # the period 5 kick and the open-play shot are not counted
    assert value == pytest.approx(2 / 3)


def test_evaluate_compares_against_statsbomb_and_baseline() -> None:
    predictions = pd.DataFrame(
        {
            "split": ["train", "train", "test", "test"],
            "is_goal": [True, False, True, False],
            "xg": [0.6, 0.2, 0.7, 0.1],
            "statsbomb_xg": [0.5, 0.3, 0.6, 0.2],
        }
    )
    metrics = evaluate(predictions).set_index("model")
    goals = np.array([1, 0])
    for model, p in {
        "PitchLens xG v1": np.array([0.7, 0.1]),
        "StatsBomb xG": np.array([0.6, 0.2]),
        "Baseline (training goal rate)": np.array([0.5, 0.5]),
    }.items():
        expected = -np.mean(goals * np.log(p) + (1 - goals) * np.log(1 - p))
        assert metrics.loc[model, "log_loss"] == pytest.approx(expected)
        assert metrics.loc[model, "brier"] == pytest.approx(np.mean((p - goals) ** 2))


def test_calibration_table_counts_every_shot_once() -> None:
    predicted = np.array([0.01, 0.04, 0.12, 0.45, 0.8])
    goals = np.array([False, False, True, False, True])
    table = calibration_table(predicted, goals)
    assert table.shots.sum() == len(predicted)
    assert table.goals.sum() == goals.sum()


def test_train_then_evaluate_writes_consistent_results(tmp_path: Path) -> None:
    features, _ = simulated_features()
    staged, models = tmp_path / "staged", tmp_path / "models"
    staged.mkdir()
    features.assign(period=1).to_parquet(staged / "shot_features.parquet")
    matches = features.groupby("match_id").competition.first().reset_index()
    matches.to_parquet(staged / "matches.parquet")
    penalties = pd.DataFrame(
        {
            "match_id": [0, 0, 0, matches.match_id.iloc[-1]],
            "period": [1, 2, 5, 1],
            "shot_type": ["Penalty"] * 4,
            "is_goal": [True, False, True, True],
        }
    )
    penalties.to_parquet(staged / "shots.parquet")

    metadata = train(staged, models, TEST)
    assert metadata["penalty_train_count"] == 2  # match 0 is in the league; period 5 excluded
    assert metadata["penalty_xg"] == pytest.approx(0.5)

    output = tmp_path / "results.md"
    write_results(models, output)
    text = output.read_text(encoding="utf-8")
    predictions = pd.read_parquet(models / "xg_v1_predictions.parquet")
    ours = evaluate(predictions).to_dict("records")[0]  # first row is PitchLens xG v1
    assert ours["model"] == "PitchLens xG v1"
    row = f"| PitchLens xG v1 | {ours['shots']} | {ours['goals']} | {ours['log_loss']:.4f} |"
    assert row in text
    assert (models / "xg_v1_calibration.png").is_file()
