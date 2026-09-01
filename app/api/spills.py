"""
Handles both operating modes:
  - GET  /spills            -> list stored spill candidates (from live/auto pipeline)
  - POST /spills/analyze-image -> on-demand: upload a SAR image, run the full
                                   pipeline immediately, return the breakdown
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, UploadFile, File, Form

from app.db.session import get_db
from app.db.json_store import JSONStore
from app.models.spill_candidate import TABLE as SPILL_TABLE
from app.models.sar_scene import TABLE as SAR_SCENE_TABLE
from app.schemas.spill import SpillCandidateOut
from app.processing.sar_preprocessing import preprocess_sar_scene
from app.processing.correlation_engine import run_filter_pipeline
from app.filters.shape_texture import LookalikeClassifier
from app.ml.unet_segmentation import UNetSegmenter

router = APIRouter(prefix="/spills", tags=["spills"])

# Loaded once at import time; requires trained weights to exist.
_unet = UNetSegmenter()
_lookalike = LookalikeClassifier()


@router.get("/", response_model=list[SpillCandidateOut])
async def list_spill_candidates(limit: int = 50, db: JSONStore = Depends(get_db)):
    return await db.query(SPILL_TABLE, order_by="detected_at", desc=True, limit=limit)


@router.post("/analyze-image", response_model=SpillCandidateOut)
async def analyze_uploaded_image(
    file: UploadFile = File(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    db: JSONStore = Depends(get_db),
):
    """
    On-demand mode: user uploads a SAR image + coordinates. Runs the exact
    same pipeline as the automated live-trigger path (preprocess -> U-Net
    -> 5-layer filter -> composite score) and returns the full breakdown.
    """
    contents = await file.read()
    tmp_path = f"data/uploads/{file.filename}"
    with open(tmp_path, "wb") as f:
        f.write(contents)

    timestamp = datetime.now(timezone.utc)

    scene = await db.insert(SAR_SCENE_TABLE, {
        "scene_id": f"upload_{file.filename}_{timestamp.timestamp()}",
        "source": "upload",
        "file_path": tmp_path,
        "aoi_lat_min": latitude - 0.5, "aoi_lon_min": longitude - 0.5,
        "aoi_lat_max": latitude + 0.5, "aoi_lon_max": longitude + 0.5,
        "scene_timestamp": timestamp, "fetched_at": timestamp,
    })

    sar_image = preprocess_sar_scene(tmp_path)
    mask, prob_mask = _unet.predict(sar_image)
    unet_confidence = float(prob_mask[mask > 0].mean()) if mask.any() else 0.0

    breakdown = await run_filter_pipeline(
        db=db, mask=mask, sar_image=sar_image, unet_confidence=unet_confidence,
        lat=latitude, lon=longitude, timestamp=timestamp,
        lookalike_classifier=_lookalike,
        distance_to_coast_km=10.0,  # placeholder — wire to real coastline lookup
    )

    candidate = await db.insert(SPILL_TABLE, {
        "sar_scene_id": scene.id,
        "centroid_lat": latitude, "centroid_lon": longitude,
        "unet_confidence": unet_confidence,
        "wind_speed_ms": breakdown["wind"]["wind_speed_ms"],
        "lookalike_prob": breakdown["lookalike_prob"],
        "spatial_weight": breakdown["spatial_context"]["weight"],
        "ais_boost": breakdown["ais_crosscheck"]["boost"],
        "persistence_penalty": breakdown["persistence"]["penalty"],
        "final_score": breakdown["final_score"],
        "verdict": breakdown["verdict"],
        "filter_breakdown": breakdown,
        "detected_at": timestamp,
    })
    return candidate
