import pytest
from hypothesis import given
from hypothesis import strategies as st

from pitchlens.coords import (
    CLAMP_TOLERANCE,
    PITCH_LENGTH,
    PITCH_WIDTH,
    SB_LENGTH,
    clamp_statsbomb,
    statsbomb_to_internal,
)


def test_corners_map_correctly() -> None:
    assert statsbomb_to_internal(0, 0) == (0, PITCH_WIDTH)  # top-left becomes top-left in metres
    assert statsbomb_to_internal(120, 80) == (PITCH_LENGTH, 0)


def test_penalty_spot_is_centred_and_11m_from_goal() -> None:
    x, y = statsbomb_to_internal(108, 40)
    assert y == pytest.approx(PITCH_WIDTH / 2)
    assert PITCH_LENGTH - x == pytest.approx(10.5, abs=1)  # approx: real spot is 11 m


def test_outside_pitch_is_rejected() -> None:
    with pytest.raises(ValueError):
        statsbomb_to_internal(121, 40)


@given(st.floats(0, 120), st.floats(0, 80))
def test_always_inside_internal_pitch(x: float, y: float) -> None:
    ix, iy = statsbomb_to_internal(x, y)
    assert 0 <= ix <= PITCH_LENGTH
    assert 0 <= iy <= PITCH_WIDTH


def test_clamp_pulls_a_slight_overshoot_back_onto_the_line() -> None:
    # Corner kicks are sometimes recorded just past the goal line (up to 0.9 units in our data).
    assert clamp_statsbomb(120.7, 0.7) == (SB_LENGTH, 0.7, True)


def test_clamp_leaves_points_on_the_pitch_unchanged() -> None:
    assert clamp_statsbomb(60, 40) == (60, 40, False)


def test_clamp_rejects_overshoots_beyond_the_tolerance() -> None:
    with pytest.raises(ValueError):
        clamp_statsbomb(SB_LENGTH + CLAMP_TOLERANCE + 0.5, 40)


@given(
    st.floats(-CLAMP_TOLERANCE, 120 + CLAMP_TOLERANCE),
    st.floats(-CLAMP_TOLERANCE, 80 + CLAMP_TOLERANCE),
)
def test_clamped_points_always_convert(x: float, y: float) -> None:
    cx, cy, _ = clamp_statsbomb(x, y)
    statsbomb_to_internal(cx, cy)  # must not raise
