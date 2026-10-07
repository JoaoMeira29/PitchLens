"""Export what the static site shows: a match index and one JSON document per match.

Only what the pages display is published (ADR 0004): shots with location, outcome and xG, a
cumulative xG timeline and a small stats table. Penalty shootout kicks are not match shots and are
left out; penalties carry the penalty xG; own goals count towards the score but are not shots.
Every document carries the StatsBomb attribution.
"""

import json
from pathlib import Path
from typing import Any

import pandas as pd

ATTRIBUTION = "Data: StatsBomb open data"
ON_TARGET = ("Goal", "Saved", "Saved To Post")  # StatsBomb outcomes that were on target
Document = dict[str, Any]


def _shot(row: Any, xg: float) -> dict[str, Any]:
    return {
        "id": row.event_id,
        "team": row.team,
        "player": row.player,
        "period": int(row.period),
        "minute": int(row.minute),
        "second": int(row.second),
        "x": round(float(row.x), 2),
        "y": round(float(row.y), 2),
        "outcome": row.outcome,
        "goal": bool(row.is_goal),
        "penalty": row.shot_type == "Penalty",
        "xg": round(xg, 4),
        "statsbomb_xg": round(float(row.statsbomb_xg), 4),
    }


def _timeline(shots: list[dict[str, Any]], team: str) -> list[dict[str, float]]:
    steps: list[dict[str, float]] = [{"minute": 0, "xg": 0}]
    total = 0.0
    for shot in shots:
        if shot["team"] == team:
            total += shot["xg"]
            steps.append({"minute": shot["minute"], "xg": round(total, 4)})
    return steps


def _stats(shots: list[dict[str, Any]], own_goals_for: int, team: str) -> dict[str, Any]:
    team_shots = [shot for shot in shots if shot["team"] == team]
    return {
        "goals": sum(shot["goal"] for shot in team_shots) + own_goals_for,
        "shots": len(team_shots),
        "shots_on_target": sum(shot["outcome"] in ON_TARGET for shot in team_shots),
        "xg": round(sum(shot["xg"] for shot in team_shots), 4),
        "statsbomb_xg": round(sum(shot["statsbomb_xg"] for shot in team_shots), 4),
    }


def _root(parent: dict[str, str], team: str) -> str:
    """Union-find root: the team that represents the group `team` is in."""
    while parent.setdefault(team, team) != team:
        team = parent[team]
    return team


def assign_groups(matches: pd.DataFrame) -> dict[int, str]:
    """Group label of every group-stage match, found from who played whom.

    Teams linked by group matches form one group. A group keeps the letter the source gives its
    matches (StatsBomb labels most World Cup 2022 matches but no Euro 2024 match); groups without
    a letter are numbered by the date of their first match instead of guessing letters.
    """
    labels: dict[int, str] = {}
    group_matches = matches[matches.competition_stage == "Group Stage"]
    for _, season in group_matches.groupby(["competition_id", "season_id"]):
        parent: dict[str, str] = {}
        for row in season.itertuples(index=False):
            parent[_root(parent, str(row.home_team))] = _root(parent, str(row.away_team))
        components: dict[str, list[Any]] = {}
        for row in season.sort_values(["match_date", "match_id"]).itertuples(index=False):
            components.setdefault(_root(parent, str(row.home_team)), []).append(row)
        letters = {
            root: {g for r in rows if isinstance(g := getattr(r, "home_group", None), str)}
            for root, rows in components.items()
        }
        numbered = 0
        for root, rows in components.items():  # in order of each group's first match
            known = letters[root]
            if len(known) == 1 and all(letters[r] != known for r in letters if r != root):
                label = f"Group {next(iter(known))}"
            else:
                numbered += 1
                label = f"Group {numbered}"
            for row in rows:
                labels[int(row.match_id)] = label
    return labels


def _winner(summary: dict[str, Any], shootout: dict[str, int] | None) -> str | None:
    """The team that won the match, on the score or else on the shootout; None for a draw."""
    home, away = summary["home"], summary["away"]
    if home["score"] != away["score"]:
        return str(home["team"] if home["score"] > away["score"] else away["team"])
    if shootout and shootout["home"] != shootout["away"]:
        return str(home["team"] if shootout["home"] > shootout["away"] else away["team"])
    return None


