from pathlib import Path

import pandas as pd
import pytest
from typer.testing import CliRunner

from pitchlens import cli
from pitchlens.config import Competition

runner = CliRunner()


def test_help_lists_ingest() -> None:
    result = runner.invoke(cli.app, ["--help"])
    assert result.exit_code == 0
    assert "ingest" in result.output


def test_ingest_reports_each_competition(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    competitions = (Competition("Test Cup", competition_id=1, season_id=2),)
    monkeypatch.setattr(cli, "COMPETITIONS", competitions)
    monkeypatch.setattr(cli, "fetch_url", lambda url: b"[]")

    result = runner.invoke(cli.app, ["ingest", "--data-dir", str(tmp_path)])

    assert result.exit_code == 0, result.output
    assert "Test Cup" in result.output
    assert (tmp_path / "raw" / "statsbomb" / "matches" / "1" / "2.json").is_file()
    for table in ["matches", "events", "shots", "lineups"]:
        assert (tmp_path / "staged" / f"{table}.parquet").is_file()


def test_coverage_writes_markdown(tmp_path: Path) -> None:
    staged = tmp_path / "staged"
    staged.mkdir()
    pd.DataFrame(
        {"match_id": [1], "competition": ["Cup"], "season": ["2020"], "match_date": ["2020-06-01"]}
    ).to_parquet(staged / "matches.parquet")
    pd.DataFrame({"match_id": [1]}).to_parquet(staged / "events.parquet")
    pd.DataFrame({"match_id": [1], "period": [1]}).to_parquet(staged / "shots.parquet")
    output = tmp_path / "coverage.md"

    result = runner.invoke(
        cli.app, ["coverage", "--data-dir", str(tmp_path), "--output", str(output)]
    )

    assert result.exit_code == 0, result.output
    assert "| Cup | 2020 | 1 | 1 | 1 |" in output.read_text(encoding="utf-8")


def test_help_lists_validate() -> None:
    result = runner.invoke(cli.app, ["--help"])
    assert "validate" in result.output


def write_staged(staged: Path, xg: float) -> None:
    staged.mkdir(parents=True)
    pd.DataFrame(
        {
            "match_id": [1],
            "home_team": ["A"],
            "away_team": ["B"],
            "home_score": [0],
            "away_score": [0],
        }
    ).to_parquet(staged / "matches.parquet")
    pd.DataFrame(
        {
            "event_id": ["e1"],
            "match_id": [1],
            "index": [1],
            "period": [1],
            "minute": [0],
            "second": [0],
            "type": ["Shot"],
            "x": [90.0],
            "y": [34.0],
            "end_x": [float("nan")],
            "end_y": [float("nan")],
            "location_clamped": [False],
        }
    ).to_parquet(staged / "events.parquet")
    pd.DataFrame(
        {
            "event_id": ["e1"],
            "match_id": [1],
            "period": [1],
            "x": [90.0],
            "y": [34.0],
            "end_z": [float("nan")],
            "statsbomb_xg": [xg],
            "outcome": ["Saved"],
            "is_goal": [False],
        }
    ).to_parquet(staged / "shots.parquet")
    pd.DataFrame({"match_id": [1], "player_id": [7]}).to_parquet(staged / "lineups.parquet")


def test_validate_exits_zero_on_valid_data(tmp_path: Path) -> None:
    write_staged(tmp_path / "staged", xg=0.1)
    result = runner.invoke(cli.app, ["validate", "--data-dir", str(tmp_path)])
    assert result.exit_code == 0, result.output
    assert "shots: ok" in result.output


def test_validate_exits_one_on_broken_data(tmp_path: Path) -> None:
    write_staged(tmp_path / "staged", xg=1.5)
    result = runner.invoke(cli.app, ["validate", "--data-dir", str(tmp_path)])
    assert result.exit_code == 1
    assert "shots: FAILED" in result.output
    assert "statsbomb_xg" in result.output
