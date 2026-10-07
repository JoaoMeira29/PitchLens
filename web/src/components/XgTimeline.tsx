import { formatXg, type MatchDocument } from "../data";
import { chartMinute, cumulativeSteps, matchLength, stepPath, xgAt } from "../timeline";

const M = { top: 16, right: 52, bottom: 30, left: 30 };

/** Cumulative xG for both teams across the match, with goals marked and the active shot shown. */
export function XgTimeline({
  match,
  activeShot,
  compact = false,
}: {
  match: MatchDocument;
  activeShot?: string | null;
  /** Narrow screens: a smaller drawing so labels stay readable. */
  compact?: boolean;
}) {
  const [W, H] = compact ? [360, 220] : [640, 240];
  const lastShot = match.shots.at(-1);
  const end = lastShot
    ? matchLength(chartMinute(lastShot.minute, lastShot.period), lastShot.period)
    : 90;
  const sides = [
    { side: "home", team: match.home.team },
    { side: "away", team: match.away.team },
  ] as const;
  const top = Math.max(1, ...sides.map(({ team }) => match.stats[team].xg));
  const ceiling = Math.ceil(top * 2) / 2;
  const x = (minute: number) => M.left + (minute / end) * (W - M.left - M.right);
  const y = (xg: number) => H - M.bottom - (xg / ceiling) * (H - M.top - M.bottom);
  const every = compact ? 30 : 15;
  const minutes = Array.from({ length: end / every + 1 }, (_, i) => i * every).filter(
    (minute) => minute <= end,
  );
  const levels = Array.from({ length: ceiling * 2 + 1 }, (_, i) => i / 2);
  const active = match.shots.find((shot) => shot.id === activeShot);
  const activeAt = active ? chartMinute(active.minute, active.period) : 0;

  return (
    <svg
      className="timeline"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`Cumulative xG: ${sides.map(({ team }) => `${team} ${formatXg(match.stats[team].xg)}`).join(", ")}.`}
    >
      <g className="grid">
        {levels.map((level) => (
          <g key={level}>
            <line x1={M.left} x2={W - M.right} y1={y(level)} y2={y(level)} />
            {Number.isInteger(level) && (
              <text x={M.left - 8} y={y(level)} dy="0.35em" textAnchor="end">
                {level}
              </text>
            )}
          </g>
        ))}
        {minutes.map((minute) => (
          <text key={minute} x={x(minute)} y={H - 8} textAnchor="middle">
            {minute}
          </text>
        ))}
        <line className="half" x1={x(45)} x2={x(45)} y1={M.top} y2={H - M.bottom} />
      </g>
      {sides.map(({ side, team }) => {
        const steps = cumulativeSteps(match.shots, team);
        const final = match.stats[team].xg;
        return (
          <g key={side} className={`team ${side}`}>
            <path className="step" d={stepPath(steps, end, x, y)} pathLength={1} />
            {match.shots
              .filter((shot) => shot.team === team && shot.goal)
              .map((shot) => (
                <circle
                  key={shot.id}
                  className="goal-mark"
                  cx={x(chartMinute(shot.minute, shot.period))}
                  cy={y(xgAt(steps, chartMinute(shot.minute, shot.period)))}
                  r={4.5}
                />
              ))}
            <text className="end-label" x={W - M.right + 6} y={y(final)} dy="0.35em">
              {formatXg(final)}
            </text>
          </g>
        );
      })}
      {active && (
        <g className="cursor">
          <line x1={x(activeAt)} x2={x(activeAt)} y1={M.top} y2={H - M.bottom} />
          <circle
            cx={x(activeAt)}
            cy={y(xgAt(cumulativeSteps(match.shots, active.team), activeAt))}
            r={6}
          />
        </g>
      )}
    </svg>
  );
}
