"""Quick AIS connectivity test — run once to verify the API key works."""
import asyncio
import json
import sys
import os

os.chdir(os.path.dirname(os.path.abspath(__file__)))

API_KEY = "9b28e5453b565b57bb794ef118e2ff16aa259638"
WS_URL = "wss://stream.aisstream.io/v0/stream"

BOXES = [
    ("Global",           [[[-90, -180], [90, 180]]]),
    ("Indian Ocean",     [[[-15,  30], [35, 105]]]),
    ("Arabian Sea wide", [[[  5,  55], [30,  80]]]),
]


async def probe(name, bbox):
    import websockets
    msg = json.dumps({
        "APIKey": API_KEY,
        "BoundingBoxes": bbox,
        "FilterMessageTypes": ["PositionReport"],
    })
    try:
        async with websockets.connect(WS_URL, open_timeout=10) as ws:
            await ws.send(msg)
            hits = []
            for _ in range(15):
                try:
                    raw = await asyncio.wait_for(ws.recv(), timeout=5)
                    d = json.loads(raw)
                    if d.get("MessageType") == "PositionReport":
                        meta = d.get("MetaData", {})
                        hits.append({
                            "mmsi": meta.get("MMSI"),
                            "lat":  meta.get("Latitude"),
                            "lon":  meta.get("Longitude"),
                            "name": meta.get("ShipName", "").strip(),
                        })
                except asyncio.TimeoutError:
                    break
            return hits
    except Exception as e:
        return f"ERROR: {e}"


async def main():
    for name, bbox in BOXES:
        print(f"\n--- Testing box: {name} {bbox} ---")
        result = await probe(name, bbox)
        if isinstance(result, str):
            print(result)
        else:
            print(f"Got {len(result)} AIS messages")
            for v in result[:5]:
                print(f"  MMSI={v['mmsi']}  lat={v['lat']}  lon={v['lon']}  name={v['name']!r}")
            if result:
                print("\n==> USE THIS BOX")
                break


asyncio.run(main())
