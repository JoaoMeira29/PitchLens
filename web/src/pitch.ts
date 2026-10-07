// Pitch geometry for drawing, in PitchLens internal metres (105 x 68, ADR 0001).
// Markings are StatsBomb's (120 x 80 units) scaled the same way as the shot locations, so a shot
// recorded inside the box is drawn inside the box (ADR 0003: the goal is 6.8 m wide here).

export const LENGTH = 105;
export const WIDTH = 68;
const SX = LENGTH / 120;
const SY = WIDTH / 80;

export const MARKINGS = {
  penaltyArea: { depth: 18 * SX, width: 44 * SY },
  sixYardBox: { depth: 6 * SX, width: 20 * SY },
  penaltySpot: 12 * SX,
  centreCircle: { rx: 10 * SX, ry: 10 * SY },
  goal: { width: 8 * SY, depth: 2 * SX },
};

export type Orientation = "horizontal" | "vertical";

/**
 * SVG position of a shot. Internal coordinates have y pointing up and the shooting team
 * attacking x = 105; on the drawn pitch the home team attacks right and the away team left.
 * Vertical pitches (narrow screens) turn the horizontal drawing so home attacks up.
 */
export function shotPosition(
  x: number,
  y: number,
  attacksRight: boolean,
  orientation: Orientation,
): { cx: number; cy: number } {
  const hx = attacksRight ? x : LENGTH - x;
  const hy = attacksRight ? WIDTH - y : y; // SVG y grows downwards
  return orientation === "horizontal" ? { cx: hx, cy: hy } : { cx: hy, cy: LENGTH - hx };
}

/** Circle radius in metres whose area is proportional to xG (a 1.0 xG shot has radius max). */
export function shotRadius(xg: number, max = 3.8): number {
  return Math.sqrt(Math.max(0, Math.min(1, xg))) * max;
}
