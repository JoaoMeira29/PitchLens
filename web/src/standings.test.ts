import { describe, expect, it } from "vitest";
import type { MatchSummary } from "./data";
import { bracket, groupTables, standings } from "./standings";
import { BADGES, FLAGS, fallbackBadge } from "./teams";

let next = 1;
function m(
  home: string,
  hs: number,
  away: string,
  as: number,
  extra: Partial<MatchSummary> = {},
): MatchSummary {
  const id = next++;
  return {
    id,
    date: `2024-06-${String(id).padStart(2, "0")}`,
    competition: "Cup",
    season: "2024",
    competition_id: 1,
    season_id: 2,
    stage: "Group Stage",
    match_week: 1,
    home: { team: home, score: hs, xg: 1 },
    away: { team: away, score: as, xg: 0.5 },
    ...extra,
  };
}

describe("standings", () => {
  const games = [m("A", 2, "B", 0), m("B", 1, "C", 1), m("C", 0, "A", 3)];
  const table = standings(games);

  it("gives 3 points for a win and 1 for a draw", () => {
    expect(table.map((r) => [r.team, r.points])).toEqual([
      ["A", 6],
      ["B", 1],
      ["C", 1],
    ]);
  });

  it("accounts for every match exactly once", () => {
    const played = table.reduce((sum, r) => sum + r.played, 0);
    expect(played).toBe(games.length * 2);
    for (const r of table) expect(r.won + r.drawn + r.lost).toBe(r.played);
    const goals = games.reduce((sum, g) => sum + g.home.score + g.away.score, 0);
    expect(table.reduce((sum, r) => sum + r.goalsFor, 0)).toBe(goals);
  });

  it("breaks ties on goal difference, then goals scored", () => {
    // B and C both have 1 point; B lost 0-2 (difference -2), C lost 0-3 (difference -3).
    expect(table.slice(1).map((r) => r.team)).toEqual(["B", "C"]);
  });
});

describe("groupTables", () => {
  it("builds one table per group in label order", () => {
    const games = [
      m("A", 1, "B", 0, { group: "Group 2" }),
      m("C", 1, "D", 0, { group: "Group 1" }),
      m("E", 0, "F", 0, { group: "Group 10" }),
    ];
    expect(groupTables(games).map((g) => g.group)).toEqual(["Group 1", "Group 2", "Group 10"]);
  });
});

describe("bracket", () => {
  const ko = (home: string, away: string, stage: string) =>
    m(home, 1, away, 0, { stage, winner: home });
  const games = [
    ko("A", "B", "Semi-finals"),
    ko("C", "D", "Semi-finals"),
    ko("A", "C", "Final"),
    ko("D", "E", "Quarter-finals"),
    ko("A", "F", "Quarter-finals"),
    ko("C", "G", "Quarter-finals"),
    ko("B", "H", "Quarter-finals"),
  ];

  it("orders each round so feeders sit next to the match they fed", () => {
    const columns = bracket(games);
    expect(columns.map((c) => c.round)).toEqual(["Quarter-finals", "Semi-finals", "Final"]);
    const pairs = (round: number) =>
      columns[round].matches.map((x) => `${x.home.team}-${x.away.team}`);
    expect(pairs(1)).toEqual(["A-B", "C-D"]);
    expect(pairs(0)).toEqual(["A-F", "B-H", "C-G", "D-E"]);
  });
});

describe("team marks", () => {
  it("has a flag code for every national team in the data", () => {
    for (const code of Object.values(FLAGS)) expect(code).toMatch(/^[a-z]{2}(-[a-z]{3})?$/);
    expect(Object.keys(FLAGS)).toHaveLength(44);
  });

  it("has a three-letter badge for every Premier League 2015/16 club", () => {
    expect(Object.keys(BADGES)).toHaveLength(20);
    for (const badge of Object.values(BADGES)) expect(badge.code).toMatch(/^[A-Z]{3}$/);
  });

  it("builds a fallback badge from initials", () => {
    expect(fallbackBadge("Synthetic Rovers").code).toBe("SR");
  });
});
