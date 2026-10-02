# PitchLens: project context
 
Last updated: October 2026. Update the "Current status" and "Decisions" sections as the project moves.
 
## What PitchLens is
 
An open football (soccer) analytics web app and a set of written analyses, built by two software engineers who are learning sports data analysis as they go. The guiding idea: **show the numbers and show the method.** Every chart explains itself, the xG model is our own and benchmarked in the open, and the forecast publishes its own track record.
 
Goals, in order:
1. Learn practical football analytics (event data, xG, forecasting, evaluation).
2. Build two strong portfolios (one shared project, two individual case studies).
3. Ship a polished, public, low-maintenance product.
Non-goals: commercial use, real-time live scores, betting tips, scraping sites that forbid it.
 
## Layers
 
| Layer | What | Data | Status |
|---|---|---|---|
| Core (static) | Match pages (shot map, xG timeline, pass network, key stats), competition pages, our own xG model | StatsBomb open data | Planned |
| Live | Weekly team ratings (Elo, then Dixon-Coles), season simulations, public track record | football-data.org (free tier), football-data.co.uk history | Planned |
| AI notes | Short match summaries generated offline from computed stats, with an automated number check | Pipeline outputs only | Planned |
| Video lab (optional) | Per-player positions, heatmaps and distance covered from our own fixed-camera footage | Our own video | After launch |
 
## Architecture
 
- **Pipeline:** Python package with a CLI (`pitchlens ingest | validate | train | forecast | publish`). Idempotent. Raw JSON cached; staged as Parquet validated with pandera; analysis and training in DuckDB.
- **Serving:** Postgres (Supabase free tier) holds only the tables the site needs.
- **API:** FastAPI, read-only, Pydantic v2, SQLAlchemy 2, Alembic. OpenAPI spec generates frontend types.
- **Frontend:** React, TypeScript, Vite, TanStack Query, D3 (pitch graphics), Observable Plot (standard charts).
- **Deploy:** static frontend on Cloudflare Pages or Vercel; API as one Docker container on Cloud Run or Fly.io (scale to zero); GitHub Actions for CI, deploy and the scheduled forecast job.
- **AI:** Claude API called only from the pipeline, never from the browser or per page view.
- **Not using:** Kubernetes, Terraform, Airflow, message queues, a second coding assistant.
Repo layout:
```
pitchlens/
  pipeline/   api/   web/   notebooks/   docs/   tests/fixtures/   .github/workflows/
```
 
## Data sources and rules
 
| Source | Use | Licence notes |
|---|---|---|
| StatsBomb open data | Core event data, 360 freeze frames | User agreement; credit StatsBomb and show their logo on anything published |
| football-data.org | Fixtures and results for the live layer | Free tier: 12 competitions, 10 requests/min, no player stats; cache everything |
| football-data.co.uk | Historical results and odds for forecast training and benchmarking | Check terms before redistributing |
| Wyscout public dataset (2017/18) | Full-season supplement for player-profile experiments | Open licence with attribution; verify exact terms |
| FBref, Understat, Sofascore, FotMob, WhoScored, Transfermarkt | Not used | Advanced data gone (FBref) or scraping prohibited |
 
All sources, licence links and last-checked dates live in `docs/DATA_SOURCES.md`.
 
## Technical conventions
 
- **Coordinates:** StatsBomb pitch is 120 × 80, origin top-left, attacking left to right. Convert at ingest into one internal convention and test it.
- **Penalties** are modelled separately from open-play xG. Own goals are not shots.
- **Per-90 stats** require a minimum-minutes threshold (default 900) before ranking players.
- **Evaluation:** log loss, Brier score and calibration plots for xG; ranked probability score for match forecasts; always compare against a baseline (StatsBomb xG, bookmaker odds, or a naive model).
- **Testing:** pytest, Hypothesis for invariants (xG in [0, 1], H/D/A probabilities sum to 1), pandera contracts, end-to-end test on committed fixture matches, model-metric regression test, Vitest and Playwright for the frontend, faithfulness test for every AI note.
- **Code style:** ruff, mypy, typed functions, small pull requests, one review required.
- **Decisions** are recorded as short ADRs in `docs/adr/`.
## Roles
 
- **Person A, data and models lead:** ingestion, data contracts, xG and forecast models, analytical write-ups. Crosses over by building the competition page frontend.
- **Person B, product and platform lead:** API, frontend, CI/CD, deployment, AI integration. Crosses over by building the Elo baseline and co-writing one analysis.
Weekly 30-minute sync; everything else async in GitHub Issues, Projects and pull requests.
 
## Roadmap
 
| Phase | Weeks | Done when |
|---|---|---|
| 0 Foundations | 1 | Repo runs locally for both; CI green |
| 1 Data foundations | 2–3 | One command rebuilds the dataset; CI validates it |
| 2 xG model v1 | 4–6 | Model card and write-up #1 drafted |
| 3 App MVP | 7–9 | Public URL (safe stopping point) |
| 4 Live forecasts | 10–11 | Cron has run twice unattended |
| 5 AI match notes | 12–13 | Every published note passes the number check |
| 6 Polish and launch | 14–16 | Ready to send to a club hiring manager |
| 7 Video lab (optional) | 17–22 | 5-minute clip gives per-player heatmaps and distance, with a published accuracy figure |
 
## Current status
 
- Phase: 0 (Foundations)
- Done so far: plan written, name chosen
- Next up: create repo, register for StatsBomb open data, first shot map notebook
- Open questions: which league for the live layer; how long to keep the live layer running before archive mode
## Decisions log
 
- 2026-10: Name is PitchLens.
- 2026-10: Batch architecture only; no per-request computation or LLM calls.
- 2026-10: Language models never produce numbers; they only describe computed numbers.
- 2026-10: Video lab uses only our own footage, filmed from a fixed wide camera, with consent from people shown.