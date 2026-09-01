"""
Fallback ingestion: replays a pre-recorded JSON file of AIS messages as
if they were arriving live. Use this when aisstream.io is unavailable,
rate-limited, or for guaranteed-reliable demo conditions.

Two playback modes:
  - "realtime": respects original message timing (1 day of data plays
                 back over 1 day — not useful for a demo, but accurate)
  - "accelerated": compresses the recording into a short window (e.g.
                    24h of data replayed over 2-5 minutes) — this is
                    what you want for a live demo

Uses the exact same _handle_message() logic as the live client, so
downstream processing (DB writes, anomaly detection) is identical
either way — only the source of messages changes.
"""

import asyncio
import json
import logging
from datetime import datetime

from app.ingestion.aisstream_client import _handle_message

logger = logging.getLogger("ais_replay_client")


def load_recording(path: str) -> list[dict]:
    with open(path, "r") as f:
        return json.load(f)


async def run_ais_replay(
    recording_path: str = "data/ais_recording.json",
    mode: str = "accelerated",
    accelerated_total_seconds: float = 180.0,  # replay whole file over 3 min
    loop: bool = True,
):
    """
    Long-running task — mirrors run_aisstream_client()'s role, but reads
    from a local JSON file instead of a WebSocket. Swap one for the other
    in app/main.py's startup event depending on whether live access works.
    """
    recording = load_recording(recording_path)
    if not recording:
        logger.warning("Recording file %s is empty, nothing to replay", recording_path)
        return

    logger.info("Replaying %d recorded AIS messages from %s (mode=%s)",
                len(recording), recording_path, mode)

    while True:
        if mode == "realtime":
            await _replay_realtime(recording)
        else:
            await _replay_accelerated(recording, accelerated_total_seconds)

        if not loop:
            break
        logger.info("Replay finished, looping again to keep the live feed populated")


async def _replay_accelerated(recording: list[dict], total_seconds: float):
    """Spreads all messages evenly across total_seconds, ignoring original gaps."""
    if len(recording) <= 1:
        delay = total_seconds
    else:
        delay = total_seconds / len(recording)

    for entry in recording:
        await _handle_message(entry["raw_message"])
        await asyncio.sleep(delay)


async def _replay_realtime(recording: list[dict]):
    """Respects original inter-message timing from when it was recorded."""
    prev_ts = None
    for entry in recording:
        ts = datetime.fromisoformat(entry["received_at"])
        if prev_ts is not None:
            gap = (ts - prev_ts).total_seconds()
            await asyncio.sleep(max(0, min(gap, 60)))  # cap gaps at 60s
        await _handle_message(entry["raw_message"])
        prev_ts = ts
