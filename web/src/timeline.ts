// Cumulative xG step lines for the match page.

export interface Step {
  minute: number;
  xg: number;
}

/**
 * Last minute to draw: 90, or 120 if the match had extra time (periods 3 and 4), extended when
 * stoppage time runs past it. The period decides, not the minute: 93 can be second-half time.
 */
export function matchLength(lastMinute: number, lastPeriod: number): number {
  return Math.max(lastPeriod >= 3 ? 120 : 90, lastMinute);
}

/**
 * SVG path for a step line: flat until each shot, then a vertical jump by its xG, ending flat at
 * `endMinute`. `x` and `y` map minutes and cumulative xG to SVG coordinates.
 */
export function stepPath(
  steps: Step[],
  endMinute: number,
  x: (minute: number) => number,
  y: (xg: number) => number,
): string {
  const parts = [`M${x(0)},${y(0)}`];
  for (const step of steps) {
    parts.push(`H${x(step.minute)}`, `V${y(step.xg)}`);
  }
  parts.push(`H${x(endMinute)}`);
  return parts.join(" ");
}

/** Cumulative xG of a team at a given minute (the value of the step line there). */
export function xgAt(steps: Step[], minute: number): number {
  let value = 0;
  for (const step of steps) {
    if (step.minute <= minute) value = step.xg;
  }
  return value;
}

const PERIOD_END: Record<number, number> = { 1: 45, 2: 90, 3: 105, 4: 120 };

/**
 * Minute to plot a moment at. StatsBomb's clock runs past 45 and 90 in stoppage time and restarts at
 * 90 for extra time, so raw minutes can run backwards; stoppage time is placed at the end of its
 * period instead, as broadcasts show "45+2". Readouts keep the real clock.
 */
export function chartMinute(minute: number, period: number): number {
  return Math.min(minute, PERIOD_END[period] ?? minute);
}

/** Cumulative xG steps for one team from its shots (in match order), on chart minutes. */
export function cumulativeSteps(
  shots: { team: string; period: number; minute: number; xg: number }[],
  team: string,
): Step[] {
  let total = 0;
  return shots
    .filter((shot) => shot.team === team)
    .map((shot) => {
      total += shot.xg;
      return { minute: chartMinute(shot.minute, shot.period), xg: total };
    });
}
