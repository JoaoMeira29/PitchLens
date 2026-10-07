import { Link } from "./Link";

export interface Crumb {
  label: string;
  href?: string;
}

/** Where you are: links back up the competition, team or round, and the current page last. */
export function Breadcrumbs({ trail }: { trail: Crumb[] }) {
  return (
    <nav className="crumbs" aria-label="You are here">
      <ol>
        {trail.map((crumb, index) => (
          <li key={crumb.label}>
            {crumb.href && index < trail.length - 1 ? (
              <Link href={crumb.href}>{crumb.label}</Link>
            ) : (
              <span aria-current="page">{crumb.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
