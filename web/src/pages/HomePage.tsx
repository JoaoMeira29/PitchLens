import { type CSSProperties, useEffect, useMemo } from "react";
import { type CompetitionSummary, competitions } from "../competitions";
import { Link } from "../components/Link";
import type { MatchSummary } from "../data";
import { paths } from "../router";
import { useJson } from "../useJson";

/** Every match as a dot, in date order; dot area grows with the match's total xG (largest = max). */
function Constellation({ competition }: { competition: CompetitionSummary }) {
  const count = competition.matches.length;
  const columns = Math.ceil(Math.sqrt(count * 2.2));
  const rows = Math.ceil(count / columns);
  const cell = 10;
  const most = Math.max(...competition.matches.map((m) => m.home.xg + m.away.xg), 0.01);
  return (
    <svg
      className="constellation"
      viewBox={`0 0 ${columns * cell} ${rows * cell}`}
      aria-hidden="true"
      focusable="false"
    >
      {competition.matches.map((match, index) => {
        const total = match.home.xg + match.away.xg;
        return (
          <circle
            key={match.id}
            cx={(index % columns) * cell + cell / 2}
            cy={Math.floor(index / columns) * cell + cell / 2}
            r={0.8 + (cell / 2 - 1.3) * Math.sqrt(total / most)}
            style={{ "--order": index } as CSSProperties}
          />
        );
      })}
    </svg>
  );
}

function CompetitionTile({ competition }: { competition: CompetitionSummary }) {
  const { competitionId, seasonId } = competition;
  return (
    <li>
      <Link className="tile" href={paths.competition(competitionId, seasonId)}>
        <span className="tile-art">
          <Constellation competition={competition} />
        </span>
        <span className="tile-body">
          <span
            className="tile-name"
            style={
              { viewTransitionName: `competition-${competitionId}-${seasonId}` } as CSSProperties
            }
          >
            {competition.name}
          </span>
          <span className="tile-season">{competition.season}</span>
          <span className="tile-meta">
            {competition.matches.length} matches, {competition.teams} teams, {competition.goals}{" "}
            goals
          </span>
        </span>
      </Link>
    </li>
  );
}

export function HomePage() {
  const loaded = useJson<MatchSummary[]>("/data/matches.json");
  useEffect(() => {
    document.title = "PitchLens: football matches beyond the score";
  }, []);
  const list = useMemo(() => (loaded.state === "ready" ? competitions(loaded.data) : []), [loaded]);

  if (loaded.state === "loading") return <p className="status">Loading competitions…</p>;
  if (loaded.state === "error")
    return (
      <p className="status">
        Match data is missing. Locally, run the pipeline and then `pnpm data` in web/.
      </p>
    );
  return (
    <>
      <section className="intro" aria-labelledby="intro-title">
        <h1 id="intro-title">See what happened beyond the score.</h1>
        <p>
          Choose a competition, then a team or a round, then a match: every shot on the pitch and
          how good each chance was, measured by our own expected goals model.
        </p>
      </section>
      <section aria-label="Competitions">
        <ul className="tiles">
          {list.map((competition) => (
            <CompetitionTile
              key={`${competition.competitionId}/${competition.seasonId}`}
              competition={competition}
            />
          ))}
        </ul>
        <p className="list-note">Each dot is one match, in date order; bigger dots had more xG.</p>
      </section>
    </>
  );
}
