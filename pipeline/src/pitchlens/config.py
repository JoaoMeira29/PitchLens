"""Which StatsBomb open-data competitions the pipeline ingests.

IDs come from StatsBomb's competitions.json. Chosen for phase 1: a World Cup and a Euros (recent,
with 360 data) plus one complete league season for xG training volume.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class Competition:
    name: str
    competition_id: int
    season_id: int


COMPETITIONS: tuple[Competition, ...] = (
    Competition("FIFA World Cup 2022", competition_id=43, season_id=106),
    Competition("UEFA Euro 2024", competition_id=55, season_id=282),
    Competition("Premier League 2015/16", competition_id=2, season_id=27),
)
