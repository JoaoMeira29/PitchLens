// Types and helpers for matches.json, written by `uv run pitchlens publish`.

export interface Side {
  team: string;
  score: number;
}

export interface MatchSummary {
  id: number;
  date: string;
  competition: string;
  season: string;
  stage: string | null;
  home: Side;
  away: Side;
}

export interface CompetitionGroup {
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
