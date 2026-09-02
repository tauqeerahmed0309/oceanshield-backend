"""
Lightweight JSON-file-backed data store — replaces SQLAlchemy + PostGIS.

Each "table" is one JSON file under DATA_DIR: {"next_id": int, "records": [...]}.
All reads/writes for a table go through an in-process asyncio.Lock, and
writes are atomic (write to .tmp, then os.replace) so a crash mid-write
can't corrupt the file.

Spatial queries (PostGIS ST_DWithin / ST_Distance in the original code)
are replaced by a plain haversine formula run in Python — fine at demo/
pilot data volumes, but O(n) per query instead of using a spatial index,
so it won't scale to a large fleet history the way PostGIS would.

Two developers working off the same `data/db/*.json` files (e.g. over a
shared drive or git) will conflict on concurrent writes — this store only
guards against concurrent writes *within one running process*, not across
processes/machines. Fine for one backend instance; not a substitute for a
real DB if you ever run more than one.
"""

import asyncio
import json
import math
from datetime import datetime
from pathlib import Path
from typing import Any, Callable, Optional

DATA_DIR = Path("data/db")
DATA_DIR.mkdir(parents=True, exist_ok=True)

# Field names that should be parsed back into datetime objects on load
# (they're written as ISO strings, since JSON has no native datetime type).
DATETIME_FIELDS = {
    "timestamp", "detected_at", "scene_timestamp", "fetched_at",
    "created_at", "icg_notified_at", "icg_acknowledged_at", "public_released_at",
}

_locks: dict[str, asyncio.Lock] = {}


def _lock_for(table: str) -> asyncio.Lock:
    if table not in _locks:
        _locks[table] = asyncio.Lock()
    return _locks[table]


def _path(table: str) -> Path:
    return DATA_DIR / f"{table}.json"


def _json_default(o):
    if isinstance(o, datetime):
        return o.isoformat()
    # filter_breakdown (spill_candidates) carries numpy scalars out of the
    # ML/feature-extraction code (e.g. np.float64 aspect ratios) — plain
    # json.dump can't serialize those, so coerce anything array-like/numpy.
    if hasattr(o, "item") and callable(o.item):
        try:
            return o.item()
        except Exception:
            pass
    if hasattr(o, "tolist") and callable(o.tolist):
        try:
            return o.tolist()
        except Exception:
            pass
    raise TypeError(f"Object of type {type(o).__name__} is not JSON serializable")


def _parse_datetimes(record: dict) -> dict:
    for key in DATETIME_FIELDS:
        val = record.get(key)
        if isinstance(val, str):
            record[key] = datetime.fromisoformat(val)
    return record


def _load(table: str) -> dict:
    p = _path(table)
    if not p.exists():
        return {"next_id": 1, "records": []}
    try:
        with open(p, "r") as f:
            data = json.load(f)
        for r in data["records"]:
            _parse_datetimes(r)
        return data
    except (json.JSONDecodeError, KeyError, ValueError) as exc:
        # File is corrupt (partial write, truncated rename, etc.) — start fresh
        # and log a warning so it's visible in the server output.
        import logging as _logging
        _logging.getLogger("json_store").warning(
            "Corrupt JSON store '%s' (%s) — resetting to empty.", table, exc
        )
        empty: dict = {"next_id": 1, "records": []}
        _save(table, empty)
        return empty


