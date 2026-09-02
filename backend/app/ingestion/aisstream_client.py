"""
AIS ingestion via aisstream.io WebSocket.

Handles the aisstream.io v0 PositionReport message format.

Write strategy
--------------
vessel_positions  — upsert (one row per MMSI, latest position only, used by
                    the live map).  Written on every message via a thread-pool
                    so disk I/O never blocks the event loop.

ais_history       — append-only rolling window (used by the anomaly detector).
                    Positions are buffered in memory and flushed to disk every
                    HISTORY_FLUSH_INTERVAL_SECS seconds by a background task.
                    This means at most ~500 ms of data can be lost on a hard
                    crash, which is acceptable for analytics purposes.

Both changes keep the asyncio event loop free so FastAPI can serve HTTP
requests even when AIS messages are arriving at 100+ msgs/second.
"""

import asyncio
import json
import logging
from datetime import datetime, timezone
from collections import deque

import websockets

from app.config import settings
from app.models.vessel_position import TABLE as VESSEL_TABLE
from app.models.ais_history import TABLE as HISTORY_TABLE, MAX_RECORDS

logger = logging.getLogger("aisstream_client")

# Flush the in-memory history buffer to disk this often.
HISTORY_FLUSH_INTERVAL_SECS = 30

# In-memory ring buffer for history positions (thread-safe via asyncio lock)
_history_buffer: deque = deque()
_history_lock = asyncio.Lock()


def _get(d: dict, *keys, default=None):
    """Try multiple key names — aisstream.io uses inconsistent casing."""
    for k in keys:
        v = d.get(k)
        if v is not None:
            return v
    return default


# ---------------------------------------------------------------------------
# Blocking I/O helpers (run in thread pool via asyncio.to_thread)
# ---------------------------------------------------------------------------

def _upsert_position_sync(mmsi: str, fields: dict) -> None:
    """Synchronous upsert — called in a thread pool."""
    import threading
    from app.db.json_store import _load, _save, DATA_DIR
    from pathlib import Path

    # Per-table file lock (threading.Lock, not asyncio.Lock, because this
    # runs in a thread pool thread, not the event loop).
    if not hasattr(_upsert_position_sync, "_locks"):
        _upsert_position_sync._locks = {}
    lock = _upsert_position_sync._locks.setdefault(
        VESSEL_TABLE, threading.Lock()
    )

    with lock:
        data = _load(VESSEL_TABLE)
        existing_idx = None
        for i, r in enumerate(data["records"]):
            if str(r.get("mmsi")) == mmsi:
                existing_idx = i
                break

        record = {**fields, "mmsi": mmsi}
        if existing_idx is not None:
            record["id"] = data["records"][existing_idx]["id"]
            old = data["records"][existing_idx]
            for flag in ("suspicious", "anomalyReason", "anomalySeverity"):
                if flag not in record and flag in old:
                    record[flag] = old[flag]
            data["records"][existing_idx] = record
        else:
            record["id"] = data["next_id"]
            data["next_id"] += 1
            data["records"].append(record)

        _save(VESSEL_TABLE, data)


def _flush_history_sync(batch: list) -> None:
    """Append *batch* to the ais_history JSON file — runs in a thread pool."""
    import threading
    from app.db.json_store import _load, _save

    if not hasattr(_flush_history_sync, "_lock"):
        _flush_history_sync._lock = threading.Lock()

    with _flush_history_sync._lock:
        data = _load(HISTORY_TABLE)
        for record in batch:
            record["id"] = data["next_id"]
            data["next_id"] += 1
            data["records"].append(record)

        # Trim to cap
        if len(data["records"]) > MAX_RECORDS:
            data["records"] = data["records"][-MAX_RECORDS:]

        _save(HISTORY_TABLE, data)


# ---------------------------------------------------------------------------
# Async helpers
# ---------------------------------------------------------------------------

async def _upsert_position(mmsi: str, fields: dict) -> None:
    """Non-blocking upsert: offload disk I/O to a thread."""
    await asyncio.to_thread(_upsert_position_sync, mmsi, fields)


def _buffer_history(mmsi: str, lat: float, lon: float,
                    sog: float | None, cog: float | None,
                    ts: datetime) -> None:
    """Push one position into the in-memory buffer (no I/O)."""
    _history_buffer.append({
        "mmsi":      mmsi,
        "latitude":  lat,
        "longitude": lon,
        "sog":       sog,
        "cog":       cog,
        "timestamp": ts,
    })


