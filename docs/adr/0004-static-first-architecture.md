# ADR 0004: Static-first architecture for the MVP

Status: accepted, October 2026

The project plan describes a read-only FastAPI on Google Cloud Run, Postgres on Supabase and a React
frontend on Vercel. It also describes an "archive mode" for the end of the project: export the
serving tables to static JSON so the site keeps working with no database, no API and no bills.

For the MVP we start in archive mode. `pitchlens publish` writes a match index and one JSON document
per match under data/site/; a static React site reads those files. There is no API, no database and
no cloud billing account in phase 3.

Why:

- **One person, three new services.** The plan was written for two people. Dropping the API and
  database removes two services, a billing account and their secrets, and leaves the work where it
  matters: the pipeline and the pages.
- **Data changes rarely.** The data changes when we re-run the pipeline, not per request, so there
  is nothing for an API to compute (CONTEXT: batch architecture only).
- **StatsBomb user agreement.** Clause 1.2.1 forbids providing the data to third parties. A public
  API that returns every event is close to that. We publish only what each page shows (shots with
  location, outcome and xG, a cumulative xG timeline and a small stats table; later a pass network
  and team aggregates), with no bulk or event-level download, and every document and page carries the
  StatsBomb attribution and logo.

Trade-offs: no live queries, filters run in the browser over the published files, and the
portfolio shows less backend work. FastAPI and Postgres remain the path if a later phase needs
per-request data (for example live forecasts); the JSON documents are a natural API contract then.
The hosting choice is made in the web app issue.