def _save(table: str, data: dict) -> None:
    """Write *data* to <table>.json atomically.

    On Windows the uvicorn --reload file watcher monitors every file inside
    the project tree.  If we write a <table>.tmp sibling file the watcher
    notices it, tries to stat/read it, and holds a handle just long enough
    to make the subsequent rename fail with WinError 2 (file not found —
    the handle caused a lock that made the rename silently drop the source)
    or WinError 32 (sharing violation).

    Fix: write the temp file via tempfile.mkstemp into the OS temp directory
    (completely outside the watched tree), then move it into DATA_DIR in one
    os.replace call.  On Windows we first delete the destination if it exists
    (Windows doesn't allow replace-over-an-open-file) with a short retry loop
    for antivirus / backup tools that momentarily hold a handle.
    """
    import os
    import tempfile
    import time

    p = _path(table)

    # Serialise to a temp file in the system temp dir (not in the project,
    # so the uvicorn watcher never sees it).
    fd, tmp_path_str = tempfile.mkstemp(suffix=".tmp", prefix=f"os_{table}_")
    tmp = Path(tmp_path_str)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(data, f, default=_json_default, indent=2)
            f.flush()
            os.fsync(f.fileno())
    except Exception:
        # Clean up the temp file on any serialisation error
        tmp.unlink(missing_ok=True)
        raise

    # Atomic swap — retry briefly on Windows sharing violations.
    _retries = 8
    _delay   = 0.05   # 50 ms between retries (max ~400 ms total wait)
    last_exc: Exception | None = None
    for attempt in range(_retries):
        try:
            if os.name == "nt" and p.exists():
                try:
                    p.unlink()
                except OSError:
                    pass  # retry loop will catch the rename failure
            tmp.replace(p)
            return  # success
        except OSError as exc:
            last_exc = exc
            if attempt < _retries - 1:
                time.sleep(_delay)
            # else fall through and raise

    # If we exhausted retries, clean up the temp file and propagate.
    tmp.unlink(missing_ok=True)
    raise last_exc  # type: ignore[misc]


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance in km — Python stand-in for PostGIS ST_Distance(::geography)."""
    r_km = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lon2 - lon1)
    a = math.sin(d_phi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(d_lambda / 2) ** 2
    return 2 * r_km * math.asin(math.sqrt(a))


class Record(dict):
    """Dict that also supports attribute access (record.mmsi as well as
    record["mmsi"]), so call sites written against SQLAlchemy model
    instances (incident.latitude, etc.) don't all need rewriting, and
    Pydantic's from_attributes=True still works when building response
    models from these."""

    def __getattr__(self, item):
        try:
            return self[item]
        except KeyError as e:
            raise AttributeError(item) from e

    def __setattr__(self, key, value):
        self[key] = value


class JSONStore:
    """Async CRUD over one JSON file per table. One instance is shared
    process-wide (see `store` below) and handed out via the get_db()
    FastAPI dependency, the same way an AsyncSession used to be."""

    async def insert(self, table: str, fields: dict) -> Record:
        async with _lock_for(table):
            data = _load(table)
            record = dict(fields)
            record["id"] = data["next_id"]
            data["next_id"] += 1
            data["records"].append(record)
            _save(table, data)
            return Record(record)

    async def all(self, table: str) -> list[Record]:
        async with _lock_for(table):
            return [Record(r) for r in _load(table)["records"]]

    async def get(self, table: str, record_id: int) -> Optional[Record]:
        for r in await self.all(table):
            if r["id"] == record_id:
                return r
        return None

    async def update(self, table: str, record_id: int, patch: dict) -> Optional[Record]:
        async with _lock_for(table):
            data = _load(table)
            for r in data["records"]:
                if r["id"] == record_id:
                    r.update(patch)
                    _save(table, data)
                    return Record(r)
            return None

    async def query(
        self,
        table: str,
        predicate: Optional[Callable[[dict], bool]] = None,
        order_by: Optional[str] = None,
        desc: bool = False,
        limit: Optional[int] = None,
    ) -> list[Record]:
        records = await self.all(table)
        if predicate:
            records = [r for r in records if predicate(r)]
        if order_by:
            records.sort(key=lambda r: r.get(order_by), reverse=desc)
        if limit is not None:
            records = records[:limit]
        return records

    async def query_within_radius(
        self,
        table: str,
        lat: float,
        lon: float,
        radius_km: float,
        window_start: Optional[datetime] = None,
        window_end: Optional[datetime] = None,
        timestamp_field: str = "timestamp",
        lat_field: str = "latitude",
        lon_field: str = "longitude",
    ) -> list[Record]:
        """Python stand-in for `WHERE ST_DWithin(geom, ..., radius) AND
        timestamp BETWEEN ...`. Attaches a `_distance_km` field to each
        result so callers can rank/sort by it (mirrors the old raw-SQL
        queries that returned min_distance_m)."""

        def in_range(r: dict) -> bool:
            if window_start is not None or window_end is not None:
                ts = r.get(timestamp_field)
                if ts is None:
                    return False
                if window_start is not None and ts < window_start:
                    return False
                if window_end is not None and ts > window_end:
                    return False
            return True

        results = []
        for r in await self.all(table):
            if not in_range(r):
                continue
            dist = haversine_km(lat, lon, r[lat_field], r[lon_field])
            if dist <= radius_km:
                r = Record(r)
                r["_distance_km"] = dist
                results.append(r)
        return results


store = JSONStore()
