import type { MatchSummary } from "./data";

export type { MatchSummary } from "./data";

export interface CompetitionGroup {
  key: string;
  competition: string;
  season: string;
  matches: MatchSummary[];
}

/** Group matches by competition season, newest season first and matches by date within each. */
export function groupByCompetition(matches: MatchSummary[]): CompetitionGroup[] {
  const groups = new Map<string, CompetitionGroup>();
  for (const match of matches) {
    const key = `${match.competition}|${match.season}`;
    const group = groups.get(key) ?? {
      key,
      competition: match.competition,
      season: match.season,
      matches: [],
    };
    group.matches.push(match);
    groups.set(key, group);
  }
  for (const group of groups.values()) {
    group.matches.sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);
  }
  return [...groups.values()].sort(
    (a, b) => b.season.localeCompare(a.season) || a.competition.localeCompare(b.competition),
  );
}

/** "Argentina 3–3 France" (en dash between the scores). */
export function scoreline(match: MatchSummary): string {
  return `${match.home.team} ${match.home.score}–${match.away.score} ${match.away.team}`;
}

/** Home team's share of the match xG, between 0 and 1 (0.5 when neither team had a shot). */
export function homeXgShare(match: MatchSummary): number {
  const total = match.home.xg + match.away.xg;
  return total === 0 ? 0.5 : match.home.xg / total;
}
