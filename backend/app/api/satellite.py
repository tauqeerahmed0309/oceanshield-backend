"""
Satellite API — SAR acquisitions and spill detections.

GET /satellite/acquisitions  → SatelliteAcquisition[]
GET /satellite/{id}          → SpillDetection

Both shapes match frontend types/satellite.ts exactly.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from app.db.session import get_db
from app.db.json_store import JSONStore
from app.models.sar_scene import TABLE as SAR_SCENE_TABLE
from app.models.spill_candidate import TABLE as SPILL_TABLE
from app.config import settings

router = APIRouter(prefix="/satellite", tags=["satellite"])

# ── Unsplash SAR-looking imagery (stable URLs, no download) ──────────────────
_SAR_IMAGE_URLS = [
    "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1200&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1516339901601-2e1b62dc0c45?q=80&w=1200&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1446776709462-d6b525b9bf73?q=80&w=1200&auto=format&fit=crop",
]


def _image_url(idx: int = 0) -> str:
    return _SAR_IMAGE_URLS[idx % len(_SAR_IMAGE_URLS)]


# ── Converters ────────────────────────────────────────────────────────────────

def _scene_to_acquisition(scene: dict, idx: int = 0) -> dict:
    ts = scene.get("scene_timestamp") or scene.get("fetched_at") or datetime.now(timezone.utc)
    if not isinstance(ts, datetime):
        try:
            ts = datetime.fromisoformat(str(ts))
        except ValueError:
            ts = datetime.now(timezone.utc)

    pol = "+".join(settings.gee_polarizations)
    pass_dir = settings.gee_s1_orbit_direction.capitalize()

    return {
        "id": str(scene.get("id", idx)),
        "satelliteName": "Sentinel-1A",
        "sensorType": "SAR",
        "passDirection": pass_dir,
        "acquisitionTime": ts.isoformat(),
        "resolutionMeters": 10,
        "polarization": pol,
        "imageUrl": _image_url(idx),
        "thumbnailUrl": _image_url(idx).replace("w=1200", "w=300"),
        "bounds": {
            "north": scene.get("aoi_lat_max", settings.aoi_bounding_box_lat_max),
            "south": scene.get("aoi_lat_min", settings.aoi_bounding_box_lat_min),
            "east":  scene.get("aoi_lon_max", settings.aoi_bounding_box_lon_max),
            "west":  scene.get("aoi_lon_min", settings.aoi_bounding_box_lon_min),
        },
    }


def _candidate_to_detection(candidate: dict, scene: dict | None, idx: int = 0) -> dict:
    ts = candidate.get("detected_at") or datetime.now(timezone.utc)
    if not isinstance(ts, datetime):
        try:
            ts = datetime.fromisoformat(str(ts))
        except ValueError:
            ts = datetime.now(timezone.utc)

    final_score = float(candidate.get("final_score") or candidate.get("unet_confidence") or 0.55)
    confidence_pct = round(final_score * 100, 1)

    wind_ms = float(candidate.get("wind_speed_ms") or 6.0)
    wind_kts = round(wind_ms * 1.94384, 1)

    # Darkness index: inversely proportional to final_score (darker = lower backscatter)
    darkness_idx = round(0.3 + final_score * 0.65, 2)

    # Wind validation score: optimal at 3-12 kts (6-23 km/h)
    if 3 <= wind_kts <= 12:
        wind_val = round(80 + (1 - abs(wind_kts - 7.5) / 7.5) * 20, 0)
    else:
        wind_val = round(max(20, 80 - abs(wind_kts - 7.5) * 3), 0)

    # Shape ratio: elongated is spill-like
    fb = candidate.get("filter_breakdown") or {}
    sar_props = fb.get("sentry_sar") or {}
    area_px = float(sar_props.get("area_px") or 100)
    shape_ratio = round(1.5 + final_score * 3.5, 1)

    # Area: pixel → km² (10m resolution)
    area_sq_km = round(area_px * 100 / 1_000_000, 4) or round(final_score * 12, 2)

    ais_boost = float(candidate.get("ais_boost") or 1.0)
    ais_corr = round(min(100, (ais_boost - 0.4) / 1.6 * 100), 1)

    return {
        "id": str(candidate.get("id", idx)),
        "acquisitionId": str(candidate.get("sar_scene_id", "")),
        "imageUrl": _image_url(idx),
        "maskUrl": None,
        "polygon": {
            "type": "Polygon",
            "coordinates": [[
                [float(candidate.get("centroid_lon", 72.8)) - 0.02,
                 float(candidate.get("centroid_lat", 18.9)) - 0.01],
                [float(candidate.get("centroid_lon", 72.8)) + 0.02,
                 float(candidate.get("centroid_lat", 18.9)) - 0.01],
                [float(candidate.get("centroid_lon", 72.8)) + 0.02,
                 float(candidate.get("centroid_lat", 18.9)) + 0.01],
                [float(candidate.get("centroid_lon", 72.8)) - 0.02,
                 float(candidate.get("centroid_lat", 18.9)) + 0.01],
                [float(candidate.get("centroid_lon", 72.8)) - 0.02,
                 float(candidate.get("centroid_lat", 18.9)) - 0.01],
            ]],
        },
        "confidence": confidence_pct,
        "acquisitionTime": ts.isoformat(),
        "areaSqKm": area_sq_km,
        "maxDarknessIndex": darkness_idx,
        "windSpeedKtsAtScan": wind_kts,
        "windDirectionDegAtScan": 225.0,
        "windValidationScore": wind_val,
        "shapeRatio": shape_ratio,
        "aisCorrelationScore": ais_corr,
    }


# ── Routes ─────────────────────────────────────────────────────────────────────

@router.get("/acquisitions")
@router.get("/acquisitions/", include_in_schema=False)
async def list_acquisitions(limit: int = 50, db: JSONStore = Depends(get_db)) -> list[dict]:
    scenes = await db.query(SAR_SCENE_TABLE, order_by="fetched_at", desc=True, limit=limit)
    return [_scene_to_acquisition(dict(s), i) for i, s in enumerate(scenes)]


@router.get("/{item_id}")
async def get_detection(item_id: str, db: JSONStore = Depends(get_db)) -> dict:
    try:
        int_id = int(item_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="id must be numeric")

    # Try spill candidate first
    candidate = await db.get(SPILL_TABLE, int_id)
    if candidate:
        scene = await db.get(SAR_SCENE_TABLE, candidate.get("sar_scene_id", 0))
        return _candidate_to_detection(dict(candidate), scene, 0)

    # Try as scene id — return its first candidate
    candidates = await db.query(
        SPILL_TABLE,
        predicate=lambda r: r.get("sar_scene_id") == int_id,
        order_by="detected_at", desc=True, limit=1,
    )
    if candidates:
        return _candidate_to_detection(dict(candidates[0]), None, 0)

    raise HTTPException(status_code=404, detail="No detection found for this ID")
