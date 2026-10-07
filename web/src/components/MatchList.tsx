import type { CSSProperties } from "react";
import { formatDate, formatXg, type MatchSummary } from "../data";
import { homeXgShare } from "../matches";
import { paths } from "../router";
import { prefetch } from "../useJson";
import { Link } from "./Link";

function MatchRow({ match, highlight }: { match: MatchSummary; highlight?: string }) {
  const share = homeXgShare(match);
  const warm = () => prefetch(`/data/matches/${match.id}.json`);
  const side = (team: string) => (team === highlight ? "focus-team" : undefined);
  return (
    <li>
      <Link className="match-row" href={paths.match(match.id)} onPointerEnter={warm} onFocus={warm}>
        <time dateTime={match.date}>{formatDate(match.date)}</time>
        <span className={`row-home ${side(match.home.team) ?? ""}`}>{match.home.team}</span>
        <span
          className="row-score"
          style={{ viewTransitionName: `score-${match.id}` } as CSSProperties}
        >
          {match.home.score}–{match.away.score}
        </span>
        <span className={`row-away ${side(match.away.team) ?? ""}`}>{match.away.team}</span>
        <span
          className="row-bar"
          role="img"
          aria-label={`xG ${formatXg(match.home.xg)} to ${formatXg(match.away.xg)}`}
        >
          <span className="bar-home" style={{ flexGrow: share }} />
          <span className="bar-away" style={{ flexGrow: 1 - share }} />
        </span>
      </Link>
    </li>
  );
}

/** Matches as rows: date, teams, score and a bar splitting the match xG between the teams. */
export function MatchList({
  matches,
  highlight,
}: {
  matches: MatchSummary[];
  /** A team to emphasise, on a team's own page. */
  highlight?: string;
}) {
  return (
    <>
      <p className="list-note">
        The bar splits each match's xG between the two teams: the longer side made the better
        chances.
      </p>
      <ol className="match-list">
        {matches.map((match) => (
          <MatchRow key={match.id} match={match} highlight={highlight} />
        ))}
      </ol>
    </>
  );
}
