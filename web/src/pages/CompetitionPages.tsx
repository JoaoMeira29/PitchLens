import { type CSSProperties, type ReactNode, useEffect } from "react";
import {
  belongsTo,
  type CompetitionRef,
  type CompetitionSummary,
  competitions,
  matchesOfTeam,
  rounds,
  teams,
} from "../competitions";
import { Breadcrumbs, type Crumb } from "../components/Breadcrumbs";
import { Figures } from "../components/Figures";
import { Link } from "../components/Link";
import { MatchList } from "../components/MatchList";
import { Bracket, StandingsTable } from "../components/Standings";
import { TeamMark } from "../components/TeamMark";
import { formatXg, type MatchSummary } from "../data";
import { paths, type View } from "../router";
import { bracket, groupTables, standings } from "../standings";
import { useJson } from "../useJson";

/** Load the index and find one competition season; renders loading and missing states itself. */
function WithCompetition({
  competitionRef,
  children,
}: {
  competitionRef: CompetitionRef;
  children: (competition: CompetitionSummary) => ReactNode;
}) {
  const loaded = useJson<MatchSummary[]>("/data/matches.json");
  if (loaded.state === "loading") return <p className="status">Loading the competition…</p>;
  if (loaded.state === "error") return <p className="status">Match data is missing.</p>;
  const competition = competitions(loaded.data).find((c) =>
    c.matches.some((m) => belongsTo(m, competitionRef)),
  );
  if (!competition)
    return (
      <p className="status">
        This competition isn't in the PitchLens data. <Link href="/">Choose another one</Link>.
      </p>
    );
  return <>{children(competition)}</>;
}

function competitionTrail(competition: CompetitionSummary): Crumb[] {
  return [
    { label: "Competitions", href: paths.home() },
    {
      label: `${competition.name} ${competition.season}`,
      href: paths.competition(competition.competitionId, competition.seasonId),
    },
  ];
}

function CompetitionHeader({ competition }: { competition: CompetitionSummary }) {
  const { competitionId, seasonId } = competition;
  useEffect(() => {
    document.title = `${competition.name} ${competition.season}, PitchLens`;
  }, [competition]);
  return (
    <header className="page-head">
      <h1
        style={{ viewTransitionName: `competition-${competitionId}-${seasonId}` } as CSSProperties}
      >
        {competition.name} <span className="season">{competition.season}</span>
      </h1>
      <Figures
        items={[
          { label: "Matches", value: competition.matches.length },
          { label: "Goals", value: competition.goals },
          {
            label: "xG per match",
            value: competition.xg / competition.matches.length,
            decimals: 2,
          },
        ]}
      />
    </header>
  );
}

