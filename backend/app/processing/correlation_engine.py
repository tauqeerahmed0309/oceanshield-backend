"""
Correlation engine — orchestrates the full look-alike filter pipeline on
one U-Net candidate, then ranks candidate vessels for attribution.

This is the module that ties filters/*, ml/unet_segmentation.py, and
ml/anomaly_detector.py together into one flow.
"""

from datetime import datetime, timedelta

import numpy as np

from app.db.json_store import JSONStore
from app.models.vessel_position import TABLE as VESSEL_TABLE
from app.filters.wind_filter import apply_wind_filter
from app.filters.shape_texture import extract_shape_texture_features, LookalikeClassifier
from app.filters.spatial_context import apply_spatial_context
from app.filters.ais_crosscheck import find_nearby_ais_anomalies, apply_ais_correlation
from app.filters.persistence_check import apply_persistence_check
from app.processing.risk_scoring import compute_final_score


async def run_filter_pipeline(
    db: JSONStore,
    mask: np.ndarray,
    sar_image: np.ndarray,
    unet_confidence: float,
    lat: float,
    lon: float,
    timestamp: datetime,
    lookalike_classifier: LookalikeClassifier,
    distance_to_coast_km: float,
    in_known_bloom_zone: bool = False,
    previous_masks: list[np.ndarray] | None = None,
) -> dict:
    """Runs all 5 filter layers on one candidate and returns the full breakdown."""

    # Layer 1: wind
    wind_result = apply_wind_filter(lat, lon, timestamp)

    # Layer 2: shape/texture
    features = extract_shape_texture_features(mask, sar_image)
    lookalike_prob = lookalike_classifier.predict_proba_spill(
        features, wind_result["wind_speed_ms"]
    )

    # Layer 3: spatial context
    spatial_result = apply_spatial_context(distance_to_coast_km, in_known_bloom_zone)
    combined_spatial_weight = wind_result["weight"] * spatial_result["weight"]

    # Layer 4: AIS cross-check
    nearby_anomalies = await find_nearby_ais_anomalies(db, lat, lon, timestamp)
    ais_result = apply_ais_correlation(nearby_anomalies)

    # Layer 5: persistence check
    persistence_result = apply_persistence_check(mask, previous_masks or [])

    # Composite score
    score_result = compute_final_score(
        unet_confidence=unet_confidence,
        lookalike_prob=lookalike_prob,
        spatial_weight=combined_spatial_weight,
        ais_boost=ais_result["boost"],
        persistence_penalty=persistence_result["penalty"],
    )

    return {
        "wind": wind_result,
        "shape_texture_features": features,
        "lookalike_prob": lookalike_prob,
        "spatial_context": spatial_result,
        "ais_crosscheck": ais_result,
        "persistence": persistence_result,
        **score_result,
    }


async def rank_candidate_vessels(
    db: JSONStore, lat: float, lon: float, timestamp: datetime,
    radius_km: float = 10.0, window_hours: float = 12.0,
) -> list[dict]:
    """
    Ranks nearby vessels by trajectory proximity to a confirmed spill,
    producing an attribution percentage per vessel.
    """
    window_start = timestamp - timedelta(hours=window_hours)
    window_end = timestamp + timedelta(hours=window_hours)

    rows = await db.query_within_radius(
        VESSEL_TABLE, lat, lon, radius_km,
        window_start=window_start, window_end=window_end,
        timestamp_field="timestamp",
    )
    if not rows:
        return []

    # GROUP BY mmsi, MIN(distance) — same shape as the old SQL aggregate.
    min_dist_by_mmsi: dict[str, float] = {}
    for r in rows:
        mmsi = r["mmsi"]
        dist_m = r["_distance_km"] * 1000
        if mmsi not in min_dist_by_mmsi or dist_m < min_dist_by_mmsi[mmsi]:
            min_dist_by_mmsi[mmsi] = dist_m

    max_dist = max(min_dist_by_mmsi.values()) or 1.0
    ranked = []
    for mmsi, min_distance_m in min_dist_by_mmsi.items():
        proximity_score = 1.0 - (min_distance_m / max_dist)
        ranked.append({
            "mmsi": mmsi,
            "distance_m": min_distance_m,
            "attribution_confidence": round(proximity_score * 100, 1),
        })
    return sorted(ranked, key=lambda x: -x["attribution_confidence"])
