"""
AIS Supervisor — manages the live aisstream.io connection.

Key design decisions:
- NO pre-connection check. The free AISStream tier allows only ONE
  concurrent WebSocket connection. A "probe" connection would eat the
  slot and leave nothing for the real ingestion socket.
- Connects once, ingests forever, auto-reconnects on any drop.
- Falls back to JSON replay ONLY if a recording file exists.
- The mode attribute is exposed on /health for monitoring.
"""

import asyncio
import json
import logging
from pathlib import Path

import websockets

from app.config import settings
from app.ingestion.aisstream_client import _handle_message
from app.ingestion.ais_replay_client import load_recording

logger = logging.getLogger("ais_supervisor")

RECORDING_PATH = Path("data/ais_recording.json")
RECONNECT_DELAY   = 10   # seconds between reconnect attempts
REPLAY_INTERVAL   = 1    # seconds between replayed messages
LIVE_RECHECK_SECS = 120  # while replaying, attempt live reconnect every N seconds


class AISSupervisor:
    def __init__(self):
        self.mode = "unknown"
        self._stop = False

    async def run(self):
        """Entry point — runs forever."""
        while not self._stop:
            try:
                await self._run_live()
            except Exception:
                logger.exception("Live ingestion crashed — restarting in %ds", RECONNECT_DELAY)
            await asyncio.sleep(RECONNECT_DELAY)

    async def _run_live(self):
        """
        Open ONE WebSocket to aisstream.io and ingest messages until it drops.
        Does NOT pre-probe — saves the connection slot for real ingestion.
        """
        if not settings.aisstream_api_key:
            logger.warning("AISSTREAM_API_KEY not set — no live AIS data.")
            self.mode = "none"
            await self._run_replay()
            return

        subscribe = json.dumps({
            "APIKey": settings.aisstream_api_key,
            "BoundingBoxes": settings.aoi_all_bboxes,
            "FilterMessageTypes": ["PositionReport"],
        })

        logger.info("Connecting to aisstream.io …")

        try:
            async with websockets.connect(
                settings.aisstream_url,
                open_timeout=15,
                ping_interval=20,
                ping_timeout=10,
            ) as ws:
                await ws.send(subscribe)
                self.mode = "live"
                logger.info(
                    "AIS live feed active — subscribed to %d bounding box(es)",
                    len(settings.aoi_all_bboxes),
                )

                msg_count = 0
                async for raw in ws:
                    await _handle_message(raw)
                    msg_count += 1
                    if msg_count % 100 == 0:
                        logger.info("AIS: %d messages ingested", msg_count)

        except websockets.exceptions.ConnectionClosedOK:
            logger.info("AIS WebSocket closed cleanly — reconnecting in %ds", RECONNECT_DELAY)
        except websockets.exceptions.ConnectionClosedError as e:
            logger.warning("AIS connection closed with error (%s) — reconnecting", e)
        except OSError as e:
            logger.warning("AIS network error (%s) — reconnecting in %ds", e, RECONNECT_DELAY)
        except Exception:
            logger.exception("Unexpected AIS error — reconnecting in %ds", RECONNECT_DELAY)

        # Only fall back to replay if a recording exists
        if RECORDING_PATH.exists():
            self.mode = "replay"
            logger.info("Live feed ended — starting replay fallback")
            await self._run_replay_one_pass()

    async def _run_replay(self):
        """Replay loop used when no API key is configured."""
        if not RECORDING_PATH.exists():
            logger.warning("No AIS recording found at %s — no vessel data.", RECORDING_PATH)
            self.mode = "none"
            await asyncio.sleep(60)
            return

        self.mode = "replay"
        recording = load_recording(str(RECORDING_PATH))
        logger.info("Replay: %d recorded messages", len(recording))

        for entry in recording:
            await _handle_message(entry["raw_message"])
            await asyncio.sleep(REPLAY_INTERVAL)

    async def _run_replay_one_pass(self):
        """One pass through the recording, then return to attempt live again."""
        recording = load_recording(str(RECORDING_PATH))
        for entry in recording:
            await _handle_message(entry["raw_message"])
            await asyncio.sleep(REPLAY_INTERVAL)
