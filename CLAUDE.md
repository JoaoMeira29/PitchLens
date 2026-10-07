# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

PitchLens: open football analytics app (own xG model, match pages, later forecasts). Full context,
roadmap and decisions: docs/CONTEXT.md. Guiding rule: show the numbers and show the method.

## Setup (once per clone, Windows and macOS)
- Install uv. Windows: `winget install -e --id astral-sh.uv`. macOS: `curl -LsSf https://astral.sh/uv/install.sh | sh`
- `uv sync` installs Python 3.12 (from .python-version) and all dependencies into .venv
- `uv run pre-commit install` (git hooks are not versioned, so run it on every machine)
- VS Code interpreter: Windows `.venv/Scripts/python.exe`, macOS `.venv/bin/python`
- Windows PowerShell 5.1 has no `&&`: give and run commands one at a time.

## Commands
- Tests: `uv run pytest`. One test: `uv run pytest tests/test_coords.py::test_corners_map_correctly`
- Lint, format, types: `uv run ruff check --fix .`, `uv run ruff format .`, `uv run mypy` (strict);
  all of them as hooks: `uv run pre-commit run --all-files`
- Data: `uv run pitchlens ingest` (JSON cache in data/raw, first run ~7 min and 1.4 GB; Parquet in
  data/staged), then `validate` (contracts), `coverage`, `train` and `evaluate` (xG v1 results doc).
- Local Postgres (Docker Desktop running): `docker compose up -d --wait`, stop with `docker compose stop`.
  Host port is 5433, not 5432, to avoid clashing with a local Postgres (see .env.example).
- CI (.github/workflows/ci.yml) runs `uv sync --locked`, ruff check, ruff format --check, mypy and
  pytest on every pull request, so keep uv.lock committed and in sync with pyproject.toml.

## Structure
- uv workspace: the root pyproject.toml is a virtual root with the dev tools and ruff/mypy/pytest
  config; the `pitchlens` package lives in pipeline/src/pitchlens (src layout, uv_build).
- Tests live in the top-level tests/, fixture data in tests/fixtures/. api/ and web/ are empty until phase 3.
- Planned flow: pipeline ingests StatsBomb open data -> Parquet and DuckDB -> precomputed tables in
  Postgres -> read-only FastAPI -> React site. Batch only: no per-request computation or LLM calls.

## Conventions
- Coordinates: StatsBomb is 120 x 80, origin top-left. Convert at ingest with
  `pitchlens.coords.statsbomb_to_internal` (metres, 105 x 68, origin bottom-left).
- Exclude penalty shootouts (period 5) from match stats. Penalties are modelled separately from
  open-play xG. Own goals are not shots.
- Per-90 rankings need at least 900 minutes.
- Every transform gets a test, ideally one that would catch a silently wrong number.
- Small pull requests; record decisions as ADRs in docs/adr/.
- Works on Windows and macOS: LF line endings (.gitattributes), forward-slash paths, no OS-only scripts.

## Rules
- Never invent statistics, xG values, results or player numbers, in code, tests or docs.
- Ask before adding a dependency, tool or service.
- Never commit data/, .env or notebook outputs. Credit StatsBomb on anything published.
- Plan first, then edit; show the diff.
- Never run `git commit` or `git push`: stage the changes and give the human the commit command.
  Never add Co-Authored-By trailers.
