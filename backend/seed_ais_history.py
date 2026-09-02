"""
Seed ais_history with realistic positions for Indian vessels
so the anomaly detector can bootstrap-fit immediately on startup.

Each vessel gets 20 pings spread over the last 2 hours.
Suspicious vessels have injected anomalies.

Run standalone: python seed_ais_history.py
"""

import json
import math
import random
from datetime import datetime, timezone, timedelta
from pathlib import Path

DATA_DIR = Path("data/db")
DATA_DIR.mkdir(parents=True, exist_ok=True)

random.seed(42)

NOW = datetime.now(timezone.utc)
PINGS_PER_VESSEL = 20
WINDOW_MINUTES   = 120

# Indian vessels in Indian waters
VESSELS = [
    {"mmsi": "419001234", "lat": 18.92, "lon": 72.82, "sog": 12.4, "cog": 245, "suspicious": True},
    {"mmsi": "419005678", "lat": 18.98, "lon": 72.75, "sog": 18.6, "cog": 310, "suspicious": False},
    {"mmsi": "413889012", "lat": 18.81, "lon": 72.68, "sog":  3.1, "cog": 120, "suspicious": True},
    {"mmsi": "352990123", "lat": 13.08, "lon": 80.30, "sog": 15.0, "cog": 215, "suspicious": False},
    {"mmsi": "477123456", "lat": 21.15, "lon": 72.20, "sog":  7.2, "cog": 180, "suspicious": True},
    {"mmsi": "636092123", "lat": 19.35, "lon": 72.42, "sog":  9.8, "cog": 285, "suspicious": False},
    {"mmsi": "566112233", "lat": 16.80, "lon": 74.50, "sog": 20.1, "cog": 340, "suspicious": False},
    {"mmsi": "372445566", "lat": 20.40, "lon": 71.80, "sog": 11.5, "cog": 160, "suspicious": False},
    {"mmsi": "419009999", "lat": 15.40, "lon": 73.85, "sog": 16.3, "cog": 320, "suspicious": False},
    {"mmsi": "419008888", "lat": 11.74, "lon": 92.72, "sog": 14.2, "cog": 150, "suspicious": False},
    {"mmsi": "419007777", "lat": 10.57, "lon": 72.64, "sog":  8.5, "cog": 200, "suspicious": False},
    {"mmsi": "419006666", "lat": 17.68, "lon": 83.22, "sog": 11.8, "cog": 270, "suspicious": False},
    {"mmsi": "419004444", "lat": 13.22, "lon": 80.18, "sog": 13.5, "cog":  45, "suspicious": False},
    {"mmsi": "419003333", "lat": 20.28, "lon": 86.62, "sog": 10.2, "cog": 135, "suspicious": False},
    {"mmsi": "419002222", "lat":  9.28, "lon": 79.32, "sog":  5.4, "cog":  90, "suspicious": False},
    {"mmsi": "419001111", "lat":  9.05, "lon": 78.52, "sog":  7.8, "cog": 225, "suspicious": False},
]


def _step_position(lat, lon, cog_deg, sog_kn, dt_minutes):
    dist_km = sog_kn * 1.852 * (dt_minutes / 60.0)
    cog_rad = math.radians(cog_deg)
    d_lat = (dist_km / 111.0) * math.cos(cog_rad)
    d_lon = (dist_km / (111.0 * math.cos(math.radians(lat)))) * math.sin(cog_rad)
    return lat + d_lat, lon + d_lon


def _build_pings(vessel):
    interval = WINDOW_MINUTES / PINGS_PER_VESSEL
    pings = []
    lat = vessel["lat"]
    lon = vessel["lon"]
    sog = vessel["sog"]
    cog = vessel["cog"]

    for i in range(PINGS_PER_VESSEL):
        age_minutes = WINDOW_MINUTES - i * interval
        ts = NOW - timedelta(minutes=age_minutes)

        if vessel["suspicious"] and i == 8:
            cog = (cog + random.uniform(80, 140)) % 360
        if vessel["suspicious"] and i == 9:
            sog = max(0.5, sog * random.uniform(0.1, 0.3))

        pings.append({
            "mmsi":      vessel["mmsi"],
            "latitude":  round(lat, 6),
            "longitude": round(lon, 6),
            "sog":       round(sog + random.uniform(-0.5, 0.5), 2),
            "cog":       round((cog + random.uniform(-5, 5)) % 360, 1),
            "timestamp": ts.isoformat(),
        })

        lat, lon = _step_position(lat, lon, cog, sog, interval)
        if not vessel["suspicious"] or i < 7 or i > 10:
            cog = (cog + random.uniform(-3, 3)) % 360
            sog = max(0.0, sog + random.uniform(-0.3, 0.3))

    return pings


all_pings = []
for v in VESSELS:
    all_pings.extend(_build_pings(v))

all_pings.sort(key=lambda r: r["timestamp"])

for idx, ping in enumerate(all_pings, start=1):
    ping["id"] = idx

path = DATA_DIR / "ais_history.json"
store = {
    "next_id": len(all_pings) + 1,
    "records": all_pings,
}
with open(path, "w") as f:
    json.dump(store, f, indent=2)

print(f"OK ais_history: {len(all_pings)} records -> {path}")
print(f"  {len(VESSELS)} Indian vessels x {PINGS_PER_VESSEL} pings each")
print(f"  3 suspicious vessels with injected anomalies")
print(f"  All within Indian waters (68-95E, 0-24N)")
