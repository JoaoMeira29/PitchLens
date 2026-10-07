// League tables, group tables and the knockout bracket, computed from the published matches.
import type { MatchSummary } from "./data";

export interface StandingRow {
  team: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  xgFor: number;
  xgAgainst: number;
}

/**
 * Table from match results: 3 points for a win, 1 for a draw (shootouts do not change the result).
 * Ordered by points, goal difference, goals scored, then name. Competitions' own tie-breakers
 * (such as head-to-head) are not applied, which the page says next to the table.
 */
export function standings(matches: MatchSummary[]): StandingRow[] {
  const rows = new Map<string, StandingRow>();
  const row = (team: string) => {
    const existing = rows.get(team);
    if (existing) return existing;
    const created: StandingRow = {
      team,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      points: 0,
      xgFor: 0,
      xgAgainst: 0,
    };
    rows.set(team, created);
    return created;
  };
  for (const m of matches) {
    const sides = [
      [m.home, m.away],
      [m.away, m.home],
    ] as const;
    for (const [us, them] of sides) {
      const r = row(us.team);
      r.played += 1;
      r.goalsFor += us.score;
      r.goalsAgainst += them.score;
      r.xgFor += us.xg;
      r.xgAgainst += them.xg;
      if (us.score > them.score) {
        r.won += 1;
        r.points += 3;
      } else if (us.score === them.score) {
        r.drawn += 1;
        r.points += 1;
      } else {
        r.lost += 1;
      }
    }
  }
  return [...rows.values()].sort(
    (a, b) =>
      b.points - a.points ||
      b.goalsFor - b.goalsAgainst - (a.goalsFor - a.goalsAgainst) ||
      b.goalsFor - a.goalsFor ||
      a.team.localeCompare(b.team),
  );
}

/** Group tables in label order ("Group A" before "Group B", "Group 1" before "Group 2"). */
export function groupTables(matches: MatchSummary[]): { group: string; rows: StandingRow[] }[] {
  const byGroup = new Map<string, MatchSummary[]>();
  for (const m of matches) {
    if (!m.group) continue;
    byGroup.set(m.group, [...(byGroup.get(m.group) ?? []), m]);
  }
  return [...byGroup.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "en", { numeric: true }))
    .map(([group, games]) => ({ group, rows: standings(games) }));
}

export const KNOCKOUT_ROUNDS = ["Round of 16", "Quarter-finals", "Semi-finals", "Final"];

/**
 * Knockout rounds as columns, ordered so each match sits next to the two matches that fed it
 * (worked backwards from the final). Returns only the rounds present, earliest first.
 */
export function bracket(matches: MatchSummary[]): { round: string; matches: MatchSummary[] }[] {
  const byRound = KNOCKOUT_ROUNDS.map((round) => matches.filter((m) => m.stage === round));
  const present = KNOCKOUT_ROUNDS.map((round, i) => ({ round, matches: byRound[i] })).filter(
    (column) => column.matches.length > 0,
  );
  if (present.length === 0) return [];
  const columns = [present[present.length - 1].matches];
  for (let i = present.length - 2; i >= 0; i--) {
    const later = columns[0];
    const earlier = present[i].matches;
    const ordered: MatchSummary[] = [];
    for (const match of later) {
      for (const team of [match.home.team, match.away.team]) {
        const feeder = earlier.find(
          (m) => (m.home.team === team || m.away.team === team) && !ordered.includes(m),
        );
        if (feeder) ordered.push(feeder);
      }
    }
    for (const m of earlier) if (!ordered.includes(m)) ordered.push(m);
    columns.unshift(ordered);
  }
  return present.map((column, i) => ({ round: column.round, matches: columns[i] }));
}
