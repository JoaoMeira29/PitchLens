import { useEffect, useRef } from "react";
import { Link } from "./components/Link";
import { CompetitionPage, RoundPage, TeamPage } from "./pages/CompetitionPages";
import { HomePage } from "./pages/HomePage";
import { MatchPage } from "./pages/MatchPage";
import { useRoute } from "./router";

export function App() {
  const route = useRoute();
  const main = useRef<HTMLElement>(null);

  // After client-side navigation, move focus to the new page so screen readers announce it.
  const first = useRef(true);
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs on every route change
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    main.current?.focus();
  }, [route]);

  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <header className="site-header" style={{ viewTransitionName: "site-header" }}>
        <Link className="brand" href="/">
          PitchLens
        </Link>
        <span className="tagline">Show the numbers, show the method</span>
      </header>
      <main id="main" ref={main} tabIndex={-1}>
        {route.page === "home" && <HomePage />}
        {route.page === "competition" && (
          <CompetitionPage
            key={`${route.competitionId}/${route.seasonId}`}
            competitionRef={route}
            view={route.view}
          />
        )}
        {route.page === "team" && (
          <TeamPage key={route.team} competitionRef={route} team={route.team} />
        )}
        {route.page === "round" && (
          <RoundPage key={route.round} competitionRef={route} round={route.round} />
        )}
        {route.page === "match" && <MatchPage key={route.id} id={route.id} />}
        {route.page === "not-found" && (
          <p className="status">
            There's no page here. <Link href="/">Go to the match list</Link>.
          </p>
        )}
      </main>
      <footer className="site-footer">
        <p>
          Data: StatsBomb open data.{" "}
          <img
            src="/statsbomb-logo.png"
            alt="Hudl StatsBomb"
            height={22}
            onError={(event) => {
              event.currentTarget.hidden = true;
            }}
          />
        </p>
        <p>
          Our own xG model, built in the open.{" "}
          <a href="https://github.com/JoaoMeira29/PitchLens">Code and method on GitHub</a>.
        </p>
      </footer>
    </>
  );
}