function ViewSwitch({ competition, view }: { competition: CompetitionSummary; view: View }) {
  const { competitionId, seasonId } = competition;
  const isLeague = competition.matches.every((m) => m.stage === "Regular Season");
  const options: [View, string][] = [
    ["teams", "By team"],
    ["rounds", "By round"],
    ["table", isLeague ? "Table" : "Groups and bracket"],
  ];
  return (
    <nav className="switch" aria-label="Browse matches">
      {options.map(([value, label]) => (
        <Link
          key={value}
          href={paths.competition(competitionId, seasonId, value)}
          aria-current={view === value ? "page" : undefined}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

export function CompetitionPage({
  competitionRef,
  view,
}: {
  competitionRef: CompetitionRef;
  view: View;
}) {
  return (
    <WithCompetition competitionRef={competitionRef}>
      {(competition) => {
        const { competitionId, seasonId } = competition;
        return (
          <>
            <Breadcrumbs trail={competitionTrail(competition)} />
            <CompetitionHeader competition={competition} />
            <ViewSwitch competition={competition} view={view} />
            {view === "table" && <TableView competition={competition} />}
            {view === "teams" && (
              <ul className="team-grid" key="teams">
                {teams(competition.matches).map((team, index) => (
                  <li key={team.team} style={{ "--order": index } as CSSProperties}>
                    <Link
                      className="team-tile"
                      href={paths.team(competitionId, seasonId, team.team)}
                    >
                      <span className="team-name">
                        <TeamMark team={team.team} size={22} />
                        {team.team}
                      </span>
                      <span className="team-meta">
                        {team.matches} {team.matches === 1 ? "match" : "matches"}, goals{" "}
                        {team.goalsFor}–{team.goalsAgainst}
                      </span>
                      <span className="team-xg">
                        xG {formatXg(team.xgFor)} for, {formatXg(team.xgAgainst)} against
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {view === "rounds" && (
              <ul className="round-grid" key="rounds">
                {rounds(competition.matches).map((round, index) => (
                  <li key={round.key} style={{ "--order": index } as CSSProperties}>
                    <Link
                      className="round-tile"
                      href={paths.round(competitionId, seasonId, round.key)}
                    >
                      <span className="round-name">{round.label}</span>
                      <span className="team-meta">
                        {round.matches.length} {round.matches.length === 1 ? "match" : "matches"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </>
        );
      }}
    </WithCompetition>
  );
}

export function TeamPage({
  competitionRef,
  team,
}: {
  competitionRef: CompetitionRef;
  team: string;
}) {
  return (
    <WithCompetition competitionRef={competitionRef}>
      {(competition) => {
        const matches = matchesOfTeam(competition.matches, team);
        const totals = teams(matches).find((t) => t.team === team);
        if (!totals)
          return (
            <p className="status">
              {team} didn't play in {competition.name} {competition.season}.{" "}
              <Link href={paths.competition(competition.competitionId, competition.seasonId)}>
                See the teams that did
              </Link>
              .
            </p>
          );
        return (
          <TitledList
            title={team}
            trail={[...competitionTrail(competition), { label: team }]}
            figures={[
              { label: "Matches", value: totals.matches },
              { label: "Goals for", value: totals.goalsFor },
              { label: "xG for", value: totals.xgFor, decimals: 2 },
              { label: "xG against", value: totals.xgAgainst, decimals: 2 },
            ]}
            matches={matches}
            highlight={team}
          />
        );
      }}
    </WithCompetition>
  );
}

export function RoundPage({
  competitionRef,
  round,
}: {
  competitionRef: CompetitionRef;
  round: string;
}) {
  return (
    <WithCompetition competitionRef={competitionRef}>
      {(competition) => {
        const found = rounds(competition.matches).find((r) => r.key === round);
        if (!found)
          return (
            <p className="status">
              There's no such round.{" "}
              <Link
                href={paths.competition(competition.competitionId, competition.seasonId, "rounds")}
              >
                See every round
              </Link>
              .
            </p>
          );
        const goals = found.matches.reduce((sum, m) => sum + m.home.score + m.away.score, 0);
        return (
          <TitledList
            title={found.label}
            trail={[
              ...competitionTrail(competition),
              {
                label: "Rounds",
                href: paths.competition(competition.competitionId, competition.seasonId, "rounds"),
              },
              { label: found.label },
            ]}
            figures={[
              { label: "Matches", value: found.matches.length },
              { label: "Goals", value: goals },
            ]}
            matches={found.matches}
          />
        );
      }}
    </WithCompetition>
  );
}

function TitledList({
  title,
  trail,
  figures,
  matches,
  highlight,
}: {
  title: string;
  trail: Crumb[];
  figures: { label: string; value: number; decimals?: number }[];
  matches: MatchSummary[];
  highlight?: string;
}) {
  useEffect(() => {
    document.title = `${title}, PitchLens`;
  }, [title]);
  return (
    <>
      <Breadcrumbs trail={trail} />
      <header className="page-head">
        <h1>{title}</h1>
        <Figures items={figures} />
      </header>
      <MatchList matches={matches} highlight={highlight} />
    </>
  );
}

/** League: the full table. Tournament: group tables, then the knockout bracket. */
function TableView({ competition }: { competition: CompetitionSummary }) {
  const { competitionId, seasonId } = competition;
  const isLeague = competition.matches.every((m) => m.stage === "Regular Season");
  const tieBreakNote =
    "Ordered by points, goal difference and goals scored. The competition's own tie-breakers, such as head-to-head results, are not applied, so teams level on these can appear in a different order from the official table. xG and xGA are PitchLens expected goals for and against.";
  if (isLeague) {
    return (
      <section aria-labelledby="table-title">
        <h2 id="table-title" className="section-title">
          Table
        </h2>
        <StandingsTable
          rows={standings(competition.matches)}
          caption={`${competition.name} ${competition.season}, computed from all ${competition.matches.length} matches`}
          competitionId={competitionId}
          seasonId={seasonId}
        />
        <p className="list-note">{tieBreakNote}</p>
      </section>
    );
  }
  const groups = groupTables(competition.matches);
  const numbered = groups.some((g) => /^Group \d+$/.test(g.group));
  return (
    <>
      <section aria-labelledby="groups-title">
        <h2 id="groups-title" className="section-title">
          Group stage
        </h2>
        {numbered && (
          <p className="list-note">
            The data does not name these groups, so they are numbered by the date of their first
            match.
          </p>
        )}
        <div className="group-grid">
          {groups.map((g) => (
            <StandingsTable
              key={g.group}
              rows={g.rows}
              caption={g.group}
              competitionId={competitionId}
              seasonId={seasonId}
              compact
            />
          ))}
        </div>
        <p className="list-note">{tieBreakNote}</p>
      </section>
      <section aria-labelledby="bracket-title">
        <h2 id="bracket-title" className="section-title">
          Knockout stage
        </h2>
        <p className="list-note">
          Winners in bold; penalty shootout scores in brackets. Select a match to open it.
        </p>
        <Bracket columns={bracket(competition.matches)} />
      </section>
    </>
  );
}
