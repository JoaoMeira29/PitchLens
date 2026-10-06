"""Pitch coordinate conversion.

StatsBomb: 120 x 80 units, origin top-left, the team in possession attacks left to right.
PitchLens internal: metres on a 105 x 68 pitch, origin bottom-left, attacking left to right.
"""

SB_LENGTH, SB_WIDTH = 120.0, 80.0
PITCH_LENGTH, PITCH_WIDTH = 105.0, 68.0


def statsbomb_to_internal(x: float, y: float) -> tuple[float, float]:
    """Convert a StatsBomb location to internal metres (y axis flipped)."""
    if not (0 <= x <= SB_LENGTH and 0 <= y <= SB_WIDTH):
        raise ValueError(f"location outside StatsBomb pitch: ({x}, {y})")
    return x * PITCH_LENGTH / SB_LENGTH, (SB_WIDTH - y) * PITCH_WIDTH / SB_WIDTH


# Largest overshoot we accept and pull back onto the pitch, in StatsBomb units. Corner kicks are
# sometimes recorded just past the goal line (at most 0.9 units in the phase 1 data); anything
# further out is treated as bad data. See docs/adr/0002-clamp-slightly-out-of-pitch-locations.md.
CLAMP_TOLERANCE = 1.0


def clamp_statsbomb(x: float, y: float) -> tuple[float, float, bool]:
    """Pull a StatsBomb location within CLAMP_TOLERANCE of the pitch onto it.

    Returns the (possibly moved) location and whether it was moved.
    """
    cx = min(max(x, 0.0), SB_LENGTH)
    cy = min(max(y, 0.0), SB_WIDTH)
    if abs(cx - x) > CLAMP_TOLERANCE or abs(cy - y) > CLAMP_TOLERANCE:
        raise ValueError(f"location too far outside StatsBomb pitch: ({x}, {y})")
    return cx, cy, (cx, cy) != (x, y)
