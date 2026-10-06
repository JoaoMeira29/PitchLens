from pathlib import Path

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
