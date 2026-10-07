"""End-to-end: ingest -> validate -> coverage on the synthetic fixtures, with no network.

Every expected value is computed from the fixture JSON files, never typed in by hand.
"""

import json
import shutil
from pathlib import Path
from typing import Any

import pandas as pd
import pytest
from typer.testing import CliRunner

from pitchlens import cli
from pitchlens.config import Competition
from pitchlens.coords import SB_LENGTH, SB_WIDTH

FIXTURES = Path(__file__).parent / "fixtures" / "statsbomb"
COMPETITION = Competition("Synthetic League", competition_id=9001, season_id=9002)

runner = CliRunner()


def load(relative: str) -> Any:
    return json.loads(FIXTURES.joinpath(*relative.split("/")).read_text(encoding="utf-8"))


MATCHES = load("matches/9001/9002.json")
EVENTS = {m["match_id"]: load(f"events/{m['match_id']}.json") for m in MATCHES}
LINEUPS = {m["match_id"]: load(f"lineups/{m['match_id']}.json") for m in MATCHES}
ALL_EVENTS = [event for events in EVENTS.values() for event in events]
SHOTS = [event for event in ALL_EVENTS if event["type"]["name"] == "Shot"]


def no_network(url: str) -> bytes:
    raise AssertionError(f"the end-to-end test must not download anything: {url}")


@pytest.fixture
def data_dir(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    shutil.copytree(FIXTURES, tmp_path / "raw" / "statsbomb")
    monkeypatch.setattr(cli, "COMPETITIONS", (COMPETITION,))
    monkeypatch.setattr(cli, "fetch_url", no_network)
    result = runner.invoke(cli.app, ["ingest", "--data-dir", str(tmp_path)])
    assert result.exit_code == 0, result.output
    return tmp_path


def staged(data_dir: Path, table: str) -> pd.DataFrame:
    return pd.read_parquet(data_dir / "staged" / f"{table}.parquet")


def test_row_counts_match_the_fixture_files(data_dir: Path) -> None:
    assert len(staged(data_dir, "matches")) == len(MATCHES)
    assert len(staged(data_dir, "events")) == len(ALL_EVENTS)
    assert len(staged(data_dir, "shots")) == len(SHOTS)
    players = sum(len(team["lineup"]) for teams in LINEUPS.values() for team in teams)
    assert len(staged(data_dir, "lineups")) == players


def test_goals_reproduce_every_final_score(data_dir: Path) -> None:
    shots = staged(data_dir, "shots")
    events = staged(data_dir, "events")
    match_goals = shots[(shots.period < 5) & shots.is_goal].groupby(["match_id", "team"]).size()
    own_goals = events[events.type == "Own Goal For"].groupby(["match_id", "team"]).size()
    goals = match_goals.add(own_goals, fill_value=0)
    for match in MATCHES:
        for side in ["home", "away"]:
            team = match[f"{side}_team"][f"{side}_team_name"]
            assert goals.get((match["match_id"], team), 0) == match[f"{side}_score"], team


def test_shootout_kicks_are_staged_but_not_counted_as_match_shots(data_dir: Path) -> None:
    shootout = [shot for shot in SHOTS if shot["period"] == 5]
    assert shootout, "the fixtures must contain a penalty shootout"
    shots = staged(data_dir, "shots")
    assert (shots.period == 5).sum() == len(shootout)

    output = data_dir / "coverage.md"
    result = runner.invoke(
        cli.app, ["coverage", "--data-dir", str(data_dir), "--output", str(output)]
    )
    assert result.exit_code == 0, result.output
    expected = (
        f"| Synthetic League | 2000 | {len(MATCHES)} | {len(ALL_EVENTS)} "
        f"| {len(SHOTS) - len(shootout)} |"
    )
    assert expected in output.read_text(encoding="utf-8")


def test_only_out_of_pitch_locations_are_clamped(data_dir: Path) -> None:
    outside = [
        event
        for event in ALL_EVENTS
        if "location" in event
        and not (0 <= event["location"][0] <= SB_LENGTH and 0 <= event["location"][1] <= SB_WIDTH)
    ]
    assert outside, "the fixtures must contain a location past the goal line"
    events = staged(data_dir, "events")
    assert set(events[events.location_clamped].event_id) == {event["id"] for event in outside}


def test_staged_fixtures_pass_the_contracts(data_dir: Path) -> None:
    result = runner.invoke(cli.app, ["validate", "--data-dir", str(data_dir)])
    assert result.exit_code == 0, result.output
