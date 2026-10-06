"""Command-line interface: `uv run pitchlens <command>`."""

from pathlib import Path
from typing import Annotated

import typer

from pitchlens.config import COMPETITIONS
from pitchlens.sources.statsbomb import fetch_url, ingest_competition
from pitchlens.staging import stage

DATA_DIR = Path("data")

app = typer.Typer(help="PitchLens data pipeline.", no_args_is_help=True)


@app.callback()
def main() -> None:
    """PitchLens data pipeline."""


@app.command()
def ingest(
    data_dir: Annotated[Path, typer.Option(help="Root folder for downloaded data.")] = DATA_DIR,
) -> None:
    """Download StatsBomb open data into a local cache, then stage it as Parquet tables."""
    raw_dir = data_dir / "raw" / "statsbomb"
    for competition in COMPETITIONS:
        summary = ingest_competition(competition, raw_dir, fetch_url)
        typer.echo(
            f"{competition.name}: {summary.matches} matches, "
            f"{summary.downloaded} files downloaded, {summary.cached} already cached"
        )
    staged_dir = data_dir / "staged"
    for table, rows in stage(raw_dir, staged_dir, COMPETITIONS).items():
        typer.echo(f"{staged_dir / table}.parquet: {rows} rows")
