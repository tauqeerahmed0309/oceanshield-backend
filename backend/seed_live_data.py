"""
Seed all tables with Indian maritime data.
Run once: python seed_live_data.py
Re-running is safe - clears and re-seeds each table.
"""

import json
from datetime import datetime, timezone, timedelta
from pathlib import Path

DATA_DIR = Path("data/db")
DATA_DIR.mkdir(parents=True, exist_ok=True)


def _write(table, records):
    path = DATA_DIR / f"{table}.json"
    tagged = [{**r, "_seeded": True} for r in records]
    store = {"next_id": len(tagged) + 1, "records": tagged}
    with open(path, "w") as f:
        json.dump(store, f, indent=2, default=str)
    print(f"OK {table}: {len(tagged)} records -> {path}")


now = datetime.now(timezone.utc)

# SAR Scenes - Indian waters
sar_scenes = [
    {
        "id": 1, "scene_id": "S1A_IW_GRDH_1SDV_20260901T144512",
        "source": "copernicus", "file_path": "",
        "aoi_lat_min": 17.0, "aoi_lon_min": 71.5,
        "aoi_lat_max": 20.0, "aoi_lon_max": 74.0,
        "scene_timestamp": (now - timedelta(hours=4)).isoformat(),
        "fetched_at": (now - timedelta(hours=3)).isoformat(),
    },
    {
        "id": 2, "scene_id": "S1A_IW_GRDH_1SDV_20260830T144512",
        "source": "copernicus", "file_path": "",
        "aoi_lat_min": 12.5, "aoi_lon_min": 79.5,
        "aoi_lat_max": 14.5, "aoi_lon_max": 81.5,
        "scene_timestamp": (now - timedelta(days=1, hours=6)).isoformat(),
        "fetched_at": (now - timedelta(days=1, hours=5)).isoformat(),
    },
    {
        "id": 3, "scene_id": "S1B_IW_GRDH_1SDV_20260829T143800",
        "source": "copernicus", "file_path": "",
        "aoi_lat_min": 20.0, "aoi_lon_min": 85.5,
        "aoi_lat_max": 22.0, "aoi_lon_max": 87.5,
        "scene_timestamp": (now - timedelta(days=2, hours=8)).isoformat(),
        "fetched_at": (now - timedelta(days=2, hours=7)).isoformat(),
    },
]

