import { useEffect, useState } from "react";

export type Route = { page: "home" } | { page: "match"; id: number } | { page: "not-found" };

export function parseRoute(pathname: string): Route {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/") return { page: "home" };
  const match = /^\/matches\/(\d+)$/.exec(path);
  if (match) return { page: "match", id: Number(match[1]) };
  return { page: "not-found" };
}

export function matchPath(id: number): string {
  return `/matches/${id}`;
}

/** Current route, updated on link clicks (see navigate) and on the browser's back and forward. */
export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseRoute(window.location.pathname));
  useEffect(() => {
    const update = () => setRoute(parseRoute(window.location.pathname));
    window.addEventListener("popstate", update);
    return () => window.removeEventListener("popstate", update);
  }, []);
  return route;
}

export function navigate(path: string): void {
  window.history.pushState(null, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
  window.scrollTo({ top: 0 });
}
