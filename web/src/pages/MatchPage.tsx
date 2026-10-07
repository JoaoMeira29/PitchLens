import { useEffect, useState } from "react";
import { ShotMap } from "../components/ShotMap";
import { ShotList, StatsTable } from "../components/StatsTable";
import { XgTimeline } from "../components/XgTimeline";
import { formatClock, formatDate, formatXg, type MatchDocument } from "../data";
import { useJson, useNarrow } from "../useJson";

export function MatchPage({ id }: { id: number }) {
  const loaded = useJson<MatchDocument>(`/data/matches/${id}.json`);
  const narrow = useNarrow();
  const [activeShot, setActiveShot] = useState<string | null>(null);

  useEffect(() => {
    if (loaded.state === "ready") {
      const { home, away } = loaded.data;
      document.title = `${home.team} ${home.score}–${away.score} ${away.team}, PitchLens`;
    }
  }, [loaded]);

  if (loaded.state === "loading") return <p className="status">Loading the match…</p>;
  if (loaded.state === "error")
    return (
      <p className="status">This match isn't in the PitchLens data. Pick one from the list.</p>
    );

  const match = loaded.data;
  const context = [match.competition, match.season, match.stage].filter(Boolean).join(", ");
  const active = match.shots.find((shot) => shot.id === activeShot);
  return (
    <article className="match">
      <header className="scoreboard">
        <h1 className="visually-hidden">
          {match.home.team} {match.home.score}, {match.away.team} {match.away.score}
        </h1>
        <div className="team home">
          <span className="name">{match.home.team}</span>
          <span className="xg">xG {formatXg(match.home.xg)}</span>
        </div>
        <div className="score" aria-hidden="true">
          <span>{match.home.score}</span>
          <span className="dash">–</span>
          <span>{match.away.score}</span>
        </div>
        <div className="team away">
          <span className="name">{match.away.team}</span>
          <span className="xg">xG {formatXg(match.away.xg)}</span>
        </div>
        <p className="context">
          {context}. <time dateTime={match.date}>{formatDate(match.date)}</time>
        </p>
      </header>

      <section className="panel" aria-labelledby="shot-map-title">
        <h2 id="shot-map-title">Every shot</h2>
        <p className="explain">
          Each circle is a shot. Its size shows how good the chance was: the area is the probability
          that a shot like it becomes a goal, called expected goals (xG). Filled circles are goals.{" "}
          {match.home.team} attack {narrow ? "upwards" : "to the right"}. Point at a shot, or move
          to it with the Tab key, to see who took it.
        </p>
        <div className="legend">
          <span className="key home">{match.home.team}</span>
          <span className="key away">{match.away.team}</span>
          <span className="key goal">Filled: goal</span>
        </div>
        <ShotMap
          match={match}
          orientation={narrow ? "vertical" : "horizontal"}
          activeShot={activeShot}
          onActiveShot={setActiveShot}
        />
        <p className="readout" aria-live="polite">
          {active
            ? `${active.player ?? active.team} at ${formatClock(active.minute, active.second)}, ${active.outcome.toLowerCase()}${active.penalty ? " penalty" : ""}, xG ${formatXg(active.xg)}`
            : " "}
        </p>
      </section>

      <section className="panel" aria-labelledby="timeline-title">
        <h2 id="timeline-title">How the chances added up</h2>
        <p className="explain">
          Each line adds up a team's xG shot by shot. A tall step is a big chance; dots are goals.
          The team whose line ends higher created more and better chances, whatever the score.
        </p>
        <XgTimeline match={match} activeShot={activeShot} compact={narrow} />
      </section>

      <section className="panel" aria-labelledby="numbers-title">
        <h2 id="numbers-title">The numbers</h2>
        <StatsTable match={match} />
        <p className="explain small">
          PitchLens xG is our own model, trained on a different competition; StatsBomb xG comes from
          the data provider's professional model. Penalties get one fixed value, and penalty
          shootouts are not part of the match, so they are left out.
        </p>
        <details className="all-shots">
          <summary>Show all {match.shots.length} shots as a table</summary>
          <ShotList match={match} />
        </details>
      </section>
    </article>
  );
}
