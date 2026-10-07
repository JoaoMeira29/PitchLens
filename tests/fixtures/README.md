# Test fixtures

`statsbomb/` holds **synthetic** data in the StatsBomb open-data JSON format (events spec v4.0.0),
laid out like the real cache (`matches/<competition>/<season>.json`, `events/<match>.json`,
`lineups/<match>.json`). Every team, player, match and value in it was made up for testing; none of
it is StatsBomb data and none of it describes a real match. IDs (competition 9001, matches 900001
and 900002) are chosen so they cannot be confused with real ones.

Why synthetic: the StatsBomb user agreement (clause 1.2.1) forbids distributing or reproducing the
data, so real files must never be committed (see `docs/DATA_SOURCES.md`). Real data is checked
locally with `uv run pitchlens ingest` followed by `uv run pitchlens validate`.

What the two matches exercise:

- **900001** (league): a goal from open play, a missed shot, a corner scored from a location just
  past the goal line (clamped, ADR 0002), an own goal ("Own Goal Against" / "Own Goal For"), and a
  pass and a carry with end locations.
- **900002** (knockout): level after extra time (periods 3 and 4) and decided by a penalty shootout
  (period 5), whose kicks must not count as match shots or goals.

The final scores in the matches file are consistent with the events: shot goals outside period 5
plus own goals equal each team's score. `tests/test_end_to_end.py` checks exactly that.
