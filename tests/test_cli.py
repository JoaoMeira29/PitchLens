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
