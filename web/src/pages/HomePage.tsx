import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "../components/Link";
import { ShotMap } from "../components/ShotMap";
import { formatDate, formatXg, type MatchDocument, type MatchSummary } from "../data";
import { type CompetitionGroup, groupByCompetition, homeXgShare } from "../matches";
import { matchPath } from "../router";
import { useJson, useNarrow } from "../useJson";

/** The match the hero shows: a final if there is one, else the most recent match. */
function featured(matches: MatchSummary[]): MatchSummary | undefined {
  const finals = matches.filter((m) => m.stage === "Final");
  const byDate = (a: MatchSummary, b: MatchSummary) => b.date.localeCompare(a.date);
  return [...finals].sort(byDate)[0] ?? [...matches].sort(byDate)[0];
}

function Hero({ match }: { match: MatchSummary }) {
  const loaded = useJson<MatchDocument>(`/data/matches/${match.id}.json`);
  const narrow = useNarrow();
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-copy">
        <h1 id="hero-title">See what happened beyond the score.</h1>
        <p>
          Pick a match to see every shot on the pitch and how good each chance was, measured by our
          own expected goals model and shown with the method behind it.
        </p>
      </div>
      <Link className="hero-match" href={matchPath(match.id)}>
        <span className="hero-score">
          <span className="hero-team">{match.home.team}</span>
          <span className="hero-digits">
            {match.home.score}–{match.away.score}
          </span>
          <span className="hero-team">{match.away.team}</span>
        </span>
        <span className="hero-caption">
          {match.competition} {match.season} {match.stage?.toLowerCase()}, xG{" "}
          {formatXg(match.home.xg)} to {formatXg(match.away.xg)}. Open the match.
        </span>
        {loaded.state === "ready" && (
          <span className="hero-pitch" aria-hidden="true">
            <ShotMap match={loaded.data} orientation={narrow ? "vertical" : "horizontal"} />
          </span>
        )}
      </Link>
    </section>
  );
}

function MatchRow({ match }: { match: MatchSummary }) {
  const share = homeXgShare(match);
  return (
    <li>
      <Link className="match-row" href={matchPath(match.id)}>
        <time dateTime={match.date}>{formatDate(match.date)}</time>
        <span className="row-home">{match.home.team}</span>
        <span className="row-score">
          {match.home.score}–{match.away.score}
        </span>
        <span className="row-away">{match.away.team}</span>
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

function CompetitionTabs({ groups }: { groups: CompetitionGroup[] }) {
  const [selected, setSelected] = useState(groups[0]?.key);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const current = groups.find((group) => group.key === selected) ?? groups[0];

  const onKeyDown = (event: KeyboardEvent, index: number) => {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    const next = (index + step + groups.length) % groups.length;
    setSelected(groups[next].key);
    tabs.current[next]?.focus();
  };

  return (
    <section className="competitions" aria-label="Matches by competition">
      <div className="tabs" role="tablist" aria-label="Competition">
        {groups.map((group, index) => (
          <button
            key={group.key}
            ref={(element) => {
              tabs.current[index] = element;
            }}
            type="button"
            role="tab"
            id={`tab-${index}`}
            aria-selected={group.key === current.key}
            aria-controls="matches-panel"
            tabIndex={group.key === current.key ? 0 : -1}
            onClick={() => setSelected(group.key)}
            onKeyDown={(event) => onKeyDown(event, index)}
          >
            {group.competition} <span className="season">{group.season}</span>
          </button>
        ))}
      </div>
      <div
        id="matches-panel"
        role="tabpanel"
        aria-labelledby={`tab-${groups.indexOf(current)}`}
        key={current.key}
        className="panel-fade"
      >
        <p className="list-note">
          {current.matches.length} matches. The bar splits the match xG between the two teams: the
          longer side made the better chances.
        </p>
        <ol className="match-list">
          {current.matches.map((match) => (
            <MatchRow key={match.id} match={match} />
          ))}
        </ol>
      </div>
    </section>
  );
}

export function HomePage() {
  const loaded = useJson<MatchSummary[]>("/data/matches.json");
  useEffect(() => {
    document.title = "PitchLens: football matches beyond the score";
  }, []);
  const groups = useMemo(
    () => (loaded.state === "ready" ? groupByCompetition(loaded.data) : []),
    [loaded],
  );

  if (loaded.state === "loading") return <p className="status">Loading matches…</p>;
  if (loaded.state === "error")
    return (
      <p className="status">
        Match data is missing. Locally, run the pipeline and then `pnpm data` in web/.
      </p>
    );
  const hero = featured(loaded.data);
  return (
    <>
      {hero && <Hero match={hero} />}
      <CompetitionTabs groups={groups} />
    </>
  );
}