# Vessel Positions - Indian ships
vessel_positions = [
    {
        "id": 1, "mmsi": "419001234", "ship_name": "MV DESH RAKSHAK",
        "imo": "IMO9438201", "callsign": "VTXA1", "flag": "India",
        "type": "Oil Tanker", "latitude": 18.89, "longitude": 72.84,
        "speed": 12.4, "course": 245, "sog": 12.4, "cog": 245,
        "timestamp": now.isoformat(), "status": "Underway Using Engine",
        "suspicious": True,
        "anomalyReason": "Sudden course deviation near Mumbai High",
        "anomalySeverity": "CRITICAL",
    },
    {
        "id": 2, "mmsi": "419005678", "ship_name": "MV BHARAT SAMUDRA",
        "imo": "IMO9124567", "callsign": "VTXB2", "flag": "India",
        "type": "Container Ship", "latitude": 18.98, "longitude": 72.75,
        "speed": 18.6, "course": 310, "sog": 18.6, "cog": 310,
        "timestamp": now.isoformat(), "status": "Underway Using Engine",
        "suspicious": False,
    },
    {
        "id": 3, "mmsi": "413889012", "ship_name": "MV GARUDA",
        "imo": "IMO9871234", "callsign": "VTWC3", "flag": "India",
        "type": "Crude Oil Tanker", "latitude": 18.81, "longitude": 72.68,
        "speed": 3.1, "course": 120, "sog": 3.1, "cog": 120,
        "timestamp": now.isoformat(), "status": "Restricted Maneuverability",
        "suspicious": True,
        "anomalyReason": "Unscheduled loitering - AIS gap >4h",
        "anomalySeverity": "HIGH",
    },
    {
        "id": 4, "mmsi": "352990123", "ship_name": "MT CHENNAI EXPRESS",
        "imo": "IMO9554321", "callsign": "VTYU4", "flag": "India",
        "type": "Product Tanker", "latitude": 13.08, "longitude": 80.30,
        "speed": 15.0, "course": 215, "sog": 15.0, "cog": 215,
        "timestamp": now.isoformat(), "status": "Underway Using Engine",
        "suspicious": False,
    },
    {
        "id": 5, "mmsi": "477123456", "ship_name": "MV NARMADA",
        "imo": "IMO9654321", "callsign": "VTRL5", "flag": "India",
        "type": "Bulk Carrier", "latitude": 21.15, "longitude": 72.20,
        "speed": 7.2, "course": 180, "sog": 7.2, "cog": 180,
        "timestamp": now.isoformat(), "status": "Underway Using Engine",
        "suspicious": True,
        "anomalyReason": "Speed drop from 14kn to 7kn - possible discharge",
        "anomalySeverity": "HIGH",
    },
    {
        "id": 6, "mmsi": "636092123", "ship_name": "MV GODAVARI",
        "imo": "IMO9223311", "callsign": "VTMP6", "flag": "India",
        "type": "LPG Carrier", "latitude": 19.35, "longitude": 72.42,
        "speed": 9.8, "course": 285, "sog": 9.8, "cog": 285,
        "timestamp": now.isoformat(), "status": "Underway Using Engine",
        "suspicious": False,
    },
    {
        "id": 7, "mmsi": "566112233", "ship_name": "MV KRISHNA VII",
        "imo": "IMO9112233", "callsign": "VTKR7", "flag": "India",
        "type": "Container Ship", "latitude": 16.80, "longitude": 74.50,
        "speed": 20.1, "course": 340, "sog": 20.1, "cog": 340,
        "timestamp": now.isoformat(), "status": "Underway Using Engine",
        "suspicious": False,
    },
    {
        "id": 8, "mmsi": "372445566", "ship_name": "MV TAPTI STAR",
        "imo": "IMO9334455", "callsign": "VTTI8", "flag": "India",
        "type": "Chemical Tanker", "latitude": 20.40, "longitude": 71.80,
        "speed": 11.5, "course": 160, "sog": 11.5, "cog": 160,
        "timestamp": now.isoformat(), "status": "Underway Using Engine",
        "suspicious": False,
    },
    {
        "id": 9, "mmsi": "419009999", "ship_name": "MV SAGARMALA",
        "imo": "IMO9765432", "callsign": "VTSM9", "flag": "India",
        "type": "RoRo Cargo", "latitude": 15.40, "longitude": 73.85,
        "speed": 16.3, "course": 320, "sog": 16.3, "cog": 320,
        "timestamp": now.isoformat(), "status": "Underway Using Engine",
        "suspicious": False,
    },
    {
        "id": 10, "mmsi": "419008888", "ship_name": "MV ANDAMAN FURY",
        "imo": "IMO9887654", "callsign": "VTAF0", "flag": "India",
        "type": "Passenger/RoRo", "latitude": 11.74, "longitude": 92.72,
        "speed": 14.2, "course": 150, "sog": 14.2, "cog": 150,
        "timestamp": now.isoformat(), "status": "Underway Using Engine",
        "suspicious": False,
    },
    {
        "id": 11, "mmsi": "419007777", "ship_name": "MV LAKSHADWEEP",
        "imo": "IMO9998765", "callsign": "VTLW1", "flag": "India",
        "type": "Supply Vessel", "latitude": 10.57, "longitude": 72.64,
        "speed": 8.5, "course": 200, "sog": 8.5, "cog": 200,
        "timestamp": now.isoformat(), "status": "Underway Using Engine",
        "suspicious": False,
    },
    {
        "id": 12, "mmsi": "419006666", "ship_name": "MT MANGALA",
        "imo": "IMO9543210", "callsign": "VTMG2", "flag": "India",
        "type": "Oil/Chemical Tanker", "latitude": 17.68, "longitude": 83.22,
        "speed": 11.8, "course": 270, "sog": 11.8, "cog": 270,
        "timestamp": now.isoformat(), "status": "Underway Using Engine",
        "suspicious": False,
    },
]

# AIS Anomalies - Indian waters
ais_anomalies = [
    {
        "id": 1, "mmsi": "419001234",
        "latitude": 18.89, "longitude": 72.84,
        "anomaly_type": "course_deviation", "anomaly_score": 0.92,
        "detected_at": (now - timedelta(hours=5)).isoformat(),
    },
    {
        "id": 2, "mmsi": "413889012",
        "latitude": 18.81, "longitude": 72.68,
        "anomaly_type": "loitering", "anomaly_score": 0.85,
        "detected_at": (now - timedelta(hours=3)).isoformat(),
    },
    {
        "id": 3, "mmsi": "477123456",
        "latitude": 21.15, "longitude": 72.20,
        "anomaly_type": "speed_deviation", "anomaly_score": 0.78,
        "detected_at": (now - timedelta(hours=7)).isoformat(),
    },
]

