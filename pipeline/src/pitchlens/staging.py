"""Turn the cached StatsBomb JSON into flat Parquet tables with internal coordinates.

Tables written to staged_dir: matches, events, shots, lineups (one row per match, event, shot and
player per match). Locations are converted to PitchLens internal metres at this step (ADR 0001);
event locations slightly outside the pitch are clamped and flagged (ADR 0002). Penalty shootout
events (period 5) are kept with their period; match statistics must filter them out.
Re-running rebuilds every table from the cache, so the output only changes when the cache does.
"""

import json
import os
from collections.abc import Iterable
from pathlib import Path
from typing import Any

import pandas as pd

from pitchlens.config import Competition
from pitchlens.coords import clamp_statsbomb, statsbomb_to_internal


def _read(raw_dir: Path, relative_path: str) -> Any:
    path = raw_dir.joinpath(*relative_path.split("/"))
    if not path.exists():
        raise FileNotFoundError(f"{path} is not cached; run `pitchlens ingest` first")
    return json.loads(path.read_bytes())


def _name(obj: dict[str, Any] | None) -> str | None:
    return obj["name"] if obj else None


def _end_xy(end_location: list[float] | None) -> tuple[float | None, float | None]:
    if end_location is None:
        return None, None
    return statsbomb_to_internal(end_location[0], end_location[1])


def _match_row(match: dict[str, Any]) -> dict[str, Any]:
    metadata = match.get("metadata", {})
    return {
        "match_id": match["match_id"],
        "competition_id": match["competition"]["competition_id"],
        "competition": match["competition"]["competition_name"],
        "season_id": match["season"]["season_id"],
        "season": match["season"]["season_name"],
        "match_date": match["match_date"],
        "kick_off": match.get("kick_off"),
        "competition_stage": _name(match.get("competition_stage")),
        "home_team_id": match["home_team"]["home_team_id"],
        "home_team": match["home_team"]["home_team_name"],
        "away_team_id": match["away_team"]["away_team_id"],
        "away_team": match["away_team"]["away_team_name"],
        "home_score": match["home_score"],
        "away_score": match["away_score"],
        "data_version": metadata.get("data_version"),
        "shot_fidelity_version": metadata.get("shot_fidelity_version"),
    }


def _event_row(match_id: int, event: dict[str, Any]) -> dict[str, Any]:
    x = y = None
    clamped = False
    if "location" in event:
        cx, cy, clamped = clamp_statsbomb(event["location"][0], event["location"][1])
        x, y = statsbomb_to_internal(cx, cy)
    moving = event.get("pass") or event.get("carry") or {}
    end_x, end_y = _end_xy(moving.get("end_location"))
    player = event.get("player")
    return {
        "event_id": event["id"],
        "match_id": match_id,
        "index": event["index"],
        "period": event["period"],
        "timestamp": event["timestamp"],
        "minute": event["minute"],
        "second": event["second"],
        "type": event["type"]["name"],
        "possession": event["possession"],
        "possession_team": _name(event.get("possession_team")),
        "play_pattern": _name(event.get("play_pattern")),
        "team": _name(event.get("team")),
        "player_id": player["id"] if player else None,
        "player": _name(player),
        "position": _name(event.get("position")),
        "x": x,
        "y": y,
        "location_clamped": clamped,
        "end_x": end_x,
        "end_y": end_y,
        "duration": event.get("duration"),
        "under_pressure": bool(event.get("under_pressure", False)),
        "off_camera": bool(event.get("off_camera", False)),
    }


def _shot_row(event_row: dict[str, Any], shot: dict[str, Any]) -> dict[str, Any]:
    end = shot["end_location"]
    end_x, end_y = _end_xy(end)
    outcome = _name(shot.get("outcome"))
    return {
        "event_id": event_row["event_id"],
        "match_id": event_row["match_id"],
        "period": event_row["period"],
        "minute": event_row["minute"],
        "second": event_row["second"],
        "team": event_row["team"],
        "player_id": event_row["player_id"],
        "player": event_row["player"],
        "play_pattern": event_row["play_pattern"],
        "x": event_row["x"],
        "y": event_row["y"],
        "location_clamped": event_row["location_clamped"],
        "end_x": end_x,
        "end_y": end_y,
        # Height of the ball at the goal line, in StatsBomb units (no internal equivalent).
        "end_z": end[2] if len(end) > 2 else None,
        "statsbomb_xg": shot.get("statsbomb_xg"),
        "outcome": outcome,
        "is_goal": outcome == "Goal",
        "shot_type": _name(shot.get("type")),
        "body_part": _name(shot.get("body_part")),
        "technique": _name(shot.get("technique")),
        "first_time": bool(shot.get("first_time", False)),
    }


def _write(rows: list[dict[str, Any]], path: Path) -> None:
    partial = path.with_name(path.name + ".part")
    pd.DataFrame(rows).to_parquet(partial, index=False)
    os.replace(partial, path)


def stage(raw_dir: Path, staged_dir: Path, competitions: Iterable[Competition]) -> dict[str, int]:
    """Build the staged tables from the raw cache. Returns the row count of each table."""
    tables: dict[str, list[dict[str, Any]]] = {
        "matches": [],
        "events": [],
        "shots": [],
        "lineups": [],
    }
    for competition in competitions:
        matches = _read(
            raw_dir, f"matches/{competition.competition_id}/{competition.season_id}.json"
        )
        for match in matches:
            match_id = match["match_id"]
            tables["matches"].append(_match_row(match))
            for event in _read(raw_dir, f"events/{match_id}.json"):
                row = _event_row(match_id, event)
                tables["events"].append(row)
                if "shot" in event:
                    tables["shots"].append(_shot_row(row, event["shot"]))
            for team in _read(raw_dir, f"lineups/{match_id}.json"):
                for player in team["lineup"]:
                    tables["lineups"].append(
                        {
                            "match_id": match_id,
                            "team_id": team["team_id"],
                            "team": team["team_name"],
                            "player_id": player["player_id"],
                            "player": player["player_name"],
                            "jersey_number": player.get("jersey_number"),
                        }
                    )

    staged_dir.mkdir(parents=True, exist_ok=True)
    for name, rows in tables.items():
        _write(rows, staged_dir / f"{name}.parquet")
    return {name: len(rows) for name, rows in tables.items()}
