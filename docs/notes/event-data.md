# Five things learned about StatsBomb event data

Phase 0 learning notes (kickoff task 13). Every number below was computed from StatsBomb open data
in `notebooks/2026-10-first-shot-map.ipynb` or with `statsbombpy` on 2026-10-06.

- **Surprising: how much of a match is recorded.** The 2022 World Cup final has 4407 event rows and
  94 columns. Most rows are not shots: passes, ball receipts and carries dominate. Event-specific
  details sit in prefixed columns (`shot_*`, `pass_*`), so most cells in any one row are empty.
- **Pitfall: the penalty shootout is period 5.** Shootout kicks are stored as `Shot` events. Leave them
  in and Argentina have 7 goals in that final; exclude period 5 and the count is the real 3. Nothing
  crashes, the number is just wrong, which is why every transform needs a test.
- **xG in my own words.** Expected goals is the probability that a shot becomes a goal, estimated from
  many past shots with similar features (where it was taken, body part, type of play, defenders in
  the way). StatsBomb publishes its own value per shot (`shot_statsbomb_xg`); our xG v1 will be our
  own logistic regression, compared against it.
- **Question I can't answer yet.** How much does the shot freeze frame (positions of the players
  around the shooter, included with every shot) improve an xG model over location and body part
  alone, and is it worth the extra complexity in v1?
- **Idea for phase 1.** The StatsBomb user agreement forbids redistributing the data, so test fixtures
  cannot be committed raw. Decide early between downloading fixture matches in CI with a cache and
  small hand-built synthetic files (issue #5), because the end-to-end test depends on it.
