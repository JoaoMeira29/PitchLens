"""Coverage tests on tiny synthetic staged tables."""

from pathlib import Path

import pandas as pd
import pytest

from pitchlens.coverage import coverage, render_markdown


@pytest.fixture
def staged(tmp_path: Path) -> Path:
    pd.DataFrame(
        {
            "match_id": [1, 2, 3],
            "competition": ["Cup", "Cup", "League"],
            "season": ["2020", "2020", "2019/2020"],
            "match_date": ["2020-06-01", "2020-06-20", "2019-08-10"],
        }
    ).to_parquet(tmp_path / "matches.parquet")
    pd.DataFrame({"match_id": [1, 1, 1, 2, 3, 3]}).to_parquet(tmp_path / "events.parquet")
    pd.DataFrame({"match_id": [1, 1, 2, 3], "period": [1, 5, 2, 1]}).to_parquet(
        tmp_path / "shots.parquet"
    )
    return tmp_path


def test_counts_per_competition_season(staged: Path) -> None:
    table = coverage(staged).set_index("competition")
    assert table.loc["Cup", "matches"] == 2
    assert table.loc["Cup", "events"] == 4
    assert table.loc["League", "matches"] == 1
    assert table.loc["League", "events"] == 2


def test_shot_count_excludes_penalty_shootouts(staged: Path) -> None:
    table = coverage(staged).set_index("competition")
    assert table.loc["Cup", "shots"] == 2  # the period 5 shot in match 1 is not counted
    assert table.loc["League", "shots"] == 1


def test_date_range(staged: Path) -> None:
    table = coverage(staged).set_index("competition")
    assert (table.loc["Cup", "first_match"], table.loc["Cup", "last_match"]) == (
        "2020-06-01",
        "2020-06-20",
    )


def test_markdown_has_a_row_per_competition_season(staged: Path) -> None:
    markdown = render_markdown(coverage(staged))
    assert "do not edit by hand" in markdown
    assert "| Cup | 2020 | 2 | 4 | 2 |" in markdown
    assert "| League | 2019/2020 | 1 | 2 | 1 |" in markdown
