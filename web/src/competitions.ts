// Competitions, teams and rounds derived from the match index (matches.json).
import type { MatchSummary } from "./data";

export interface CompetitionRef {
  competitionId: number;
  seasonId: number;
}

export interface CompetitionSummary extends CompetitionRef {
  name: string;
  season: string;
  matches: MatchSummary[];
  goals: number;
  xg: number;
  teams: number;
}

export interface TeamSummary {
  team: string;
  matches: number;
  goalsFor: number;
  goalsAgainst: number;
  xgFor: number;
  xgAgainst: number;
}

export interface Round {
  key: string;
  label: string;
  order: number;
  matches: MatchSummary[];
}

const KNOCKOUT_ORDER = ["Round of 16", "Quarter-finals", "Semi-finals", "3rd Place Final", "Final"];

export function belongsTo(match: MatchSummary, ref: CompetitionRef): boolean {
  return match.competition_id === ref.competitionId && match.season_id === ref.seasonId;
}

function byDate(a: MatchSummary, b: MatchSummary): number {
  return a.date.localeCompare(b.date) || a.id - b.id;
}

/** One summary per competition season, newest season first. */
export function competitions(matches: MatchSummary[]): CompetitionSummary[] {
  const found = new Map<string, CompetitionSummary>();
  for (const match of matches) {
    const key = `${match.competition_id}/${match.season_id}`;
    const entry = found.get(key) ?? {
      competitionId: match.competition_id,
      seasonId: match.season_id,
      name: match.competition,
      season: match.season,
      matches: [],
      goals: 0,
      xg: 0,
      teams: 0,
    };
    entry.matches.push(match);
    entry.goals += match.home.score + match.away.score;
    entry.xg += match.home.xg + match.away.xg;
    found.set(key, entry);
  }
  for (const entry of found.values()) {
    entry.matches.sort(byDate);
    entry.teams = new Set(entry.matches.flatMap((m) => [m.home.team, m.away.team])).size;
  }
  return [...found.values()].sort(
    (a, b) => b.season.localeCompare(a.season) || a.name.localeCompare(b.name),
  );
}

/** Every team in the matches with its totals, alphabetically. */
export function teams(matches: MatchSummary[]): TeamSummary[] {
  const found = new Map<string, TeamSummary>();
  const add = (
    team: string,
    goalsFor: number,
    goalsAgainst: number,
    xgFor: number,
    xgAgainst: number,
  ) => {
    const entry = found.get(team) ?? {
      team,
      matches: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      xgFor: 0,
      xgAgainst: 0,
    };
    entry.matches += 1;
    entry.goalsFor += goalsFor;
    entry.goalsAgainst += goalsAgainst;
    entry.xgFor += xgFor;
    entry.xgAgainst += xgAgainst;
    found.set(team, entry);
  };
  for (const m of matches) {
    add(m.home.team, m.home.score, m.away.score, m.home.xg, m.away.xg);
    add(m.away.team, m.away.score, m.home.score, m.away.xg, m.home.xg);
  }
  return [...found.values()].sort((a, b) => a.team.localeCompare(b.team));
}

export function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** The round a match belongs to: a matchday in the group stage or league, else its knockout stage. */
export function roundOf(match: MatchSummary): Omit<Round, "matches"> {
  const week = match.match_week ?? 0;
  if (match.stage === "Regular Season") {
    return { key: `matchweek-${week}`, label: `Matchweek ${week}`, order: week };
  }
  if (match.stage === "Group Stage" || match.stage === null) {
    return { key: `matchday-${week}`, label: `Group stage, matchday ${week}`, order: week };
  }
  const position = KNOCKOUT_ORDER.indexOf(match.stage);
  return { key: slug(match.stage), label: match.stage, order: 100 + Math.max(position, 0) };
}

/** Rounds in the order they were played, each with its matches by date. */
export function rounds(matches: MatchSummary[]): Round[] {
  const found = new Map<string, Round>();
  for (const match of matches) {
    const round = roundOf(match);
    const entry = found.get(round.key) ?? { ...round, matches: [] };
    entry.matches.push(match);
    found.set(round.key, entry);
  }
  for (const entry of found.values()) entry.matches.sort(byDate);
  return [...found.values()].sort((a, b) => a.order - b.order);
}

export function matchesOfTeam(matches: MatchSummary[], team: string): MatchSummary[] {
  return matches.filter((m) => m.home.team === team || m.away.team === team).sort(byDate);
}
