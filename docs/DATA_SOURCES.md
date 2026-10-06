# Data sources

Every external data source PitchLens uses, its terms, and what we must do to comply. Re-check the
terms before each public release and update "Last checked".

| Source | Used for | Terms | Last checked | Required attribution |
|---|---|---|---|---|
| [StatsBomb open data](https://github.com/statsbomb/open-data) | Core event data, lineups, 360 freeze frames. Ingested: FIFA World Cup 2022 (43/106), UEFA Euro 2024 (55/282), Premier League 2015/16 (2/27); see `docs/coverage.md` | [User Agreement](https://github.com/statsbomb/open-data/blob/master/LICENSE.pdf) (version "last updated 8 September 2023") | 2026-10-06 | Name StatsBomb as the data source and show the StatsBomb logo ([Media Pack](https://statsbomb.com/media-pack/)) on anything published |

## StatsBomb open data: what the agreement means for us

- **No redistribution.** Clause 1.2.1: users may not "edit, distort, distribute, reproduce, sell or in
  any way provide the data to any external or third party". Raw StatsBomb files are never committed
  to this repository; they are downloaded and cached locally under `data/` (gitignored).
- **No commercial use** of the data or of analysis derived from it (clause 1.2.2).
- **Publishing analysis is allowed**, credited with the StatsBomb logo (clause 1.4 and the README).
- **Registration.** The agreement asks users to register at www.statsbomb.com/resource-centre. On
  2026-10-06 that address redirected to a Hudl product page with no registration form, so no
  registration was made. The data on GitHub needs no credentials.
- **No warranty.** Data is provided "as is" and StatsBomb may withdraw it at any time (clauses 2.1, 3.2
  to 3.4).
