"""Each contract rule must catch a deliberately broken table (synthetic tables, not real data)."""

from collections.abc import Callable

import pandas as pd
import pytest

from pitchlens.contracts import validate_tables

Tables = dict[str, pd.DataFrame]


def valid_tables() -> Tables:
    return {
        "matches": pd.DataFrame(
            {
                "match_id": [1],
                "home_team": ["Home"],
                "away_team": ["Away"],
                "home_score": [1],
                "away_score": [0],
            }
        ),
        "events": pd.DataFrame(
            {
                "event_id": ["e1", "e2"],
                "match_id": [1, 1],
                "index": [1, 2],
                "period": [1, 1],
                "minute": [0, 10],
                "second": [0, 30],
                "type": ["Starting XI", "Shot"],
                "x": [None, 90.0],
                "y": [None, 34.0],
                "end_x": [float("nan"), float("nan")],  # all-None would be object, not float
                "end_y": [float("nan"), float("nan")],
                "location_clamped": [False, False],
            }
        ),
        "shots": pd.DataFrame(
            {
                "event_id": ["e2"],
                "match_id": [1],
                "period": [1],
                "x": [90.0],
                "y": [34.0],
                "end_z": [1.0],
                "statsbomb_xg": [0.1],
                "outcome": ["Goal"],
                "is_goal": [True],
            }
        ),
        "lineups": pd.DataFrame(
            {"match_id": [1, 1], "team": ["Home", "Away"], "player_id": [7, 8]}
        ),
        "shot_features": pd.DataFrame(
            {
                "event_id": ["e2"],
                "match_id": [1],
                "competition": ["Cup"],
                "period": [1],
                "distance": [15.0],
                "angle": [0.4],
                "body_part_group": ["foot"],
                "shot_type": ["Open Play"],
                "play_pattern": ["Regular Play"],
                "first_time": [False],
                "is_goal": [True],
                "statsbomb_xg": [0.1],
            }
        ),
    }


def set_value(
    table: str, column: str, value: float | str | bool | None, row: int = -1
) -> Callable[[Tables], None]:
    def mutate(tables: Tables) -> None:
        tables[table].loc[tables[table].index[row], column] = value

    return mutate


def duplicate_row(table: str) -> Callable[[Tables], None]:
    def mutate(tables: Tables) -> None:
        tables[table] = pd.concat([tables[table], tables[table].tail(1)], ignore_index=True)

    return mutate


def drop_event(event_id: str) -> Callable[[Tables], None]:
    def mutate(tables: Tables) -> None:
        tables["events"] = tables["events"][tables["events"].event_id != event_id]

    return mutate


BROKEN = {
    "xg above 1": ("shots", set_value("shots", "statsbomb_xg", 1.2)),
    "xg below 0": ("shots", set_value("shots", "statsbomb_xg", -0.1)),
    "shot without location": ("shots", set_value("shots", "x", None)),
    "is_goal disagrees with outcome": ("shots", set_value("shots", "is_goal", False)),
    "negative shot height": ("shots", set_value("shots", "end_z", -1.0)),
    "duplicate shot": ("shots", duplicate_row("shots")),
    "period 6": ("events", set_value("events", "period", 6)),
    "second 60": ("events", set_value("events", "second", 60)),
    "negative minute": ("events", set_value("events", "minute", -1)),
    "x beyond pitch length": ("events", set_value("events", "x", 105.5)),
    "y below zero": ("events", set_value("events", "y", -0.5)),
    "end_y beyond pitch width": ("events", set_value("events", "end_y", 68.5)),
    "missing event type": ("events", set_value("events", "type", None)),
    "duplicate event": ("events", duplicate_row("events")),
    "negative score": ("matches", set_value("matches", "home_score", -1)),
    "team plays itself": ("matches", set_value("matches", "away_team", "Home")),
    "duplicate match": ("matches", duplicate_row("matches")),
    "player listed twice": ("lineups", duplicate_row("lineups")),
    "event for unknown match": ("events", set_value("events", "match_id", 99)),
    "lineup for unknown match": ("lineups", set_value("lineups", "match_id", 99)),
    "shot missing from events": ("shots", drop_event("e2")),
    "negative distance": ("shot_features", set_value("shot_features", "distance", -1.0)),
    "angle above pi": ("shot_features", set_value("shot_features", "angle", 3.5)),
    "penalty among features": ("shot_features", set_value("shot_features", "shot_type", "Penalty")),
    "shootout among features": ("shot_features", set_value("shot_features", "period", 5)),
    "unknown body part group": (
        "shot_features",
        set_value("shot_features", "body_part_group", "x"),
    ),
    "feature xg above 1": ("shot_features", set_value("shot_features", "statsbomb_xg", 1.5)),
    "feature for unknown shot": ("shot_features", set_value("shot_features", "event_id", "e9")),
}


def test_valid_tables_pass() -> None:
    assert validate_tables(valid_tables()) == {}


@pytest.mark.parametrize("case", BROKEN)
def test_broken_table_is_caught(case: str) -> None:
    table, mutate = BROKEN[case]
    tables = valid_tables()
    mutate(tables)
    problems = validate_tables(tables)
    assert table in problems, f"{case} was not caught"
    assert set(problems) == {table}, f"{case} also flagged {set(problems) - {table}}"
