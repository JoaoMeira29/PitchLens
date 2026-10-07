"""Shot geometry and the shot_features table. Expected values are written out from the formulas."""

import math

import pandas as pd
import pytest
from hypothesis import given
from hypothesis import strategies as st

from pitchlens.coords import PITCH_LENGTH, PITCH_WIDTH, SB_WIDTH
from pitchlens.features import (
    POST_HIGH_Y,
    POST_LOW_Y,
    build_shot_features,
    distance_to_goal,
    shot_angle,
)

# StatsBomb draws the posts at y = 36 and 44; scaled to the internal pitch the goal is 6.8 m wide.
HALF_GOAL = (44 - 36) / 2 * PITCH_WIDTH / SB_WIDTH
CENTRE_Y = PITCH_WIDTH / 2


def test_posts_are_the_scaled_statsbomb_posts() -> None:
    posts = (POST_LOW_Y, POST_HIGH_Y)
    assert posts == pytest.approx((CENTRE_Y - HALF_GOAL, CENTRE_Y + HALF_GOAL))


@pytest.mark.parametrize("d", [1.0, 11.0, 30.0])
def test_shot_straight_in_front_of_goal(d: float) -> None:
    assert distance_to_goal(PITCH_LENGTH - d, CENTRE_Y) == pytest.approx(d)
    assert shot_angle(PITCH_LENGTH - d, CENTRE_Y) == pytest.approx(2 * math.atan(HALF_GOAL / d))


def test_symmetric_shots_have_the_same_angle_and_distance() -> None:
    x = PITCH_LENGTH - 15
    assert shot_angle(x, CENTRE_Y - 8) == pytest.approx(shot_angle(x, CENTRE_Y + 8))
    assert distance_to_goal(x, CENTRE_Y - 8) == pytest.approx(distance_to_goal(x, CENTRE_Y + 8))


def test_moving_wider_shrinks_the_angle() -> None:
    x = PITCH_LENGTH - 15
    angles = [shot_angle(x, CENTRE_Y + offset) for offset in [0, 5, 10, 20]]
    assert angles == sorted(angles, reverse=True)


def test_goal_line_edges() -> None:
    # On the goal line: between the posts the goal fills the view, outside them it disappears.
    assert shot_angle(PITCH_LENGTH, CENTRE_Y) == pytest.approx(math.pi)
    assert shot_angle(PITCH_LENGTH, 0) == pytest.approx(0)


@given(st.floats(0, PITCH_LENGTH), st.floats(0, PITCH_WIDTH))
def test_geometry_is_always_in_range(x: float, y: float) -> None:
    assert distance_to_goal(x, y) >= 0
    assert 0 <= shot_angle(x, y) <= math.pi


def shots_table() -> pd.DataFrame:
    return pd.DataFrame(
        {
            "event_id": ["open", "header", "penalty", "shootout", "other"],
            "match_id": [1, 1, 1, 1, 2],
            "period": [1, 2, 2, 5, 1],
            "x": [90.0, 100.0, 94.0, 94.0, 80.0],
            "y": [34.0, 30.0, 34.0, 34.0, 50.0],
            "shot_type": ["Open Play", "Open Play", "Penalty", "Penalty", "Free Kick"],
            "body_part": ["Right Foot", "Head", "Left Foot", "Right Foot", "Other"],
            "play_pattern": ["Regular Play", "From Corner", "Other", "Other", "From Free Kick"],
            "first_time": [False, True, False, False, False],
            "is_goal": [True, False, True, True, False],
            "statsbomb_xg": [0.2, 0.1, 0.78, 0.78, 0.05],
        }
    )


def matches_table() -> pd.DataFrame:
    return pd.DataFrame(
        {"match_id": [1, 2], "competition": ["Cup", "League"], "season": ["a", "b"]}
    )


def test_features_exclude_penalties_and_shootouts() -> None:
    features = build_shot_features(shots_table(), matches_table())
    assert list(features.event_id) == ["open", "header", "other"]


def test_features_columns() -> None:
    features = build_shot_features(shots_table(), matches_table()).set_index("event_id")
    assert list(features.body_part_group) == ["foot", "head", "other"]
    assert list(features.competition) == ["Cup", "Cup", "League"]
    assert features.loc["open", "distance"] == pytest.approx(distance_to_goal(90.0, 34.0))
    assert features.loc["other", "angle"] == pytest.approx(shot_angle(80.0, 50.0))
    assert features.loc["header", "first_time"]
    assert features.loc["open", "is_goal"] and features.loc["open", "statsbomb_xg"] == 0.2
