"""
Continuous supervisor for AIS ingestion.

Behavior:
  - Starts on LIVE if reachable, else starts on REPLAY immediately.
  - While on REPLAY, periodically re-checks if aisstream.io has come
    back — if so, switches back to LIVE automatically.
  - While on LIVE, if the connection drops/errors, switches to REPLAY
    immediately (no gap in data flowing to the pipeline).
  - Runs forever, alternating as needed, with no manual intervention.

This replaces app/ingestion/aisstream_client.run_aisstream_client() as
the thing main.py launches at startup — it now wraps both live and
replay, deciding which one should be running.
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
LIVE_RECHECK_INTERVAL_SECONDS = 60   # while on replay, retry live this often
REPLAY_MESSAGE_INTERVAL_SECONDS = 2  # pacing for replayed messages


class AISSupervisor:
    def __init__(self):
        self.mode = "unknown"  # "live" | "replay" | "none"
        self._stop = False

    async def run(self):
        while not self._stop:
            live_ok = await self._check_live_reachable()

            if live_ok:
                await self._run_live_until_failure()
            else:
                await self._run_replay_until_live_returns()

    async def _check_live_reachable(self, timeout_seconds: float = 8.0) -> bool:
        if not settings.aisstream_api_key:
            return False
        try:
            async with websockets.connect(settings.aisstream_url,
                                           open_timeout=timeout_seconds) as ws:
                await ws.send(json.dumps({
                    "APIKey": settings.aisstream_api_key,
                    "BoundingBoxes": [settings.aoi_bbox],
                    "FilterMessageTypes": ["PositionReport"],
                }))
                await asyncio.wait_for(ws.recv(), timeout=timeout_seconds)
                return True
        except Exception:
            return False

    async def _run_live_until_failure(self):
        """Stays connected to aisstream.io until it drops, then returns
        control to the supervisor loop (which will fall back to replay)."""
        self.mode = "live"
        logger.info("Switched to LIVE aisstream.io feed")

        subscribe_message = {
            "APIKey": settings.aisstream_api_key,
            "BoundingBoxes": [settings.aoi_bbox],
            "FilterMessageTypes": ["PositionReport"],
        }

        try:
            async with websockets.connect(settings.aisstream_url) as ws:
                await ws.send(json.dumps(subscribe_message))
                async for raw_message in ws:
                    await _handle_message(raw_message)
        except (websockets.ConnectionClosed, OSError):
            logger.warning("Live feed dropped — falling back to JSON replay")
        except Exception:
            logger.exception("Unexpected live-feed error — falling back to JSON replay")

    async def _run_replay_until_live_returns(self):
        """Replays the JSON recording on a loop, periodically checking in
        the background whether live access has come back."""
        self.mode = "replay"
        logger.info("Switched to JSON REPLAY fallback")

        if not RECORDING_PATH.exists():
            logger.error(
                "No fallback recording at %s — no AIS data will flow until "
                "either aisstream.io is reachable or a recording is created "
                "(scripts/record_ais_to_json.py). Retrying live in %ss.",
                RECORDING_PATH, LIVE_RECHECK_INTERVAL_SECONDS,
            )
            await asyncio.sleep(LIVE_RECHECK_INTERVAL_SECONDS)
            return

        recording = load_recording(str(RECORDING_PATH))
        if not recording:
            logger.error("Recording file %s is empty — retrying live in %ss.",
                          RECORDING_PATH, LIVE_RECHECK_INTERVAL_SECONDS)
            await asyncio.sleep(LIVE_RECHECK_INTERVAL_SECONDS)
            return

        idx = 0
        elapsed_since_check = 0.0

        while True:
            entry = recording[idx % len(recording)]
            await _handle_message(entry["raw_message"])
            idx += 1

            await asyncio.sleep(REPLAY_MESSAGE_INTERVAL_SECONDS)
            elapsed_since_check += REPLAY_MESSAGE_INTERVAL_SECONDS

            # Periodically check if live has come back; if so, hand control
            # back to the supervisor loop to reconnect live.
            if elapsed_since_check >= LIVE_RECHECK_INTERVAL_SECONDS:
                elapsed_since_check = 0.0
                if await self._check_live_reachable(timeout_seconds=5.0):
                    logger.info("aisstream.io is reachable again — switching back to LIVE")
                    return  # exits back to run(), which will re-check and go live


async def run_ais_supervisor():
    """Entry point — launch this once from app/main.py's startup event."""
    supervisor = AISSupervisor()
    await supervisor.run()
