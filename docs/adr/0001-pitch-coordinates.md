# ADR 0001: Internal pitch coordinates

Status: accepted, October 2026

We convert every location at ingest from the provider's system (StatsBomb: 120 x 80, origin
top-left) into one internal convention: metres on a 105 x 68 pitch, origin bottom-left, the
team in possession attacking left to right. Charts, models and the API use only internal
coordinates. Conversion lives in pitchlens.coords and is covered by example and property
tests. Trade-off: scaling StatsBomb units to metres is approximate near the boxes (the
penalty spot lands about 10.5 m from goal instead of 11 m); we accept this for display and
modelling, and revisit if we add a provider with true metric coordinates.
