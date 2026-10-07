import { useEffect, useState } from "react";
import { groupByCompetition, type MatchSummary, scoreline } from "./matches";

type Load = { state: "loading" } | { state: "error" } | { state: "ready"; matches: MatchSummary[] };

export function App() {
  const [load, setLoad] = useState<Load>({ state: "loading" });

  useEffect(() => {
    fetch("/data/matches.json")
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.json() as Promise<MatchSummary[]>;
      })
      .then((matches) => setLoad({ state: "ready", matches }))
      .catch(() => setLoad({ state: "error" }));
  }, []);

  return (
    <>
      <header>
        <h1>PitchLens</h1>
        <p>Explainable football analytics: show the numbers and show the method.</p>
      </header>
      <main>
        {load.state === "loading" && <p>Loading matches…</p>}
        {load.state === "error" && (
          <p>Match data is not available. Locally, run the pipeline and `pnpm data` first.</p>
        )}
        {load.state === "ready" &&
          groupByCompetition(load.matches).map((group) => (
            <section key={`${group.competition}|${group.season}`}>
              <h2>
                {group.competition} {group.season}
              </h2>
              <ul>
                {group.matches.map((match) => (
                  <li key={match.id}>
                    <time dateTime={match.date}>{match.date}</time> {scoreline(match)}
                  </li>
                ))}
              </ul>
            </section>
          ))}
      </main>
      <footer>
        <p>
          Data: StatsBomb open data.{" "}
          <img
            src="/statsbomb-logo.png"
            alt="StatsBomb"
            height={24}
            onError={(event) => {
              event.currentTarget.hidden = true;
            }}
          />
        </p>
      </footer>
    </>
  );
}
