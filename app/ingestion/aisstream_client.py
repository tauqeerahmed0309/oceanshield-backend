"""
Live AIS ingestion via aisstream.io WebSocket.

IMPORTANT: aisstream.io explicitly disallows direct browser connections.
This client runs ONLY on the backend; the frontend never talks to
aisstream.io directly — it reads from our own /vessels API instead.

No SLA / no replay of missed messages is guaranteed by aisstream.io, so
this includes basic reconnect logic. Keep a historical-data fallback
(see ingestion/ais_replay_client.py) for demo reliability.
"""

import asyncio
import json
import logging
from datetime import datetime, timezone

import websockets

from app.config import settings
from app.db.session import store
from app.models.vessel_position import TABLE as VESSEL_TABLE

logger = logging.getLogger("aisstream_client")


async def _write_position(mmsi, ship_name, lat, lon, sog, cog, ts):
    await store.insert(VESSEL_TABLE, {
        "mmsi": mmsi, "ship_name": ship_name,
        "latitude": lat, "longitude": lon,
        "sog": sog, "cog": cog, "timestamp": ts,
    })


async def _handle_message(raw_message: str):
    try:
        data = json.loads(raw_message)
    except json.JSONDecodeError:
        logger.warning("Received non-JSON message, skipping")
        return

    if data.get("MessageType") != "PositionReport":
        return  # we subscribed with FilterMessageTypes, but double-check

    meta = data.get("MetaData", {})
    msg = data.get("Message", {}).get("PositionReport", {})

    mmsi = str(meta.get("MMSI", ""))
    ship_name = meta.get("ShipName", "").strip() or None
    lat = meta.get("Latitude")
    lon = meta.get("Longitude")
    sog = msg.get("Sog")
    cog = msg.get("Cog")
    ts_raw = meta.get("time_utc")

    if lat is None or lon is None or not mmsi:
        return

    try:
        ts = datetime.fromisoformat(ts_raw.replace("Z", "+00:00")) if ts_raw \
            else datetime.now(timezone.utc)
    except (ValueError, AttributeError):
        ts = datetime.now(timezone.utc)

    await _write_position(mmsi, ship_name, lat, lon, sog, cog, ts)


async def run_aisstream_client():
    """Long-running task: connect, subscribe, ingest, auto-reconnect."""
    subscribe_message = {
        "APIKey": settings.aisstream_api_key,
        "BoundingBoxes": [settings.aoi_bbox],
        "FilterMessageTypes": ["PositionReport"],
    }

    while True:
        try:
            async with websockets.connect(settings.aisstream_url) as ws:
                await ws.send(json.dumps(subscribe_message))
                logger.info("Connected to aisstream.io, subscribed to AOI %s",
                            settings.aoi_bbox)

                async for raw_message in ws:
                    await _handle_message(raw_message)

        except (websockets.ConnectionClosed, OSError) as e:
            logger.warning("aisstream.io connection lost (%s), reconnecting in 5s", e)
            await asyncio.sleep(5)
        except Exception:
            logger.exception("Unexpected error in aisstream client, reconnecting in 10s")
            await asyncio.sleep(10)
