import pytest
from hypothesis import given
from hypothesis import strategies as st

from pitchlens.coords import PITCH_LENGTH, PITCH_WIDTH, statsbomb_to_internal


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
