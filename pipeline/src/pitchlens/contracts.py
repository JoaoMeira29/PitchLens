"""Data contracts for the staged tables (pandera), plus cross-table checks.

Each rule exists to stop a silently wrong number: an xG outside [0, 1], a location off the pitch,
a duplicated event that would double-count, a shot whose goal flag disagrees with its outcome.
Every rule was checked against the phase 1 data before it was added (0 violations).
"""

import math
from pathlib import Path

import pandas as pd
import pandera.pandas as pa
from pandera.pandas import Check, Column, DataFrameSchema

from pitchlens.coords import PITCH_LENGTH, PITCH_WIDTH

TABLES = ("matches", "events", "shots", "lineups", "shot_features")

_on_pitch_x = Check.in_range(0, PITCH_LENGTH)
_on_pitch_y = Check.in_range(0, PITCH_WIDTH)

SCHEMAS: dict[str, DataFrameSchema] = {
    "matches": DataFrameSchema(
        {
            "match_id": Column(int, unique=True),
            "home_team": Column(str),
            "away_team": Column(str),
            "home_score": Column(int, Check.ge(0)),
            "away_score": Column(int, Check.ge(0)),
        },
        checks=Check(lambda df: df.home_team != df.away_team, name="home_team_differs_from_away"),
    ),
    "events": DataFrameSchema(
        {
            "event_id": Column(str, unique=True),
            "match_id": Column(int),
            "index": Column(int, Check.ge(1)),
            "period": Column(int, Check.isin([1, 2, 3, 4, 5])),
            "minute": Column(int, Check.ge(0)),
            "second": Column(int, Check.in_range(0, 59)),
            "type": Column(str),
            "x": Column(float, _on_pitch_x, nullable=True),
            "y": Column(float, _on_pitch_y, nullable=True),
            "end_x": Column(float, _on_pitch_x, nullable=True),
            "end_y": Column(float, _on_pitch_y, nullable=True),
            "location_clamped": Column(bool),
        },
        unique=["match_id", "index"],
    ),
    "shots": DataFrameSchema(
        {
            "event_id": Column(str, unique=True),
            "match_id": Column(int),
            "period": Column(int, Check.isin([1, 2, 3, 4, 5])),
            "x": Column(float, _on_pitch_x),
            "y": Column(float, _on_pitch_y),
            "end_z": Column(float, Check.ge(0), nullable=True),
            "statsbomb_xg": Column(float, Check.in_range(0, 1)),
            "outcome": Column(str),
            "is_goal": Column(bool),
        },
        checks=Check(
            lambda df: df.is_goal == (df.outcome == "Goal"), name="is_goal_matches_outcome"
        ),
    ),
    "lineups": DataFrameSchema(
        {"match_id": Column(int), "player_id": Column(int)},
        unique=["match_id", "player_id"],
    ),
    "shot_features": DataFrameSchema(
        {
            "event_id": Column(str, unique=True),
            "match_id": Column(int),
            "competition": Column(str),
            "period": Column(int, Check.isin([1, 2, 3, 4])),  # no shootout kicks
            "distance": Column(float, Check.ge(0)),
            "angle": Column(float, Check.in_range(0, math.pi)),
            "body_part_group": Column(str, Check.isin(["head", "foot", "other"])),
            "shot_type": Column(str, Check.notin(["Penalty"])),  # penalties are modelled apart
            "play_pattern": Column(str),
            "first_time": Column(bool),
            "is_goal": Column(bool),
            "statsbomb_xg": Column(float, Check.in_range(0, 1)),
        }
    ),
}


def _schema_problems(schema: DataFrameSchema, table: pd.DataFrame) -> list[str]:
    try:
        schema.validate(table, lazy=True)
    except pa.errors.SchemaErrors as errors:
        cases = errors.failure_cases
        grouped = cases.groupby(["column", "check"], dropna=False).size()
        return [f"{column}: {check} ({count} rows)" for (column, check), count in grouped.items()]
    return []


def _orphans(child: pd.Series, parent: pd.Series, message: str) -> list[str]:
    missing = int((~child.isin(set(parent))).sum())
    return [f"{message} ({missing} rows)"] if missing else []


def validate_tables(tables: dict[str, pd.DataFrame]) -> dict[str, list[str]]:
    """Return the problems found in each table; an empty dict means every contract holds."""
    problems = {name: _schema_problems(SCHEMAS[name], tables[name]) for name in TABLES}
    match_ids = tables["matches"].match_id
    problems["events"] += _orphans(tables["events"].match_id, match_ids, "match_id not in matches")
    problems["shots"] += _orphans(tables["shots"].match_id, match_ids, "match_id not in matches")
    problems["lineups"] += _orphans(
        tables["lineups"].match_id, match_ids, "match_id not in matches"
    )
    problems["shots"] += _orphans(
        tables["shots"].event_id, tables["events"].event_id, "event_id not in events"
    )
    problems["shot_features"] += _orphans(
        tables["shot_features"].event_id, tables["shots"].event_id, "event_id not in shots"
    )
    return {name: found for name, found in problems.items() if found}


def validate_staged(staged_dir: Path) -> dict[str, list[str]]:
    """Validate the staged Parquet tables written by `pitchlens ingest`."""
    tables = {name: pd.read_parquet(staged_dir / f"{name}.parquet") for name in TABLES}
    return validate_tables(tables)
