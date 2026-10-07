import { useEffect, useState } from "react";

export type Loaded<T> = { state: "loading" } | { state: "error" } | { state: "ready"; data: T };

// Published files never change while the page is open, so each one is fetched once. Keeping them
// lets a page render immediately when its data was prefetched (and view transitions can morph it).
const cache = new Map<string, unknown>();
const pending = new Map<string, Promise<unknown>>();

function load(url: string): Promise<unknown> {
  if (cache.has(url)) return Promise.resolve(cache.get(url));
  const inFlight =
    pending.get(url) ??
    fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.json();
      })
      .then((data) => {
        cache.set(url, data);
        return data;
      })
      .finally(() => pending.delete(url));
  pending.set(url, inFlight);
  return inFlight;
}

/** Start loading a file before it is needed, e.g. when a link is hovered. */
export function prefetch(url: string): void {
  load(url).catch(() => undefined);
}

/** Fetch a published JSON file; cached files are ready on the first render. */
export function useJson<T>(url: string): Loaded<T> {
  const [loaded, setLoaded] = useState<Loaded<T>>(() =>
    cache.has(url) ? { state: "ready", data: cache.get(url) as T } : { state: "loading" },
  );
  useEffect(() => {
    let current = true;
    if (cache.has(url)) {
      setLoaded({ state: "ready", data: cache.get(url) as T });
      return;
    }
    setLoaded({ state: "loading" });
    load(url)
      .then((data) => current && setLoaded({ state: "ready", data: data as T }))
      .catch(() => current && setLoaded({ state: "error" }));
    return () => {
      current = false;
    };
  }, [url]);
  return loaded;
}

/** True on narrow screens, where the pitch is drawn vertically. */
export function useNarrow(query = "(max-width: 720px)"): boolean {
  const [narrow, setNarrow] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setNarrow(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [query]);
  return narrow;
}

/** Count from 0 up to `target` once, over `duration` ms; jumps straight there with reduced motion. */
export function useCountUp(target: number, duration = 900): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(target);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setValue(target * (1 - (1 - t) ** 3));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);
  return value;
}
