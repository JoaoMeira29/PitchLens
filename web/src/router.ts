import { useEffect, useState } from "react";
import { flushSync } from "react-dom";

export type View = "teams" | "rounds";

export type Route =
  | { page: "home" }
  | { page: "competition"; competitionId: number; seasonId: number; view: View }
  | { page: "team"; competitionId: number; seasonId: number; team: string }
  | { page: "round"; competitionId: number; seasonId: number; round: string }
  | { page: "match"; id: number }
  | { page: "not-found" };

export function parseRoute(pathname: string): Route {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) return { page: "home" };
  if (parts[0] === "matches" && parts.length === 2 && /^\d+$/.test(parts[1])) {
    return { page: "match", id: Number(parts[1]) };
  }
  if (parts[0] === "competitions" && /^\d+$/.test(parts[1] ?? "") && /^\d+$/.test(parts[2] ?? "")) {
    const ref = { competitionId: Number(parts[1]), seasonId: Number(parts[2]) };
    const [view, item] = [parts[3], parts[4]];
    if (parts.length === 3) return { page: "competition", ...ref, view: "teams" };
    if (parts.length === 4 && (view === "teams" || view === "rounds")) {
      return { page: "competition", ...ref, view };
    }
    if (parts.length === 5 && view === "teams") {
      return { page: "team", ...ref, team: decodeURIComponent(item) };
    }
    if (parts.length === 5 && view === "rounds") return { page: "round", ...ref, round: item };
  }
  return { page: "not-found" };
}

export const paths = {
  home: () => "/",
  competition: (competitionId: number, seasonId: number, view: View = "teams") =>
    `/competitions/${competitionId}/${seasonId}${view === "rounds" ? "/rounds" : ""}`,
  team: (competitionId: number, seasonId: number, team: string) =>
    `/competitions/${competitionId}/${seasonId}/teams/${encodeURIComponent(team)}`,
  round: (competitionId: number, seasonId: number, round: string) =>
    `/competitions/${competitionId}/${seasonId}/rounds/${round}`,
  match: (id: number) => `/matches/${id}`,
};

const ROUTE_CHANGE = "pitchlens:navigate";

/** Current route, updated on in-app navigation and on the browser's back and forward. */
export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseRoute(window.location.pathname));
  useEffect(() => {
    // Inside a view transition the update must land synchronously so the new page is captured.
    const update = () => flushSync(() => setRoute(parseRoute(window.location.pathname)));
    window.addEventListener("popstate", update);
    window.addEventListener(ROUTE_CHANGE, update);
    return () => {
      window.removeEventListener("popstate", update);
      window.removeEventListener(ROUTE_CHANGE, update);
    };
  }, []);
  return route;
}

/**
 * Go to an in-app path. Where the browser supports view transitions (and the person has not asked
 * for reduced motion), shared elements morph between the old and the new page.
 */
export function navigate(path: string): void {
  const change = () => {
    window.history.pushState(null, "", path);
    window.dispatchEvent(new Event(ROUTE_CHANGE));
    window.scrollTo({ top: 0 });
  };
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduced && typeof document.startViewTransition === "function") {
    document.startViewTransition(change);
  } else {
    change();
  }
}
