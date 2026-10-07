"""Command-line interface: `uv run pitchlens <command>`."""

from pathlib import Path
from typing import Annotated

import typer

from pitchlens.config import COMPETITIONS, TEST_COMPETITIONS
from pitchlens.contracts import TABLES, validate_staged
from pitchlens.coverage import coverage, render_markdown
from pitchlens.features import write_shot_features
from pitchlens.sources.statsbomb import fetch_url, ingest_competition
from pitchlens.staging import stage
from pitchlens.xg_run import train as train_xg
from pitchlens.xg_run import write_results

DATA_DIR = Path("data")
COVERAGE_FILE = Path("docs") / "coverage.md"
RESULTS_FILE = Path("docs") / "xg-v1-results.md"

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
    rows = write_shot_features(staged_dir)
    typer.echo(f"{staged_dir / 'shot_features'}.parquet: {rows} rows")


@app.command()
def validate(
    data_dir: Annotated[Path, typer.Option(help="Root folder for downloaded data.")] = DATA_DIR,
) -> None:
    """Check the staged tables against the data contracts; exit with code 1 if any fails."""
    problems = validate_staged(data_dir / "staged")
    for table in TABLES:
        if table not in problems:
            typer.echo(f"{table}: ok")
            continue
        typer.echo(f"{table}: FAILED")
        for problem in problems[table]:
            typer.echo(f"  - {problem}")
    if problems:
        raise typer.Exit(code=1)


@app.command("coverage")
def coverage_command(
    data_dir: Annotated[Path, typer.Option(help="Root folder for downloaded data.")] = DATA_DIR,
    output: Annotated[Path, typer.Option(help="Markdown file to write.")] = COVERAGE_FILE,
) -> None:
    """Write the coverage table of the staged dataset (run after ingest)."""
    markdown = render_markdown(coverage(data_dir / "staged"))
    output.write_text(markdown, encoding="utf-8", newline="\n")  # same bytes on Windows and macOS
    typer.echo(f"Wrote {output}")


@app.command()
def train(
    data_dir: Annotated[Path, typer.Option(help="Root folder for downloaded data.")] = DATA_DIR,
) -> None:
    """Fit xG v1 on the training competitions and write predictions under data/models."""
    metadata = train_xg(data_dir / "staged", data_dir / "models", TEST_COMPETITIONS)
    typer.echo(f"Trained on {', '.join(metadata['train_competitions'])}")
    typer.echo(f"Tested on {', '.join(metadata['test_competitions'])}")
    typer.echo(f"Wrote {data_dir / 'models'}")


@app.command("evaluate")
def evaluate_command(
    data_dir: Annotated[Path, typer.Option(help="Root folder for downloaded data.")] = DATA_DIR,
    output: Annotated[Path, typer.Option(help="Markdown file to write.")] = RESULTS_FILE,
) -> None:
    """Write xG v1 test-set metrics and calibration (run after train)."""
    plot = write_results(data_dir / "models", output)
    typer.echo(f"Wrote {output} and {plot}")
