"""
Records live aisstream.io messages to a JSON file for a set duration
(default 24h). Run this once ahead of time to build your fallback dataset:

    python scripts/record_ais_to_json.py --hours 24 --out data/ais_recording.json

Later, replay this file instead of connecting to aisstream.io — see
app/ingestion/ais_replay_client.py.
"""

import argparse
import asyncio
import json
from datetime import datetime, timezone

import websockets

from app.config import settings


async def record(duration_hours: float, out_path: str):
    subscribe_message = {
        "APIKey": settings.aisstream_api_key,
        "BoundingBoxes": [settings.aoi_bbox],
        "FilterMessageTypes": ["PositionReport"],
    }

    end_time = asyncio.get_event_loop().time() + duration_hours * 3600
    recorded = []

    async with websockets.connect(settings.aisstream_url) as ws:
        await ws.send(json.dumps(subscribe_message))
        print(f"Recording for {duration_hours}h into {out_path} ...")

        while asyncio.get_event_loop().time() < end_time:
            try:
                raw = await asyncio.wait_for(ws.recv(), timeout=30)
            except asyncio.TimeoutError:
                continue

            recorded.append({
                "received_at": datetime.now(timezone.utc).isoformat(),
                "raw_message": raw,
            })

            if len(recorded) % 100 == 0:
                print(f"  {len(recorded)} messages recorded so far...")

    with open(out_path, "w") as f:
        json.dump(recorded, f)

    print(f"Done. Saved {len(recorded)} messages to {out_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--hours", type=float, default=24.0)
    parser.add_argument("--out", type=str, default="data/ais_recording.json")
    args = parser.parse_args()

    asyncio.run(record(args.hours, args.out))
