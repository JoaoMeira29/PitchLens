// Shapes of the JSON written by `uv run pitchlens publish` (data/site, copied to public/data).

export interface Side {
  team: string;
  score: number;
  xg: number;
}

export interface MatchSummary {
  id: number;
  date: string;
  competition: string;
  season: string;
  competition_id: number;
  season_id: number;
  stage: string | null;
  match_week: number | null;
  home: Side;
  away: Side;
}

export interface Shot {
  id: string;
  team: string;
  player: string | null;
  period: number;
  minute: number;
  second: number;
  /** Internal metres on a 105 x 68 pitch, origin bottom-left, shooting team attacking x = 105. */
  x: number;
  y: number;
  outcome: string;
  goal: boolean;
  penalty: boolean;
  xg: number;
  statsbomb_xg: number;
}

export interface TeamStats {
  goals: number;
  shots: number;
  shots_on_target: number;
  xg: number;
  statsbomb_xg: number;
}

export interface MatchDocument extends MatchSummary {
  shots: Shot[];
  own_goals: { team: string; minute: number }[];
  timeline: Record<string, { minute: number; xg: number }[]>;
  stats: Record<string, TeamStats>;
  attribution: string;
}

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

/** "18 December 2022" from "2022-12-18" (read as a calendar date, no time zone shift). */
export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  return dateFormat.format(new Date(Date.UTC(year, month - 1, day, 12)));
}

/** Match clock as recorded by StatsBomb: minute and second elapsed, e.g. "4:40". */
export function formatClock(minute: number, second: number): string {
  return `${minute}:${String(second).padStart(2, "0")}`;
}

export function formatXg(xg: number): string {
  return xg.toFixed(2);
}
