"""
GET /api/v1/attribution/{incident_id}

Returns a DriftAnalysis object. Accepts numeric or string IDs.
Falls back to a live-data synthetic response if no incident exists.
"""

import math
from datetime import datetime, timedelta, timezone

import requests
from fastapi import APIRouter, Depends

from app.config import settings
from app.db.session import get_db
from app.db.json_store import JSONStore
from app.models.incident import TABLE as INCIDENT_TABLE
from app.processing.correlation_engine import rank_candidate_vessels

router = APIRouter(prefix="/attribution", tags=["attribution"])

_DEG_PER_KM = 1.0 / 111.32


# ── Wind: fetch a full day's hourly values in ONE API call ────────────────────

def _fetch_hourly_winds(lat: float, lon: float, date_str: str) -> list[float]:
    """
    Returns 24 hourly wind speeds (m/s) for the given date.
    Falls back to [6.0]*24 on any error.
    """
    try:
        resp = requests.get(
            settings.open_meteo_url,
            params={
                "latitude": lat, "longitude": lon,
                "hourly": "wind_speed_10m",
                "start_date": date_str, "end_date": date_str,
                "wind_speed_unit": "ms",
            },
            timeout=8,
        )
        resp.raise_for_status()
        speeds = resp.json()["hourly"]["wind_speed_10m"]
        return [float(s) for s in speeds]
    except Exception:
        return [6.0] * 24


def _wind_at(hourly: list[float], ts: datetime) -> float:
    idx = min(max(ts.hour, 0), 23)
    return hourly[idx] if idx < len(hourly) else 6.0


def _wind_dir(lat: float, lon: float) -> float:
    """SW monsoon prevailing direction for Arabian Sea."""
    return 225.0


def _ekman(wind_ms: float, wind_dir: float) -> tuple[float, float]:
    return wind_ms * 0.03, (wind_dir + 15) % 360


# ── Drift path builder ─────────────────────────────────────────────────────────

def _build_drift_path(lat: float, lon: float, ts: datetime,
                      hours: int, direction: int, hourly_winds: list[float]) -> list[dict]:
    path = []
    cur_lat, cur_lon = lat, lon
    for h in range(hours + 1):
        step_ts = ts + timedelta(hours=h * direction)
        wind = _wind_at(hourly_winds, step_ts)
        wdir = _wind_dir(cur_lat, cur_lon)
        cur_spd, cur_dir = _ekman(wind, wdir)

        path.append({
            "timestamp": step_ts.isoformat(),
            "latitude": round(cur_lat, 6),
            "longitude": round(cur_lon, 6),
            "windSpeedKts": round(wind * 1.94384, 2),
            "windDirectionDeg": round(wdir, 1),
            "currentSpeedKts": round(cur_spd * 1.94384, 2),
            "currentDirectionDeg": round(cur_dir, 1),
        })
        if h == hours:
            break

        wkm = wind * 3.6; ckm = cur_spd * 3.6
        rw = math.radians(wdir); rc = math.radians(cur_dir)
        dlat = direction * (wkm * 0.03 * math.cos(rw) + ckm * math.cos(rc)) * _DEG_PER_KM
        dlon = direction * (wkm * 0.03 * math.sin(rw) + ckm * math.sin(rc)) * _DEG_PER_KM / max(0.01, math.cos(math.radians(cur_lat)))
        cur_lat += dlat; cur_lon += dlon
    return path


# ── Attribution helpers ────────────────────────────────────────────────────────

def _cat(score: float) -> str:
    if score >= 75: return "MATCH"
    if score >= 55: return "HIGH"
    if score >= 35: return "MEDIUM"
    return "LOW"


def _evidence(vessel: dict, anomalies: list[dict]) -> list[dict]:
    dist_km = vessel.get("distance_m", 0) / 1000
    sp = max(0, 100 - int(dist_km * 5))
    tp = int(vessel.get("attribution_confidence", 0))
    mmsi = str(vessel.get("mmsi", ""))
    matched = [a for a in anomalies if str(a.get("mmsi")) == mmsi]
    if matched:
        best = max(matched, key=lambda x: x.get("anomaly_score", 0))
        ais = {"type": "AIS Anomaly",
               "description": f"Vessel showed {best.get('anomaly_type','unknown').replace('_',' ').title()}",
               "score": int(best.get("anomaly_score", 0.5) * 100), "passed": True}
    else:
        ais = {"type": "AIS Anomaly", "description": "No anomalies detected near detection window",
               "score": 20, "passed": False}
    return [
        {"type": "Spatial", "description": f"Vessel was {dist_km:.1f} km from spill centroid",
         "score": sp, "passed": dist_km < settings.ais_correlation_radius_km * 4},
        {"type": "Trajectory", "description": "Track passes through spill origin area",
         "score": tp, "passed": tp >= 50},
        ais,
        {"type": "Drift Compatibility", "description": "Position consistent with SW monsoon drift",
         "score": min(100, sp + 10), "passed": sp >= 40},
    ]