# Spill Candidates - Indian waters
spill_candidates = [
    {
        "id": 1, "sar_scene_id": 1,
        "centroid_lat": 18.89, "centroid_lon": 72.84,
        "unet_confidence": 0.94, "wind_speed_ms": 4.4,
        "lookalike_prob": 0.91, "spatial_weight": 1.0,
        "ais_boost": 1.92, "persistence_penalty": 1.0,
        "final_score": 0.94, "verdict": "confirmed",
        "filter_breakdown": {
            "source": "copernicus_sentinel1",
            "sentry_sar": {"area_px": 1480, "confidence": 0.94},
        },
        "detected_at": (now - timedelta(hours=4)).isoformat(),
        "regionName": "Mumbai Harbor Approach",
        "confidencePct": 94.0, "areaSqKm": 14.8, "windSpeedKts": 8.6,
    },
    {
        "id": 2, "sar_scene_id": 2,
        "centroid_lat": 13.08, "centroid_lon": 80.30,
        "unet_confidence": 0.78, "wind_speed_ms": 6.1,
        "lookalike_prob": 0.73, "spatial_weight": 0.95,
        "ais_boost": 1.45, "persistence_penalty": 1.0,
        "final_score": 0.78, "verdict": "confirmed",
        "filter_breakdown": {
            "source": "copernicus_sentinel1",
            "sentry_sar": {"area_px": 420, "confidence": 0.78},
        },
        "detected_at": (now - timedelta(days=1, hours=6)).isoformat(),
        "regionName": "Chennai - Coromandel Coast",
        "confidencePct": 78.0, "areaSqKm": 4.2, "windSpeedKts": 11.9,
    },
    {
        "id": 3, "sar_scene_id": 3,
        "centroid_lat": 20.28, "centroid_lon": 86.62,
        "unet_confidence": 0.62, "wind_speed_ms": 5.8,
        "lookalike_prob": 0.58, "spatial_weight": 0.90,
        "ais_boost": 1.60, "persistence_penalty": 1.0,
        "final_score": 0.62, "verdict": "unverified",
        "filter_breakdown": {
            "source": "copernicus_sentinel1",
            "sentry_sar": {"area_px": 110, "confidence": 0.62},
        },
        "detected_at": (now - timedelta(days=2, hours=8)).isoformat(),
        "regionName": "Paradip - Odisha Coast",
        "confidencePct": 62.0, "areaSqKm": 1.1, "windSpeedKts": 11.3,
    },
]

# Incidents - Indian waters
incidents = [
    {
        "id": 1, "spill_candidate_id": 1,
        "latitude": 18.89, "longitude": 72.84,
        "risk_score": 0.94,
        "attributed_mmsi": "419001234",
        "attributed_vessel_name": "MV DESH RAKSHAK",
        "attribution_confidence": 88.0,
        "status": "confirmed_public",
        "icg_notified_at": (now - timedelta(hours=3, minutes=30)).isoformat(),
        "icg_acknowledged_at": (now - timedelta(hours=3)).isoformat(),
        "public_released_at": (now - timedelta(hours=3)).isoformat(),
        "created_at": (now - timedelta(hours=4)).isoformat(),
        "_title": "Oil Slick Detected - Mumbai Harbor Approach",
        "_sensor_source": "Sentinel-1A SAR (C-band VV)",
        "_area_sq_km": 14.8, "_evidence_count": 5,
    },
    {
        "id": 2, "spill_candidate_id": 2,
        "latitude": 13.08, "longitude": 80.30,
        "risk_score": 0.78,
        "attributed_mmsi": "352990123",
        "attributed_vessel_name": "MT CHENNAI EXPRESS",
        "attribution_confidence": 62.0,
        "status": "confirmed_pending_notification",
        "icg_notified_at": (now - timedelta(days=1, hours=5)).isoformat(),
        "icg_acknowledged_at": None, "public_released_at": None,
        "created_at": (now - timedelta(days=1, hours=6)).isoformat(),
        "_title": "Linear Anomaly - Chennai Coast",
        "_sensor_source": "RADARSAT-Constellation (C-band)",
        "_area_sq_km": 4.2, "_evidence_count": 3,
    },
    {
        "id": 3, "spill_candidate_id": 3,
        "latitude": 20.28, "longitude": 86.62,
        "risk_score": 0.62,
        "attributed_mmsi": None, "attributed_vessel_name": None,
        "attribution_confidence": 45.0,
        "status": "confirmed_pending_notification",
        "icg_notified_at": None, "icg_acknowledged_at": None,
        "public_released_at": None,
        "created_at": (now - timedelta(days=2, hours=8)).isoformat(),
        "_title": "Minor Sheen - Paradip Port Approach",
        "_sensor_source": "Sentinel-1B SAR (C-band VV)",
        "_area_sq_km": 1.1, "_evidence_count": 2,
    },
]

# Write all tables
_write("sar_scenes", sar_scenes)
_write("vessel_positions", vessel_positions)
_write("ais_anomalies", ais_anomalies)
_write("spill_candidates", spill_candidates)
_write("incidents", incidents)

# Seed ais_history
import importlib.util as _ilu
_spec = _ilu.spec_from_file_location("seed_ais_history", Path(__file__).parent / "seed_ais_history.py")
_mod = _ilu.module_from_spec(_spec)
_spec.loader.exec_module(_mod)

print("\nAll tables seeded with Indian maritime data.")
print("  - 12 vessels (3 suspicious: DESH RAKSHAK, GARUDA, NARMADA)")
print("  - 3 incidents (Mumbai, Chennai, Paradip)")
print("  - 3 SAR scenes + 3 spill candidates")
print("  - 3 AIS anomalies")
print("  - ais_history ready for anomaly detection bootstrap")
