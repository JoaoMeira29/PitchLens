"""Download StatsBomb open data and cache the raw JSON locally.

Files are mirrored from the statsbomb/open-data repository under raw_dir with the same layout
(matches/<competition>/<season>.json, events/<match>.json, lineups/<match>.json). A file that is
already cached is never downloaded again, so re-running the ingest is cheap and idempotent.
The StatsBomb user agreement forbids redistribution, so raw_dir must stay out of git (data/ is
ignored).
"""

import json
import os
import urllib.request
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from pitchlens.config import Competition

BASE_URL = "https://raw.githubusercontent.com/statsbomb/open-data/master/data"

Fetch = Callable[[str], bytes]


def fetch_url(url: str) -> bytes:
    with urllib.request.urlopen(url, timeout=60) as response:
        body: bytes = response.read()
    return body


@dataclass(frozen=True)
class IngestSummary:
    competition: Competition
    matches: int
    downloaded: int
    cached: int


def _cache_path(relative_path: str, raw_dir: Path) -> Path:
    return raw_dir.joinpath(*relative_path.split("/"))


def cached_json(relative_path: str, raw_dir: Path, fetch: Fetch) -> Any:
    """Return the parsed JSON at relative_path, downloading it into raw_dir if not cached yet."""
    path = _cache_path(relative_path, raw_dir)
    if not path.exists():
        body = fetch(f"{BASE_URL}/{relative_path}")
        json.loads(body)  # refuse to cache anything that is not valid JSON
        path.parent.mkdir(parents=True, exist_ok=True)
        partial = path.with_name(path.name + ".part")
        partial.write_bytes(body)
        os.replace(partial, path)  # atomic: an interrupted run never leaves a half-written file
    return json.loads(path.read_bytes())


def ingest_competition(competition: Competition, raw_dir: Path, fetch: Fetch) -> IngestSummary:
    """Cache the matches file of one competition season, then events and lineups for each match."""
    relative_paths = [f"matches/{competition.competition_id}/{competition.season_id}.json"]
    downloaded = cached = 0

    def get(relative_path: str) -> Any:
        nonlocal downloaded, cached
        if _cache_path(relative_path, raw_dir).exists():
            cached += 1
        else:
            downloaded += 1
        return cached_json(relative_path, raw_dir, fetch)

    matches = get(relative_paths[0])
    for match in matches:
        get(f"events/{match['match_id']}.json")
        get(f"lineups/{match['match_id']}.json")

    return IngestSummary(competition, len(matches), downloaded, cached)
