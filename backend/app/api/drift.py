"""
Drift prediction API — hindcast and forecast oil slick movement.
"""

import asyncio
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.ml.drift_prediction import drift_predictor
from app.db.session import get_db
from app.db.json_store import JSONStore
from app.models.vessel_position import TABLE as VESSEL_TABLE

logger = logging.getLogger("drift_api")
router = APIRouter(prefix="/drift", tags=["drift"])


class DriftRequest(BaseModel):
    latitude: float
    longitude: float
    timestamp: str | None = None
    hindcast_hours: float = 48.0
    forecast_hours: float = 24.0


class DriftPoint(BaseModel):
    lat: float
    lon: float
    time: str


class DriftResponse(BaseModel):
    spill_lat: float
    spill_lon: float
    spill_time: str
    origin_lat: float
    origin_lon: float
    origin_time: str
    hindcast_confidence: float
    hindcast_trajectory: list[DriftPoint]
    forecast_lat: float
    forecast_lon: float
    forecast_time: str
    forecast_confidence: float
    forecast_trajectory: list[DriftPoint]
    drift_direction_deg: float
    drift_speed_knots: float
    total_drift_km: float
    spread_area_km2: float
    direction_from: str
    direction_to: str


def _compass_label(deg: float) -> str:
    directions = [
        "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
        "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"
    ]
    idx = int((deg + 11.25) / 22.5) % 16
    return directions[idx]


@router.post("/predict", response_model=DriftResponse)
async def predict_drift(request: DriftRequest, db: JSONStore = Depends(get_db)):
    """Predict oil slick drift direction and path."""

    if request.timestamp:
        try:
            spill_time = datetime.fromisoformat(request.timestamp.replace("Z", "+00:00"))
        except ValueError:
            raise HTTPException(400, "Invalid timestamp format")
    else:
        spill_time = datetime.now(timezone.utc)

    try:
        def _compute():
            origin = drift_predictor.hindcast(
                spill_lat=request.latitude,
                spill_lon=request.longitude,
                spill_time=spill_time,
                hours_back=request.hindcast_hours,
            )
            forecast = drift_predictor.forecast(
                spill_lat=request.latitude,
                spill_lon=request.longitude,
                spill_time=spill_time,
                hours_forward=request.forecast_hours,
            )
            return origin, forecast

        origin, forecast = await asyncio.to_thread(_compute)
    except Exception as e:
        logger.exception("Drift computation failed")
        raise HTTPException(500, f"Drift computation failed: {e}")

    total_hours = max(request.hindcast_hours, 1)
    drift_speed_ms = origin.drift_distance_km * 1000 / (total_hours * 3600)
    drift_speed_knots = drift_speed_ms / 0.5144

    origin_bearing = drift_predictor._calculate_bearing(
        origin.origin_lat, origin.origin_lon,
        request.latitude, request.longitude
    )
    forecast_bearing = drift_predictor._calculate_bearing(
        request.latitude, request.longitude,
        forecast.origin_lat, forecast.origin_lon
    )

    hindcast_trajectory = [
        DriftPoint(lat=round(p["lat"], 4), lon=round(p["lon"], 4), time=str(p["time"]))
        for p in origin.trajectory
    ]
    forecast_trajectory = [
        DriftPoint(lat=round(p["lat"], 4), lon=round(p["lon"], 4), time=str(p["time"]))
        for p in forecast.trajectory
    ]

    return DriftResponse(
        spill_lat=request.latitude,
        spill_lon=request.longitude,
        spill_time=str(spill_time),
        origin_lat=round(origin.origin_lat, 4),
        origin_lon=round(origin.origin_lon, 4),
        origin_time=str(origin.origin_time),
        hindcast_confidence=round(origin.confidence, 2),
        hindcast_trajectory=hindcast_trajectory,
        forecast_lat=round(forecast.origin_lat, 4),
        forecast_lon=round(forecast.origin_lon, 4),
        forecast_time=str(forecast.origin_time),
        forecast_confidence=round(forecast.confidence, 2),
        forecast_trajectory=forecast_trajectory,
        drift_direction_deg=round(origin_bearing, 1),
        drift_speed_knots=round(drift_speed_knots, 2),
        total_drift_km=round(origin.drift_distance_km, 2),
        spread_area_km2=origin.spread_area_km2,
        direction_from=_compass_label((origin_bearing + 180) % 360),
        direction_to=_compass_label(forecast_bearing),
    )


@router.get("/vessels-near-spill")
async def get_vessels_near_spill(
    lat: float, lon: float,
    radius_km: float = 50.0,
    hours: float = 24.0,
    db: JSONStore = Depends(get_db),
):
    from datetime import timedelta
    now = datetime.now(timezone.utc)
    window_start = now - timedelta(hours=hours)

    rows = await db.query_within_radius(
        VESSEL_TABLE, lat, lon, radius_km,
        window_start=window_start, window_end=now,
        timestamp_field="timestamp",
    )

    vessels = {}
    for r in rows:
        mmsi = r["mmsi"]
        if mmsi not in vessels or r["_distance_km"] < vessels[mmsi]["distance_km"]:
            vessels[mmsi] = {
                "mmsi": mmsi,
                "ship_name": r.get("ship_name", "Unknown"),
                "vessel_type": r.get("type", "Unknown"),
                "latitude": r["latitude"],
                "longitude": r["longitude"],
                "speed": r.get("speed", 0),
                "course": r.get("course", 0),
                "distance_km": round(r["_distance_km"], 2),
                "timestamp": str(r.get("timestamp", "")),
                "suspicious": r.get("suspicious", False),
                "anomaly_score": r.get("anomaly_score", 0),
            }

    return sorted(vessels.values(), key=lambda x: x["distance_km"])
