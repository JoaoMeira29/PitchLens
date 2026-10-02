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