async def flush_history_to_disk() -> None:
    """
    Drain the in-memory buffer and write to disk.
    Called periodically by the background flush task.
    Safe to call from the event loop — disk I/O is offloaded to a thread.
    """
    if not _history_buffer:
        return
    # Drain atomically
    batch = []
    while _history_buffer:
        batch.append(_history_buffer.popleft())

    if batch:
        try:
            await asyncio.to_thread(_flush_history_sync, batch)
            logger.debug("ais_history: flushed %d records to disk", len(batch))
        except Exception as exc:
            logger.warning("ais_history flush failed (non-fatal): %s", exc)


async def run_history_flush_task() -> None:
    """Background task: flush history buffer every HISTORY_FLUSH_INTERVAL_SECS."""
    while True:
        await asyncio.sleep(HISTORY_FLUSH_INTERVAL_SECS)
        await flush_history_to_disk()


# ---------------------------------------------------------------------------
# Message handler
# ---------------------------------------------------------------------------

async def _handle_message(raw_message: str) -> None:
    """Parse one aisstream.io WebSocket message and write to the store."""
    try:
        data = json.loads(raw_message)
    except (json.JSONDecodeError, TypeError):
        return

    msg_type = data.get("MessageType")
    if msg_type != "PositionReport":
        return

    meta = data.get("MetaData") or {}
    pos  = (data.get("Message") or {}).get("PositionReport") or {}

    mmsi = str(_get(meta, "MMSI", "Mmsi", "mmsi", default="")).strip()
    if not mmsi:
        return

    lat = _get(meta, "Latitude", "latitude", "lat")
    lon = _get(meta, "Longitude", "longitude", "lon")

    if lat is None or lon is None:
        return
    try:
        lat, lon = float(lat), float(lon)
    except (TypeError, ValueError):
        return
    if lat == 0.0 and lon == 0.0:
        return

    ship_name  = (_get(meta, "ShipName", "shipname", "ship_name") or "").strip() or None
    sog        = _get(pos, "Sog", "sog", "SOG")
    cog        = _get(pos, "Cog", "cog", "COG")
    heading    = _get(pos, "TrueHeading", "Heading", "heading")
    nav_status = _get(pos, "NavigationalStatus", "NavigationStatus", "status")

    ts_raw = _get(meta, "time_utc", "TimeUtc", "timestamp")
    try:
        ts = (datetime.fromisoformat(ts_raw.replace("Z", "+00:00"))
              if ts_raw else datetime.now(timezone.utc))
    except (ValueError, AttributeError):
        ts = datetime.now(timezone.utc)

    sog_f = float(sog) if sog is not None else None
    cog_f = float(cog) if cog is not None else None

    # 1. Update the live map table (non-blocking thread I/O)
    try:
        await _upsert_position(mmsi, {
            "ship_name": ship_name,
            "latitude":  lat,
            "longitude": lon,
            "sog":       sog_f,
            "cog":       cog_f,
            "heading":   float(heading) if heading is not None else None,
            "speed":     sog_f,
            "course":    cog_f,
            "status":    str(nav_status) if nav_status is not None else None,
            "timestamp": ts,
        })
    except Exception as exc:
        logger.warning("vessel_positions write failed (non-fatal): %s", exc)

    # 2. Buffer into the history ring (pure memory, no I/O — never blocks)
    _buffer_history(mmsi, lat, lon, sog_f, cog_f, ts)


# ---------------------------------------------------------------------------
# Standalone entry (not used when AISSupervisor is active)
# ---------------------------------------------------------------------------

async def run_aisstream_client():
    sub = json.dumps({
        "APIKey":             settings.aisstream_api_key,
        "BoundingBoxes":      settings.aoi_all_bboxes,
        "FilterMessageTypes": ["PositionReport"],
    })
    asyncio.create_task(run_history_flush_task())
    while True:
        try:
            async with websockets.connect(settings.aisstream_url) as ws:
                await ws.send(sub)
                logger.info("aisstream_client connected")
                async for raw in ws:
                    await _handle_message(raw)
        except Exception as e:
            logger.warning("aisstream_client error (%s) — retry in 10s", e)
            await asyncio.sleep(10)
