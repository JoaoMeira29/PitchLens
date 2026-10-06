import json
from pathlib import Path

import pytest

from pitchlens.config import Competition
from pitchlens.sources.statsbomb import BASE_URL, cached_json, ingest_competition

COMPETITION = Competition("Test Cup", competition_id=1, season_id=2)
MATCH_IDS = [101, 102]


class FakeFetch:
    """Serves minimal JSON instead of downloading, and records every URL requested."""

    def __init__(self) -> None:
        self.urls: list[str] = []

    def __call__(self, url: str) -> bytes:
        self.urls.append(url)
        if url.endswith(f"matches/{COMPETITION.competition_id}/{COMPETITION.season_id}.json"):
            return json.dumps([{"match_id": match_id} for match_id in MATCH_IDS]).encode()
        return b"[]"


def test_cached_json_downloads_once_then_reads_cache(tmp_path: Path) -> None:
    fetch = FakeFetch()
    first = cached_json("matches/1/2.json", tmp_path, fetch)
    second = cached_json("matches/1/2.json", tmp_path, fetch)
    assert first == second
    assert fetch.urls == [f"{BASE_URL}/matches/1/2.json"]


def test_cached_json_writes_to_the_mirrored_path(tmp_path: Path) -> None:
    cached_json("matches/1/2.json", tmp_path, FakeFetch())
    assert (tmp_path / "matches" / "1" / "2.json").is_file()


def test_ingest_requests_matches_then_events_and_lineups_per_match(tmp_path: Path) -> None:
    fetch = FakeFetch()
    summary = ingest_competition(COMPETITION, tmp_path, fetch)
    expected = {f"{BASE_URL}/matches/1/2.json"}
    for match_id in MATCH_IDS:
        expected |= {f"{BASE_URL}/events/{match_id}.json", f"{BASE_URL}/lineups/{match_id}.json"}
    assert set(fetch.urls) == expected
    assert len(fetch.urls) == len(expected)
    assert summary.matches == len(MATCH_IDS)
    assert summary.downloaded == len(expected)
    assert summary.cached == 0


def test_second_ingest_downloads_nothing(tmp_path: Path) -> None:
    ingest_competition(COMPETITION, tmp_path, FakeFetch())
    fetch = FakeFetch()
    summary = ingest_competition(COMPETITION, tmp_path, fetch)
    assert fetch.urls == []
    assert summary.downloaded == 0
    assert summary.cached == 1 + 2 * len(MATCH_IDS)


def test_failed_download_leaves_no_cache_file(tmp_path: Path) -> None:
    def failing_fetch(url: str) -> bytes:
        raise OSError("network down")

    with pytest.raises(OSError):
        cached_json("events/101.json", tmp_path, failing_fetch)
    assert not any(path.is_file() for path in tmp_path.rglob("*"))

    cached_json("events/101.json", tmp_path, FakeFetch())
    assert (tmp_path / "events" / "101.json").is_file()
