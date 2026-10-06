# ADR 0002: Clamp slightly out-of-pitch locations

Status: accepted, October 2026

In the phase 1 data (FIFA World Cup 2022, UEFA Euro 2024, Premier League 2015/16), 4 of 1,724,464
event locations fall outside StatsBomb's 120 x 80 pitch. All 4 are corner kicks recorded just past
the goal line (x between 120.1 and 120.9): two passes and two direct shots, one of them a goal.
Every other location (pass, carry, shot and goalkeeper end locations, shot freeze frames) is on the
pitch.

Dropping these events would silently lose a goal, so at staging we pull an event location that is
at most 1.0 StatsBomb unit outside the pitch back onto the nearest line and set
`location_clamped = True` on the row. Anything further out still raises an error, so genuinely bad
data stops the pipeline instead of being moved. End locations are not clamped; they must already be
on the pitch. The rule lives in `pitchlens.coords.clamp_statsbomb` and is tested; staging was
checked against the match files (goals from shots plus own goals equal every final score).

Revisit the tolerance if a new competition has larger overshoots.
