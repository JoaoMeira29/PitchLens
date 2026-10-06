"""Staging tests on a tiny hand-built raw cache in StatsBomb format (synthetic, not real data)."""

import json
from pathlib import Path
from typing import Any

import pandas as pd
import pytest

from pitchlens.config import Competition
from pitchlens.coords import PITCH_LENGTH, PITCH_WIDTH, SB_LENGTH, SB_WIDTH
from pitchlens.staging import stage

COMPETITION = Competition("Test Cup", competition_id=1, season_id=2)
MATCH_ID = 101


def team(team_id: int, name: str) -> dict[str, Any]:
    return {"id": team_id, "name": name}


def event(index: int, type_name: str, **extra: Any) -> dict[str, Any]:
    return {
        "id": f"e{index}",
        "index": index,
        "period": extra.pop("period", 1),
        "timestamp": "00:00:01.000",
        "minute": 0,
        "second": 1,
        "type": {"id": 0, "name": type_name},
        "possession": 1,
        "possession_team": team(1, "Home"),
        "play_pattern": {"id": 1, "name": "Regular Play"},
        "team": team(1, "Home"),
        **extra,
    }


PLAYER = {"player": {"id": 7, "name": "Player Seven"}, "position": {"id": 23, "name": "Striker"}}

EVENTS = [
    event(1, "Starting XI"),
    event(2, "Pass", location=[60.0, 40.0], **{"pass": {"end_location": [80.0, 20.0]}}, **PLAYER),
    event(3, "Carry", location=[80.0, 20.0], carry={"end_location": [90.0, 30.0]}, **PLAYER),
    event(
        4,
        "Shot",
        location=[120.7, 0.7],
        shot={
            "statsbomb_xg": 0.01,
            "end_location": [120.0, 38.0, 1.5],
            "type": {"id": 61, "name": "Corner"},
            "outcome": {"id": 97, "name": "Goal"},
            "body_part": {"id": 40, "name": "Right Foot"},
            "technique": {"id": 93, "name": "Normal"},
        },
        **PLAYER,
    ),
    event(
        5,
        "Shot",
        period=5,
        location=[108.0, 40.0],
        shot={
            "statsbomb_xg": 0.5,
            "end_location": [120.0, 42.0],
            "type": {"id": 88, "name": "Penalty"},
            "outcome": {"id": 100, "name": "Saved"},
            "body_part": {"id": 38, "name": "Left Foot"},
            "technique": {"id": 93, "name": "Normal"},
            "first_time": True,
        },
        **PLAYER,
    ),
]
MATCHES = [
    {
        "match_id": MATCH_ID,
        "match_date": "2020-01-01",
        "kick_off": "15:00:00.000",
        "competition": {"competition_id": 1, "competition_name": "Test Cup"},
        "season": {"season_id": 2, "season_name": "2020"},
        "home_team": {"home_team_id": 1, "home_team_name": "Home"},
        "away_team": {"away_team_id": 2, "away_team_name": "Away"},
        "home_score": 1,
        "away_score": 0,
        "competition_stage": {"id": 26, "name": "Final"},
        "metadata": {"data_version": "1.1.0"},
    }
]

LINEUPS = [
    {
        "team_id": 1,
        "team_name": "Home",
        "lineup": [{"player_id": 7, "player_name": "Player Seven", "jersey_number": 9}],
    },
    {
        "team_id": 2,
        "team_name": "Away",
        "lineup": [{"player_id": 8, "player_name": "Player Eight", "jersey_number": 1}],
    },
]


def internal(x: float, y: float) -> tuple[float, float]:
    """Expected conversion, written out from the formula rather than calling the code under test."""
    return x * PITCH_LENGTH / SB_LENGTH, (SB_WIDTH - y) * PITCH_WIDTH / SB_WIDTH


@pytest.fixture
def staged(tmp_path: Path) -> Path:
    raw = tmp_path / "raw"
    for relative, content in {
        "matches/1/2.json": MATCHES,
        f"events/{MATCH_ID}.json": EVENTS,
        f"lineups/{MATCH_ID}.json": LINEUPS,
    }.items():
        path = raw.joinpath(*relative.split("/"))
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(content))
    out = tmp_path / "staged"
    stage(raw, out, (COMPETITION,))
    return out


def test_matches_table(staged: Path) -> None:
    matches = pd.read_parquet(staged / "matches.parquet")
    assert len(matches) == len(MATCHES)
    row = matches.iloc[0]
    assert (row.home_team, row.away_team, row.home_score, row.away_score) == ("Home", "Away", 1, 0)
    assert row.competition_stage == "Final"


def test_events_have_internal_coordinates(staged: Path) -> None:
    events = pd.read_parquet(staged / "events.parquet").set_index("event_id")
    assert len(events) == len(EVENTS)
    assert (events.loc["e2", "x"], events.loc["e2", "y"]) == pytest.approx(internal(60, 40))
    assert (events.loc["e2", "end_x"], events.loc["e2", "end_y"]) == pytest.approx(internal(80, 20))
    assert (events.loc["e3", "end_x"], events.loc["e3", "end_y"]) == pytest.approx(internal(90, 30))
    assert pd.isna(events.loc["e1", "x"])  # Starting XI has no location
    assert pd.isna(events.loc["e4", "end_x"])  # end_x/end_y are only for passes and carries


def test_only_the_overshooting_event_is_clamped(staged: Path) -> None:
    events = pd.read_parquet(staged / "events.parquet").set_index("event_id")
    assert events.location_clamped.sum() == 1
    assert events.loc["e4", "location_clamped"]
    assert (events.loc["e4", "x"], events.loc["e4", "y"]) == pytest.approx(internal(120, 0.7))


def test_shots_table(staged: Path) -> None:
    shots = pd.read_parquet(staged / "shots.parquet").set_index("event_id")
    assert list(shots.index) == ["e4", "e5"]
    assert shots.loc["e4", "is_goal"] and not shots.loc["e5", "is_goal"]
    assert shots.loc["e4", "end_z"] == 1.5
    assert pd.isna(shots.loc["e5", "end_z"])  # end_location without height
    assert shots.loc["e5", "period"] == 5  # shootout kicks are kept; match stats filter them
    assert shots.loc["e5", "first_time"] and not shots.loc["e4", "first_time"]
    assert shots.statsbomb_xg.tolist() == [0.01, 0.5]


def test_lineups_table(staged: Path) -> None:
    lineups = pd.read_parquet(staged / "lineups.parquet")
    assert sorted(lineups.player_id) == [7, 8]
    assert set(lineups.team) == {"Home", "Away"}


def test_staging_twice_gives_identical_tables(staged: Path, tmp_path: Path) -> None:
    again = tmp_path / "again"
    stage(tmp_path / "raw", again, (COMPETITION,))
    for name in ["matches", "events", "shots", "lineups"]:
        pd.testing.assert_frame_equal(
            pd.read_parquet(staged / f"{name}.parquet"), pd.read_parquet(again / f"{name}.parquet")
        )


def test_missing_cache_file_is_an_error(tmp_path: Path) -> None:
    raw = tmp_path / "raw" / "matches" / "1"
    raw.mkdir(parents=True)
    (raw / "2.json").write_text(json.dumps(MATCHES))
    with pytest.raises(FileNotFoundError):
        stage(tmp_path / "raw", tmp_path / "staged", (COMPETITION,))
