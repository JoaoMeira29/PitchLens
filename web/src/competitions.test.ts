import { describe, expect, it } from "vitest";
import { competitions, matchesOfTeam, roundOf, rounds, slug, teams } from "./competitions";
import type { MatchSummary } from "./data";
import { parseRoute } from "./router";

let next = 1;
function match(
  stage: string,
  week: number,
  home: [string, number, number],
  away: [string, number, number],
  ref: [number, number] = [43, 106],
): MatchSummary {
  const id = next++;
  return {
    id,
    date: `2022-12-${String(id).padStart(2, "0")}`,
    competition: ref[0] === 43 ? "FIFA World Cup" : "Premier League",
    season: ref[0] === 43 ? "2022" : "2015/2016",
    competition_id: ref[0],
    season_id: ref[1],
    stage,
    match_week: week,
    home: { team: home[0], score: home[1], xg: home[2] },
    away: { team: away[0], score: away[1], xg: away[2] },
  };
}

const cup = [
  match("Group Stage", 1, ["Argentina", 1, 2.0], ["Saudi Arabia", 2, 0.2]),
  match("Group Stage", 2, ["Argentina", 2, 1.5], ["Mexico", 0, 0.3]),
  match("Final", 7, ["Argentina", 3, 3.0], ["France", 3, 2.1]),
  match("Round of 16", 4, ["France", 3, 2.0], ["Poland", 1, 0.9]),
];
const league = [match("Regular Season", 12, ["Chelsea", 1, 1.1], ["Everton", 0, 0.4], [2, 27])];
const all = [...cup, ...league];

describe("competitions", () => {
  it("summarises each competition season once, newest first", () => {
    const list = competitions(all);
    expect(list.map((c) => c.name)).toEqual(["FIFA World Cup", "Premier League"]);
    const worldCup = list[0];
    expect(worldCup.matches).toHaveLength(cup.length);
    expect(worldCup.goals).toBe(cup.reduce((sum, m) => sum + m.home.score + m.away.score, 0));
    expect(worldCup.teams).toBe(5);
  });
});

describe("teams", () => {
  it("adds up a team's matches from both sides", () => {
    const argentina = teams(cup).find((t) => t.team === "Argentina");
    expect(argentina).toMatchObject({ matches: 3, goalsFor: 6, goalsAgainst: 5 });
    expect(argentina?.xgFor).toBeCloseTo(6.5);
    expect(matchesOfTeam(cup, "France").map((m) => m.stage)).toEqual(["Final", "Round of 16"]);
  });
});

describe("rounds", () => {
  it("orders group matchdays before the knockout stages", () => {
    expect(rounds(cup).map((r) => r.label)).toEqual([
      "Group stage, matchday 1",
      "Group stage, matchday 2",
      "Round of 16",
      "Final",
    ]);
  });

  it("uses matchweeks for a league season", () => {
    expect(roundOf(league[0])).toMatchObject({ key: "matchweek-12", label: "Matchweek 12" });
  });

  it("makes URL-safe keys", () => {
    expect(slug("3rd Place Final")).toBe("3rd-place-final");
  });
});

describe("parseRoute for competitions", () => {
  it("recognises competition, team and round pages", () => {
    expect(parseRoute("/competitions/43/106")).toEqual({
      page: "competition",
      competitionId: 43,
      seasonId: 106,
      view: "teams",
    });
    expect(parseRoute("/competitions/43/106/rounds")).toMatchObject({ view: "rounds" });
    expect(parseRoute("/competitions/43/106/teams/Saudi%20Arabia")).toMatchObject({
      page: "team",
      team: "Saudi Arabia",
    });
    expect(parseRoute("/competitions/43/106/rounds/round-of-16")).toMatchObject({
      page: "round",
      round: "round-of-16",
    });
  });
});
