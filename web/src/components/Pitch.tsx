import type { ReactNode } from "react";
import { LENGTH, MARKINGS, type Orientation, WIDTH } from "../pitch";

const STRIPES = 12;
const PAD = 3;

/** Full pitch with mowing stripes and line markings; children are drawn in pitch metres. */
export function Pitch({
  orientation,
  label,
  children,
}: {
  orientation: Orientation;
  label: string;
  children: ReactNode;
}) {
  const horizontal = orientation === "horizontal";
  const [w, h] = horizontal ? [LENGTH, WIDTH] : [WIDTH, LENGTH];
  const { penaltyArea: box, sixYardBox: six, penaltySpot, centreCircle, goal } = MARKINGS;
  // Markings are drawn horizontally; vertical pitches rotate them so x = 105 ends up at the top.
  const turn = horizontal ? undefined : `translate(0 ${LENGTH}) rotate(-90)`;
  const end = (side: 0 | 1) => {
    const x = (d: number) => (side === 0 ? 0 : LENGTH - d);
    return (
      <g key={side}>
        <rect x={x(box.depth)} y={(WIDTH - box.width) / 2} width={box.depth} height={box.width} />
        <rect x={x(six.depth)} y={(WIDTH - six.width) / 2} width={six.depth} height={six.width} />
        <circle
          className="spot"
          cx={side === 0 ? penaltySpot : LENGTH - penaltySpot}
          cy={WIDTH / 2}
          r={0.35}
        />
        <rect
          className="goal"
          x={side === 0 ? -goal.depth : LENGTH}
          y={(WIDTH - goal.width) / 2}
          width={goal.depth}
          height={goal.width}
        />
      </g>
    );
  };

  return (
    <svg
      className="pitch"
      viewBox={`${-PAD} ${-PAD} ${w + 2 * PAD} ${h + 2 * PAD}`}
      role="img"
      aria-label={label}
    >
      <g className="turf">
        {Array.from({ length: STRIPES }, (_, i) =>
          horizontal ? (
            // biome-ignore lint/suspicious/noArrayIndexKey: stripes are fixed and never reorder
            <rect key={i} x={(i * w) / STRIPES} y={0} width={w / STRIPES} height={h} />
          ) : (
            // biome-ignore lint/suspicious/noArrayIndexKey: stripes are fixed and never reorder
            <rect key={i} x={0} y={(i * h) / STRIPES} width={w} height={h / STRIPES} />
          ),
        )}
      </g>
      <g className="lines" transform={turn}>
        <rect x={0} y={0} width={LENGTH} height={WIDTH} />
        <line x1={LENGTH / 2} y1={0} x2={LENGTH / 2} y2={WIDTH} />
        <ellipse cx={LENGTH / 2} cy={WIDTH / 2} rx={centreCircle.rx} ry={centreCircle.ry} />
        <circle className="spot" cx={LENGTH / 2} cy={WIDTH / 2} r={0.35} />
        {end(0)}
        {end(1)}
      </g>
      {children}
    </svg>
  );
}
