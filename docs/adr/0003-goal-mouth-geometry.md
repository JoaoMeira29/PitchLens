# ADR 0003: Goal mouth geometry for shot features

Status: accepted, October 2026

Shot distance and shot angle (the angle the goal mouth subtends at the shot) are computed in
PitchLens internal coordinates (ADR 0001). They need the position of the goal posts.

StatsBomb draws the posts at y = 36 and 44 on its 120 x 80 pitch. Scaled like every other location,
they land at y = 30.6 and 37.4 on the internal 105 x 68 pitch, a goal mouth 6.8 m wide instead of the
real 7.32 m. The data agrees: in the phase 1 data the internal end location of every goal lies
between y = 30.6 and 37.57.

We use the scaled StatsBomb posts (`pitchlens.features.POST_LOW_Y` and `POST_HIGH_Y`), so shot
locations and goal geometry share one scale. Using the real 7.32 m goal on top of scaled locations
would make every angle slightly larger than the data's own geometry. Distance is measured to the
centre of the goal, (105, 34).

This inherits the trade-off of ADR 0001: absolute distances and angles are approximate. The xG model
learns from these features consistently, so the approximation matters for display, not for the
model's ranking of chances. Revisit together with ADR 0001 if we add a provider with true metric
coordinates.
