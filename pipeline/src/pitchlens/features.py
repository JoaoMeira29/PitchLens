"""Shot features for the xG model (phase 2, xG v1).

Geometry uses PitchLens internal coordinates (metres, attacking towards x = 105). The goal posts are
StatsBomb's posts (y = 36 and 44) scaled to the internal pitch, so the goal mouth is 6.8 m wide
rather than the real 7.32 m; see docs/adr/0003-goal-mouth-geometry.md.

Penalty shootouts (period 5) and penalties are excluded: penalties get their own xG value, and
shootout kicks are not match shots. Own goals are not shots, so they never reach this table.
"""

from pathlib import Path

import numpy as np
import numpy.typing as npt
import pandas as pd

from pitchlens.coords import PITCH_LENGTH, SB_LENGTH, statsbomb_to_internal

GOAL_X = PITCH_LENGTH
POST_LOW_Y = statsbomb_to_internal(SB_LENGTH, 44.0)[1]
POST_HIGH_Y = statsbomb_to_internal(SB_LENGTH, 36.0)[1]
GOAL_CENTRE_Y = (POST_LOW_Y + POST_HIGH_Y) / 2

BODY_PART_GROUPS = {"Head": "head", "Right Foot": "foot", "Left Foot": "foot"}

COLUMNS = [
    "event_id",
    "match_id",
    "competition",
    "season",
    "period",
    "distance",
    "angle",
    "body_part_group",
    "shot_type",
    "play_pattern",
    "first_time",
    "is_goal",
    "statsbomb_xg",
]


Floats = npt.NDArray[np.float64]


def _distances(x: Floats, y: Floats) -> Floats:
    distances: Floats = np.hypot(GOAL_X - x, GOAL_CENTRE_Y - y)
    return distances


def _angles(x: Floats, y: Floats) -> Floats:
    angles: Floats = np.abs(
        np.arctan2(POST_HIGH_Y - y, GOAL_X - x) - np.arctan2(POST_LOW_Y - y, GOAL_X - x)
    )
    return angles


def distance_to_goal(x: float, y: float) -> float:
    """Distance in metres from the shot to the centre of the goal."""
    return float(_distances(np.array([x]), np.array([y]))[0])


def shot_angle(x: float, y: float) -> float:
    """Angle in radians the goal mouth subtends at the shot: 0 (no view) to pi (on the line)."""
    return float(_angles(np.array([x]), np.array([y]))[0])


def build_shot_features(shots: pd.DataFrame, matches: pd.DataFrame) -> pd.DataFrame:
    """One row per non-penalty match shot, with the features xG v1 is trained on."""
    if shots.empty:
        return pd.DataFrame(columns=COLUMNS)
    match_shots = shots[(shots.period < 5) & (shots.shot_type != "Penalty")]
    features = match_shots.merge(
        matches[["match_id", "competition", "season"]], on="match_id", how="left", validate="m:1"
    )
    x, y = features.x.to_numpy(dtype=float), features.y.to_numpy(dtype=float)
    features["distance"] = _distances(x, y)
    features["angle"] = _angles(x, y)
    features["body_part_group"] = features.body_part.map(BODY_PART_GROUPS).fillna("other")
    return features[COLUMNS].reset_index(drop=True)


def write_shot_features(staged_dir: Path) -> int:
    """Build shot_features.parquet from the staged shots and matches; returns the row count."""
    features = build_shot_features(
        pd.read_parquet(staged_dir / "shots.parquet"),
        pd.read_parquet(staged_dir / "matches.parquet"),
    )
    features.to_parquet(staged_dir / "shot_features.parquet", index=False)
    return len(features)
