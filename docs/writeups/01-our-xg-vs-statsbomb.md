# Our xG model vs a professional one (draft)

> Draft, not published. Every number below is copied from
> [docs/xg-v1-results.md](../xg-v1-results.md) as generated on 2026-10-07; if the model is
> retrained, update the numbers from that file. Before publishing anywhere, add the StatsBomb logo
> (Media Pack), as the StatsBomb user agreement requires.

## The question

Expected goals (xG) puts a number on chance quality: the probability that a shot becomes a goal.
StatsBomb publishes its own xG for every shot in its open data. We built a deliberately simple
model, PitchLens xG v1, to see how far a handful of transparent features gets, and where it falls
short.

## What we built

A logistic regression on five things the event data tells us about each shot: distance to goal,
the angle of the goal mouth from the shot, body part, how the move started (open play, set piece,
counter, direct free kick) and whether it was a first-time shot. Penalties are valued separately,
and penalty shootouts are left out entirely: in the 2022 World Cup final, counting shootout kicks
as shots would give Argentina 7 goals instead of 3.

We trained on the Premier League 2015/16 (9817 shots, 914 goals) and tested on two tournaments the
model never saw: the 2022 World Cup and Euro 2024 (2734 shots, 250 goals).

## How it did

| Model | Log loss | Brier score |
|---|---|---|
| PitchLens xG v1 | 0.2664 | 0.0748 |
| StatsBomb xG | 0.2468 | 0.0692 |
| Baseline: every shot gets the training goal rate | 0.3059 | 0.0831 |

Lower is better on both. Our model clearly beats the naive baseline, so the features carry real
information, and StatsBomb's model beats ours on both measures.

Calibration tells the same story in more detail. For low-xG shots, which are most shots, our
predictions match what happened: shots we rated between 0.1 and 0.2 had a mean prediction of 0.1390
and scored at a rate of 0.1355 (657 shots). At the top, our model is too optimistic: shots we rated
above 0.5 averaged 0.6089 but scored at 0.5000. That bin holds only 32 shots, so the gap is
uncertain, but StatsBomb's top bin (47 shots) was much closer: 0.6435 predicted against 0.6383
observed.

## What the model learned

The coefficients point where football intuition says they should: each extra metre of distance
lowers the log-odds of a goal (-0.1305 per metre), a wider view of the goal raises them (1.1674 per
radian), and headers are harder to score than shots with the foot (-1.1004). Holding distance and
angle fixed, direct free kicks come out above open play (0.8477) and set-piece situations below it
(-0.2771); these are associations in one league season, not causes.

## Why the professional model wins

Our model knows where the shot was taken from, and almost nothing else. It cannot see the
goalkeeper's position or defenders between the ball and the goal, which StatsBomb's shot freeze
frames record, and it knows nothing about the pass that created the chance. The big chances where
we overestimate are plausibly the ones where that missing context matters most. That is the
hypothesis for xG v2: add freeze-frame features and measure whether the top of the calibration
curve moves.

## Penalties

Penalties get one number: the conversion rate in training, 0.8132 from 91 penalties. In the test
tournaments, 35 penalties were converted at 0.7429. Both samples are small.

## Limits

Trained on a single league season and tested on international tournaments years later; distances
and angles come from StatsBomb's 120 x 80 units scaled to metres; open data is a sample chosen by
StatsBomb. The [model card](../model-card-xg-v1.md) lists the blind spots in full.

Data: StatsBomb open data.
