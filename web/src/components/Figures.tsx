import { useCountUp } from "../useJson";

export interface Figure {
  label: string;
  value: number;
  decimals?: number;
}

/** A row of headline numbers that count up once when they appear. */
export function Figures({ items }: { items: Figure[] }) {
  return (
    <dl className="figures">
      {items.map((item) => (
        <FigureItem key={item.label} {...item} />
      ))}
    </dl>
  );
}

function FigureItem({ label, value, decimals = 0 }: Figure) {
  const shown = useCountUp(value);
  return (
    <div>
      <dt>{label}</dt>
      <dd>
        <span aria-hidden="true">{shown.toFixed(decimals)}</span>
        <span className="visually-hidden">{value.toFixed(decimals)}</span>
      </dd>
    </div>
  );
}
