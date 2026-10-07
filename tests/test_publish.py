"""Match documents for the static site. Expected values are derived from the input tables."""

import json
from pathlib import Path

import pandas as pd
import pytest

from pitchlens.publish import ON_TARGET, Document, assign_groups, build_match_documents, write_site

PENALTY_XG = 0.8


def tables() -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    matches = pd.DataFrame(
        {
            "match_id": [1],
            "match_date": ["2000-01-01"],
            "competition": ["Cup"],
            "season": ["2000"],
            "competition_stage": ["Final"],
            "competition_id": [43],
            "season_id": [106],
            "match_week": [7],
            "home_team": ["Home"],
            "away_team": ["Away"],
            "home_score": [2],
            "away_score": [1],
        }
    )
    shots = pd.DataFrame(
        {
            "event_id": ["s1", "s2", "s3", "s4", "s5"],
            "match_id": [1, 1, 1, 1, 1],
            "period": [1, 1, 2, 2, 5],
            "minute": [10, 30, 60, 80, 121],
            "second": [0, 0, 0, 0, 0],
            "team": ["Home", "Away", "Home", "Away", "Home"],
            "player": ["H9", "A9", "H7", "A10", "H9"],
            "x": [95.0, 90.0, 94.0, 85.0, 94.0],
            "y": [34.0, 30.0, 34.0, 40.0, 34.0],
            "outcome": ["Goal", "Saved", "Goal", "Off T", "Goal"],
            "is_goal": [True, False, True, False, True],
            "shot_type": ["Open Play", "Open Play", "Penalty", "Open Play", "Penalty"],
            "statsbomb_xg": [0.3, 0.1, 0.78, 0.05, 0.78],
        }
    )
    predictions = pd.DataFrame({"event_id": ["s1", "s2", "s4"], "xg": [0.25, 0.12, 0.04]})
    own_goals = pd.DataFrame({"match_id": [1], "team": ["Away"], "minute": [70]})
    return matches, shots, predictions, own_goals


@pytest.fixture
def document() -> Document:
    index, documents = build_match_documents(*tables(), penalty_xg=PENALTY_XG)
    assert len(index) == 1
    return documents[1]


def test_shootout_kicks_are_not_published(document: Document) -> None:
    assert {shot["id"] for shot in document["shots"]} == {"s1", "s2", "s3", "s4"}


def test_penalties_get_the_penalty_xg(document: Document) -> None:
    penalty = next(shot for shot in document["shots"] if shot["id"] == "s3")
    assert penalty["penalty"] and penalty["xg"] == PENALTY_XG


def test_goals_including_own_goals_equal_the_score(document: Document) -> None:
    stats = document["stats"]
    assert stats["Home"]["goals"] == document["home"]["score"]
    assert stats["Away"]["goals"] == document["away"]["score"]  # the own goal counts for Away


def test_timeline_ends_at_the_total_xg(document: Document) -> None:
    for team in ["Home", "Away"]:
        team_xg = sum(shot["xg"] for shot in document["shots"] if shot["team"] == team)
        timeline = document["timeline"][team]
        assert timeline[0] == {"minute": 0, "xg": 0}
        assert timeline[-1]["xg"] == pytest.approx(team_xg)
        assert document["stats"][team]["xg"] == pytest.approx(team_xg)
        assert [step["xg"] for step in timeline] == sorted(step["xg"] for step in timeline)


def test_stats_count_shots_and_shots_on_target(document: Document) -> None:
    for team in ["Home", "Away"]:
        team_shots = [shot for shot in document["shots"] if shot["team"] == team]
        assert document["stats"][team]["shots"] == len(team_shots)
        on_target = [shot for shot in team_shots if shot["outcome"] in ON_TARGET]
        assert document["stats"][team]["shots_on_target"] == len(on_target)


def test_every_document_carries_the_attribution(document: Document) -> None:
    assert "StatsBomb" in document["attribution"]


def test_missing_prediction_is_an_error() -> None:
    matches, shots, predictions, own_goals = tables()
    with pytest.raises(ValueError, match="no xG"):
        build_match_documents(matches, shots, predictions.head(1), own_goals, PENALTY_XG)


def test_write_site_writes_index_and_one_file_per_match(tmp_path: Path) -> None:
    index, documents = build_match_documents(*tables(), penalty_xg=PENALTY_XG)
    write_site(index, documents, tmp_path)
    assert json.loads((tmp_path / "matches.json").read_text(encoding="utf-8")) == index
    assert json.loads((tmp_path / "matches" / "1.json").read_text(encoding="utf-8")) == documents[1]


def test_index_carries_each_teams_xg_from_the_document() -> None:
    index, documents = build_match_documents(*tables(), penalty_xg=PENALTY_XG)
    for entry in index:
        document = documents[entry["id"]]
        for side in ["home", "away"]:
            team = entry[side]["team"]
            assert entry[side]["xg"] == document["stats"][team]["xg"]


def test_index_carries_competition_ids_and_match_week() -> None:
    index, _ = build_match_documents(*tables(), penalty_xg=PENALTY_XG)
    entry = index[0]
    assert (entry["competition_id"], entry["season_id"], entry["match_week"]) == (43, 106, 7)


def group_matches() -> pd.DataFrame:
    rows = [
        # Two groups of three teams; group "B" has one match without a letter in the source data.
        (11, "2000-01-01", "A1", "A2", "A"),
        (12, "2000-01-02", "A2", "A3", "A"),
        (13, "2000-01-03", "B1", "B2", "B"),
        (14, "2000-01-04", "B2", "B3", None),
    ]
    return pd.DataFrame(
        {
            "match_id": [r[0] for r in rows],
            "match_date": [r[1] for r in rows],
            "home_team": [r[2] for r in rows],
            "away_team": [r[3] for r in rows],
            "home_group": [r[4] for r in rows],
            "competition_id": [1] * len(rows),
            "season_id": [2] * len(rows),
            "competition_stage": ["Group Stage"] * len(rows),
        }
    )


def test_groups_come_from_who_played_whom_and_keep_known_letters() -> None:
    groups = assign_groups(group_matches())
    assert groups == {11: "Group A", 12: "Group A", 13: "Group B", 14: "Group B"}


def test_groups_without_letters_are_numbered_by_first_match() -> None:
    matches = group_matches().assign(home_group=None)
    groups = assign_groups(matches)
    assert groups == {11: "Group 1", 12: "Group 1", 13: "Group 2", 14: "Group 2"}


def test_level_knockout_match_is_decided_by_the_shootout() -> None:
    matches, shots, predictions, own_goals = tables()
    matches = matches.assign(home_score=1, away_score=1)
    shots = pd.concat(
        [
            shots[shots.event_id != "s3"],  # leave the match level at 1-1 (s1 and the own goal)
            shots[shots.event_id == "s5"].assign(event_id="s6", team="Away", is_goal=False),
        ]
    )
    index, documents = build_match_documents(matches, shots, predictions, own_goals, PENALTY_XG)
    assert index[0]["shootout"] == {"home": 1, "away": 0}
    assert index[0]["winner"] == "Home"
    assert all(shot["period"] < 5 for shot in documents[1]["shots"])


def test_winner_is_none_for_a_draw_without_shootout() -> None:
    matches, shots, predictions, own_goals = tables()
    matches = matches.assign(home_score=1, away_score=1)
    shots = shots[~shots.event_id.isin(["s3", "s5"])]
    index, _ = build_match_documents(matches, shots, predictions, own_goals, PENALTY_XG)
    assert index[0]["shootout"] is None
    assert index[0]["winner"] is None