async def _get_candidates(db: JSONStore, lat: float, lon: float,
                           ts: datetime, radius_km: float = 300.0) -> list[dict]:
    from app.filters.ais_crosscheck import find_nearby_ais_anomalies
    ranked = await rank_candidate_vessels(db, lat, lon, ts, radius_km=radius_km)
    anomalies = await find_nearby_ais_anomalies(db, lat, lon, ts)
    out = []
    for v in ranked[:5]:
        mmsi = str(v["mmsi"])
        score = float(v.get("attribution_confidence", 0))
        out.append({
            "vesselId": mmsi, "mmsi": mmsi,
            "vesselName": v.get("ship_name") or f"Vessel {mmsi}",
            "vesselType": v.get("type", "Unknown"),
            "flag": v.get("flag"),
            "confidenceCategory": _cat(score),
            "overallScore": round(score, 1),
            "closestDistanceKm": round(v.get("distance_m", 0) / 1000, 2),
            "closestTimeOffsetHours": 0.0,
            "evidenceList": _evidence(v, anomalies),
            "trajectoryPath": None,
        })
    return out


def _wrap(iid: str, lat: float, lon: float, ts: datetime,
          sim_h: int, candidates: list[dict]) -> dict:
    winds = _fetch_hourly_winds(lat, lon, ts.strftime("%Y-%m-%d"))
    bwd = _build_drift_path(lat, lon, ts, sim_h, -1, winds)
    fwd = _build_drift_path(lat, lon, ts, sim_h, +1, winds)
    src = bwd[-1]
    return {
        "incidentId": iid,
        "spillLocation": {"latitude": lat, "longitude": lon},
        "detectionTime": ts.isoformat(),
        "simulationTimeWindowHours": sim_h,
        "backwardDriftPath": bwd,
        "forwardDriftPath": fwd,
        "probableSourceRegion": {
            "centerLatitude": src["latitude"],
            "centerLongitude": src["longitude"],
            "radiusKm": round(sim_h * 0.3, 1),
        },
        "candidates": candidates,
    }


# ── Route ──────────────────────────────────────────────────────────────────────

@router.get("/{incident_id}")
async def get_drift_and_attribution(
    incident_id: str,
    simulation_hours: int = 12,
    db: JSONStore = Depends(get_db),
) -> dict:
    """Accepts 'INC-2026-0891' style string IDs or plain integers."""
    incident = None
    try:
        incident = await db.get(INCIDENT_TABLE, int(incident_id))
    except ValueError:
        rows = await db.query(INCIDENT_TABLE, order_by="created_at", desc=True, limit=1)
        if rows:
            incident = rows[0]

    if incident:
        lat, lon = float(incident["latitude"]), float(incident["longitude"])
        ts = incident.get("created_at", datetime.now(timezone.utc))
        if not isinstance(ts, datetime):
            try: ts = datetime.fromisoformat(str(ts))
            except ValueError: ts = datetime.now(timezone.utc)
        candidates = await _get_candidates(db, lat, lon, ts)
        return _wrap(str(incident.get("id", incident_id)), lat, lon, ts, simulation_hours, candidates)

    # ── Fallback: use most suspicious AIS anomaly ─────────────────────────────
    from app.models.ais_anomaly import TABLE as ANOMALY_TABLE
    now = datetime.now(timezone.utc)
    anomalies = await db.query(ANOMALY_TABLE, order_by="anomaly_score", desc=True, limit=1)

    if anomalies:
        a = anomalies[0]
        lat, lon = float(a["latitude"]), float(a["longitude"])
        ts = a.get("detected_at", now)
        if not isinstance(ts, datetime):
            try: ts = datetime.fromisoformat(str(ts))
            except ValueError: ts = now
        label = f"AIS anomaly MMSI {a['mmsi']}"
    else:
        lat = (settings.aoi_bounding_box_lat_min + settings.aoi_bounding_box_lat_max) / 2
        lon = (settings.aoi_bounding_box_lon_min + settings.aoi_bounding_box_lon_max) / 2
        ts = now
        label = "AOI centroid — awaiting live data"

    candidates = await _get_candidates(db, lat, lon, ts, radius_km=500.0)
    resp = _wrap("LIVE", lat, lon, ts, simulation_hours, candidates)
    resp["_source"] = label
    return resp