def build_match_documents(
    matches: pd.DataFrame,
    shots: pd.DataFrame,
    predictions: pd.DataFrame,
    own_goals: pd.DataFrame,
    penalty_xg: float | None,
) -> tuple[list[dict[str, Any]], dict[int, Document]]:
    """Return the match index and a document per match id."""
    xg_by_shot = dict(zip(predictions.event_id, predictions.xg, strict=True))
    groups = assign_groups(matches)
    shootouts = shots[shots.period == 5].groupby(["match_id", "team"]).is_goal.sum()
    match_shots = shots[shots.period < 5].sort_values(["match_id", "period", "minute", "second"])
    index: list[dict[str, Any]] = []
    documents: dict[int, Document] = {}
    for match in matches.sort_values(["match_date", "match_id"]).to_dict("records"):
        published: list[dict[str, Any]] = []
        for row in match_shots[match_shots.match_id == match["match_id"]].itertuples(index=False):
            if row.shot_type == "Penalty":
                if penalty_xg is None:
                    raise ValueError(f"penalty {row.event_id} has no xG: no training penalties")
                xg = penalty_xg
            elif row.event_id in xg_by_shot:
                xg = float(xg_by_shot[row.event_id])
            else:
                raise ValueError(f"shot {row.event_id} has no xG prediction; run `pitchlens train`")
            published.append(_shot(row, xg))
        match_own_goals = own_goals[own_goals.match_id == match["match_id"]]
        sides: dict[str, str] = {"home": match["home_team"], "away": match["away_team"]}
        stats = {
            team: _stats(published, int((match_own_goals.team == team).sum()), team)
            for team in sides.values()
        }
        summary = {
            "id": int(match["match_id"]),
            "date": match["match_date"],
            "competition": match["competition"],
            "season": match["season"],
            "competition_id": int(match["competition_id"]),
            "season_id": int(match["season_id"]),
            "stage": match["competition_stage"],
            "match_week": None if pd.isna(match["match_week"]) else int(match["match_week"]),
            "group": groups.get(int(match["match_id"])),
            **{
                side: {
                    "team": team,
                    "score": int(match[f"{side}_score"]),
                    "xg": stats[team]["xg"],
                }
                for side, team in sides.items()
            },
        }
        shootout = None
        if any((match["match_id"], team) in shootouts.index for team in sides.values()):
            shootout = {
                side: int(shootouts.get((match["match_id"], team), 0))
                for side, team in sides.items()
            }
        summary["shootout"] = shootout
        summary["winner"] = _winner(summary, shootout)
        index.append(summary)
        documents[int(match["match_id"])] = {
            **summary,
            "shots": published,
            "own_goals": [
                {"team": goal.team, "minute": int(goal.minute)}
                for goal in match_own_goals.itertuples(index=False)
            ],
            "timeline": {team: _timeline(published, team) for team in sides.values()},
            "stats": stats,
            "attribution": ATTRIBUTION,
        }
    return index, documents


def _dump(content: Any, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(content, ensure_ascii=False, separators=(",", ":"))
    path.write_text(text, encoding="utf-8", newline="\n")


def write_site(index: list[dict[str, Any]], documents: dict[int, Document], out_dir: Path) -> None:
    _dump(index, out_dir / "matches.json")
    for match_id, document in documents.items():
        _dump(document, out_dir / "matches" / f"{match_id}.json")


def publish(staged_dir: Path, models_dir: Path, out_dir: Path) -> int:
    """Write the site data from the staged tables and the trained model; returns the match count."""
    metadata = json.loads((models_dir / "xg_v1.json").read_text(encoding="utf-8"))
    penalty_xg = metadata["penalty_xg"]  # None when training had no penalties
    events = pd.read_parquet(
        staged_dir / "events.parquet", columns=["match_id", "type", "team", "minute"]
    )
    index, documents = build_match_documents(
        pd.read_parquet(staged_dir / "matches.parquet"),
        pd.read_parquet(staged_dir / "shots.parquet"),
        pd.read_parquet(models_dir / "xg_v1_predictions.parquet", columns=["event_id", "xg"]),
        events[(events.type == "Own Goal For")],
        penalty_xg,
    )
    write_site(index, documents, out_dir)
    return len(index)
