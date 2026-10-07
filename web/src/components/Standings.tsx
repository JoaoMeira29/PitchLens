import type { CSSProperties } from "react";
import { formatXg, type MatchSummary } from "../data";
import { paths } from "../router";
import type { StandingRow } from "../standings";
import { Link } from "./Link";
import { TeamMark } from "./TeamMark";

/** League or group table; team names link to the team's page in the same competition. */
export function StandingsTable({
  rows,
  caption,
  competitionId,
  seasonId,
  compact = false,
}: {
  rows: StandingRow[];
  caption: string;
  competitionId: number;
  seasonId: number;
  /** Group tables: fewer columns. */
  compact?: boolean;
}) {
  return (
    <div className="table-block">
      <p className="table-caption" aria-hidden="true">
        {caption}
      </p>
      <div className="table-wrap">
        <table className={compact ? "standings compact" : "standings"}>
          <caption className="visually-hidden">{caption}</caption>
          <thead>
            <tr>
              <th scope="col" className="pos">
                <abbr title="Position">#</abbr>
              </th>
              <th scope="col" className="club">
                Team
              </th>
              <th scope="col">
                <abbr title="Played">P</abbr>
              </th>
              <th scope="col">
                <abbr title="Won">W</abbr>
              </th>
              <th scope="col">
                <abbr title="Drawn">D</abbr>
              </th>
              <th scope="col">
                <abbr title="Lost">L</abbr>
              </th>
              {!compact && (
                <>
                  <th scope="col">
                    <abbr title="Goals for">GF</abbr>
                  </th>
                  <th scope="col">
                    <abbr title="Goals against">GA</abbr>
                  </th>
                </>
              )}
              <th scope="col">
                <abbr title="Goal difference">GD</abbr>
              </th>
              <th scope="col" className="pts">
                <abbr title="Points">Pts</abbr>
              </th>
              <th scope="col" className="xg-col">
                <abbr title="Expected goals for (PitchLens xG)">xG</abbr>
              </th>
              <th scope="col" className="xg-col">
                <abbr title="Expected goals against (PitchLens xG)">xGA</abbr>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const gd = row.goalsFor - row.goalsAgainst;
              return (
                <tr key={row.team} style={{ "--order": index } as CSSProperties}>
                  <td className="pos">{index + 1}</td>
                  <th scope="row" className="club">
                    <Link href={paths.team(competitionId, seasonId, row.team)}>
                      <TeamMark team={row.team} size={24} />
                      {row.team}
                    </Link>
                  </th>
                  <td>{row.played}</td>
                  <td>{row.won}</td>
                  <td>{row.drawn}</td>
                  <td>{row.lost}</td>
                  {!compact && (
                    <>
                      <td>{row.goalsFor}</td>
                      <td>{row.goalsAgainst}</td>
                    </>
                  )}
                  <td>{gd > 0 ? `+${gd}` : gd}</td>
                  <td className="pts">{row.points}</td>
                  <td className="xg-col">{formatXg(row.xgFor)}</td>
                  <td className="xg-col">{formatXg(row.xgAgainst)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BracketSide({ match, side }: { match: MatchSummary; side: "home" | "away" }) {
  const team = match[side].team;
  const won = match.winner === team;
  return (
    <span className={won ? "bracket-team won" : "bracket-team"}>
      <TeamMark team={team} size={16} />
      <span className="bracket-name">{team}</span>
      <span className="bracket-score">
        {match[side].score}
        {match.shootout && <sup> ({match.shootout[side]})</sup>}
      </span>
    </span>
  );
}

/** Knockout rounds side by side; each match links to its page; winners in bold. */
export function Bracket({ columns }: { columns: { round: string; matches: MatchSummary[] }[] }) {
  return (
    <div className="bracket">
      {columns.map((column) => (
        <section key={column.round} className="bracket-round" aria-label={column.round}>
          <h3>{column.round}</h3>
          <ol>
            {column.matches.map((match) => (
              <li key={match.id}>
                <Link
                  className="bracket-match"
                  href={paths.match(match.id)}
                  aria-label={`${match.home.team} ${match.home.score}, ${match.away.team} ${match.away.score}${match.shootout ? `, ${match.winner} won on penalties ${Math.max(match.shootout.home, match.shootout.away)} to ${Math.min(match.shootout.home, match.shootout.away)}` : ""}`}
                >
                  <BracketSide match={match} side="home" />
                  <BracketSide match={match} side="away" />
                </Link>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
