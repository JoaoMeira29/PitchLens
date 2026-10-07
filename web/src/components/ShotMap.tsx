import type { CSSProperties } from "react";
import { formatClock, formatXg, type MatchDocument, type Shot } from "../data";
import { type Orientation, shotPosition, shotRadius } from "../pitch";
import { Pitch } from "./Pitch";

export function describeShot(shot: Shot): string {
  const who = shot.player ?? shot.team;
  const kind = shot.penalty ? "penalty" : "shot";
  return `${formatClock(shot.minute, shot.second)}, ${who} (${shot.team}), ${kind}, ${shot.outcome.toLowerCase()}, xG ${formatXg(shot.xg)}`;
}

/**
 * Every shot of the match on one pitch: home attacks right (or up), away attacks left (or down).
 * Circle area is xG; goals are filled. Shots are focusable and drop in in match order on load.
 */
export function ShotMap({
  match,
  orientation,
  activeShot,
  onActiveShot,
  animate = true,
}: {
  match: MatchDocument;
  orientation: Orientation;
  activeShot?: string | null;
  onActiveShot?: (id: string | null) => void;
  animate?: boolean;
}) {
  const home = match.home.team;
  return (
    <Pitch
      orientation={orientation}
      label={`Shot map: ${match.shots.length} shots. ${home} attack ${orientation === "horizontal" ? "right" : "up"}.`}
    >
      <g className={animate ? "shots shots-animate" : "shots"}>
        {match.shots.map((shot, order) => {
          const side = shot.team === home ? "home" : "away";
          const { cx, cy } = shotPosition(shot.x, shot.y, side === "home", orientation);
          return (
            // biome-ignore lint/a11y/useSemanticElements: an SVG mark cannot be a <button>
            <circle
              key={shot.id}
              role="button"
              tabIndex={onActiveShot ? 0 : -1}
              aria-label={describeShot(shot)}
              aria-pressed={activeShot === shot.id}
              className={`shot ${side}${shot.goal ? " goal" : ""}${activeShot === shot.id ? " active" : ""}`}
              cx={cx}
              cy={cy}
              r={Math.max(shotRadius(shot.xg), 0.45)}
              style={{ "--order": order } as CSSProperties}
              onMouseEnter={() => onActiveShot?.(shot.id)}
              onMouseLeave={() => onActiveShot?.(null)}
              onFocus={() => onActiveShot?.(shot.id)}
              onBlur={() => onActiveShot?.(null)}
            />
          );
        })}
      </g>
    </Pitch>
  );
}
