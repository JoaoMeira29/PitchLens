import { describe, expect, it } from "vitest";
import { groupByCompetition, type MatchSummary, scoreline } from "./matches";

function match(id: number, competition: string, season: string, date: string): MatchSummary {
  return {
    id,
    date,
    competition,
    season,
    stage: null,
    home: { team: `Home ${id}`, score: 1 },
    away: { team: `Away ${id}`, score: 0 },
  };
}

describe("groupByCompetition", () => {
  const matches = [
    match(3, "League", "2015/2016", "2015-08-08"),
    match(2, "Cup", "2024", "2024-06-20"),
    match(1, "Cup", "2024", "2024-06-14"),
  ];

  it("puts every match in exactly one group", () => {
    const groups = groupByCompetition(matches);
    expect(groups.flatMap((group) => group.matches)).toHaveLength(matches.length);
  });

  it("orders seasons newest first and matches by date", () => {
    const groups = groupByCompetition(matches);
    expect(groups.map((group) => group.season)).toEqual(["2024", "2015/2016"]);
    expect(groups[0].matches.map((m) => m.id)).toEqual([1, 2]);
  });
});

describe("scoreline", () => {
  it("joins teams and scores with an en dash", () => {
    // The helper names the teams "Home 1" and "Away 1"; the score is 1-0.
    expect(scoreline(match(1, "Cup", "2024", "2024-06-14"))).toBe("Home 1 1–0 Away 1");
  });
});
