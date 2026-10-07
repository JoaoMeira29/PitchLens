import { useEffect, useState } from "react";

export type Loaded<T> = { state: "loading" } | { state: "error" } | { state: "ready"; data: T };

/** Fetch a published JSON file; the state resets when the URL changes. */
export function useJson<T>(url: string): Loaded<T> {
  const [loaded, setLoaded] = useState<Loaded<T>>({ state: "loading" });
  useEffect(() => {
    let current = true;
    setLoaded({ state: "loading" });
    fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.json() as Promise<T>;
      })
      .then((data) => current && setLoaded({ state: "ready", data }))
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
