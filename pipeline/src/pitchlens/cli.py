"""Command-line interface: `uv run pitchlens <command>`."""

from pathlib import Path
from typing import Annotated

import typer

from pitchlens.config import COMPETITIONS
from pitchlens.coverage import coverage, render_markdown
from pitchlens.sources.statsbomb import fetch_url, ingest_competition
from pitchlens.staging import stage

DATA_DIR = Path("data")
COVERAGE_FILE = Path("docs") / "coverage.md"

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


@app.command("coverage")
def coverage_command(
    data_dir: Annotated[Path, typer.Option(help="Root folder for downloaded data.")] = DATA_DIR,
    output: Annotated[Path, typer.Option(help="Markdown file to write.")] = COVERAGE_FILE,
) -> None:
    """Write the coverage table of the staged dataset (run after ingest)."""
    markdown = render_markdown(coverage(data_dir / "staged"))
    output.write_text(markdown, encoding="utf-8", newline="\n")  # same bytes on Windows and macOS
    typer.echo(f"Wrote {output}")
