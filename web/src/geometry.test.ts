import { describe, expect, it } from "vitest";
import { formatClock, formatDate } from "./data";
import { homeXgShare, type MatchSummary } from "./matches";
import { LENGTH, MARKINGS, shotPosition, shotRadius, WIDTH } from "./pitch";
import { parseRoute } from "./router";
import { chartMinute, cumulativeSteps, matchLength, stepPath, xgAt } from "./timeline";

describe("shotPosition", () => {
  it("draws the home team attacking right with y flipped for SVG", () => {
    expect(shotPosition(100, 60, true, "horizontal")).toEqual({ cx: 100, cy: WIDTH - 60 });
  });

  it("mirrors the away team so it attacks left", () => {
    expect(shotPosition(100, 60, false, "horizontal")).toEqual({ cx: LENGTH - 100, cy: 60 });
  });

  it("puts both teams' goal-line shots on opposite ends", () => {
    const home = shotPosition(LENGTH, WIDTH / 2, true, "horizontal");
    const away = shotPosition(LENGTH, WIDTH / 2, false, "horizontal");
    expect(home.cx).toBe(LENGTH);
    expect(away.cx).toBe(0);
  });

  it("turns the pitch for vertical layouts so home attacks up", () => {
    const { cx, cy } = shotPosition(LENGTH, WIDTH / 2, true, "vertical");
    expect(cy).toBe(0);
    expect(cx).toBe(WIDTH / 2);
  });
});

describe("shotRadius", () => {
  it("makes circle area proportional to xG", () => {
    const area = (xg: number) => Math.PI * shotRadius(xg) ** 2;
    expect(area(0.4) / area(0.1)).toBeCloseTo(4);
  });

  it("clamps xG to [0, 1]", () => {
    expect(shotRadius(-1)).toBe(0);
    expect(shotRadius(2)).toBe(shotRadius(1));
  });
});

describe("pitch markings", () => {
  it("scale StatsBomb's 8-unit goal to the internal width", () => {
    expect(MARKINGS.goal.width).toBeCloseTo((8 * WIDTH) / 80);
  });
});

describe("timeline", () => {
  const steps = [
    { minute: 10, xg: 0.3 },
    { minute: 40, xg: 0.5 },
  ];

  it("lasts 90 minutes, or 120 when the match went to extra time", () => {
    expect(matchLength(80, 2)).toBe(90);
    expect(matchLength(93, 2)).toBe(93); // second-half stoppage time, not extra time
    expect(matchLength(110, 4)).toBe(120);
  });

  it("builds a step path that rises only at shots", () => {
    const path = stepPath(
      steps,
      90,
      (m) => m,
      (v) => -v,
    );
    expect(path).toBe("M0,0 H10 V-0.3 H40 V-0.5 H90");
  });

  it("reads the cumulative xG at any minute", () => {
    expect(xgAt(steps, 5)).toBe(0);
    expect(xgAt(steps, 10)).toBe(0.3);
    expect(xgAt(steps, 89)).toBe(0.5);
  });
});

describe("parseRoute", () => {
  it("recognises the home page and match pages", () => {
    expect(parseRoute("/")).toEqual({ page: "home" });
    expect(parseRoute("/matches/3869685")).toEqual({ page: "match", id: 3869685 });
    expect(parseRoute("/matches/3869685/")).toEqual({ page: "match", id: 3869685 });
    expect(parseRoute("/nope")).toEqual({ page: "not-found" });
  });
});

describe("formatting", () => {
  it("formats calendar dates without a time zone shift", () => {
    expect(formatDate("2022-12-18")).toBe("18 December 2022");
  });

  it("formats the match clock", () => {
    expect(formatClock(4, 7)).toBe("4:07");
  });
});

describe("homeXgShare", () => {
  const match = (home: number, away: number): MatchSummary => ({
    id: 1,
    date: "2000-01-01",
    competition: "Cup",
    season: "2000",
    competition_id: 1,
    season_id: 2,
    stage: null,
    match_week: null,
    home: { team: "A", score: 0, xg: home },
    away: { team: "B", score: 0, xg: away },
  });

  it("splits the match xG between the teams", () => {
    expect(homeXgShare(match(3, 1))).toBeCloseTo(0.75);
    expect(homeXgShare(match(0, 0))).toBe(0.5);
  });
});

describe("chartMinute and cumulativeSteps", () => {
  it("places stoppage time at the end of its period", () => {
    expect(chartMinute(47, 1)).toBe(45);
    expect(chartMinute(97, 2)).toBe(90);
    expect(chartMinute(91, 3)).toBe(91);
    expect(chartMinute(122, 4)).toBe(120);
  });

  it("never runs backwards when extra time restarts the clock at 90", () => {
    const shots = [
      { team: "A", period: 2, minute: 97, xg: 0.1 },
      { team: "A", period: 3, minute: 91, xg: 0.2 },
      { team: "B", period: 3, minute: 93, xg: 0.4 },
    ];
    const steps = cumulativeSteps(shots, "A");
    expect(steps.map((s) => s.minute)).toEqual([90, 91]);
    expect(steps.at(-1)?.xg).toBeCloseTo(0.3);
    const minutes = steps.map((s) => s.minute);
    expect(minutes).toEqual([...minutes].sort((a, b) => a - b));
  });
});
