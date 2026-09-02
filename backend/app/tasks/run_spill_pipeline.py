"""
Scheduled job: auto-generate spill candidates and incidents from live
AIS anomalies.

Pipeline per tick
-----------------
1. Read AIS anomalies written since the last run.
2. For each NEW anomaly with score ≥ SPILL_ANOMALY_THRESHOLD:
   a. Skip if a spill candidate already exists near this position
      (dedup by 5 km radius + 2-hour window).
   b. Build a synthetic spill candidate.  Because we have no real SAR
      image at this point, the U-Net confidence is approximated from the
      anomaly score and a wind-filter pass at the vessel's location.
   c. Compute composite score via the same risk_scoring formula used by
      the upload endpoint.
   d. Insert the spill_candidate record.
3. For every spill candidate whose final_score ≥ CONFIRM_THRESHOLD and
   which has no incident yet:
   a. Rank nearby vessels for attribution.
   b. Insert an incident record.
   c. Send the ICG alert (mock in prototype).

Constants
---------
SPILL_ANOMALY_THRESHOLD  : minimum anomaly_score before we treat a vessel
                           as "potentially discharging".  Set deliberately
                           low (0.55) so we catch marginal cases — the
                           composite score filter weeds them out later.
CONFIRM_THRESHOLD        : settings.confirm_score_threshold (default 0.7).
DEDUP_RADIUS_KM          : prevent duplicate candidates for the same event.
DEDUP_WINDOW_HOURS       : look-back window for the dedup check.
"""

import asyncio
import logging
import math
from datetime import datetime, timedelta, timezone

from app.config import settings
from app.db.session import store
from app.db.json_store import haversine_km
from app.models.ais_anomaly import TABLE as ANOMALY_TABLE
from app.models.spill_candidate import TABLE as SPILL_TABLE
from app.models.incident import TABLE as INCIDENT_TABLE
from app.filters.wind_filter import apply_wind_filter
from app.filters.spatial_context import apply_spatial_context
from app.filters.ais_crosscheck import apply_ais_correlation
from app.processing.risk_scoring import compute_final_score
from app.processing.correlation_engine import rank_candidate_vessels
from app.alerting.icg_notifier import notify_and_gate_incident

logger = logging.getLogger("run_spill_pipeline")

SPILL_ANOMALY_THRESHOLD = 0.55   # anomaly score → candidate
DEDUP_RADIUS_KM         = 5.0
DEDUP_WINDOW_HOURS      = 2.0
CANDIDATES_PER_TICK     = 5      # max new candidates created per scheduler run


# ── Helpers ────────────────────────────────────────────────────────────────────

def _ensure_dt(value) -> datetime:
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if isinstance(value, str):
        try:
            dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
            return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
        except ValueError:
            pass
    return datetime.now(timezone.utc)


def _region_name(lat: float, lon: float) -> str:
    """Comprehensive region label for Indian maritime zones."""
    if 22.0 <= lat <= 23.5 and 68.0 <= lon <= 72.0:
        return "Kutch - Gujarat Coast"
    if 20.0 <= lat <= 22.0 and 68.0 <= lon <= 73.0:
        return "Gulf of Khambhat - Alang"
    if 19.0 <= lat <= 20.5 and 72.0 <= lon <= 73.5:
        return "Mumbai High - Offshore"
    if 18.5 <= lat <= 19.5 and 72.5 <= lon <= 73.5:
        return "Mumbai Harbor Approach"
    if 15.5 <= lat <= 17.5 and 73.0 <= lon <= 74.5:
        return "Goa Coast - Mormugao"
    if 14.0 <= lat <= 16.0 and 73.5 <= lon <= 75.0:
        return "Karwar - Netrani Islands"
    if 10.0 <= lat <= 14.0 and 72.0 <= lon <= 76.0:
        return "Malabar Coast - Kerala"
    if 8.0 <= lat <= 12.0 and 73.0 <= lon <= 78.0:
        return "Lakshadweep Sea"
    if 19.0 <= lat <= 22.0 and 86.0 <= lon <= 92.0:
        return "Paradip - Odisha Coast"
    if 16.0 <= lat <= 19.0 and 82.0 <= lon <= 86.0:
        return "Visakhapatnam - AP Coast"
    if 13.0 <= lat <= 16.0 and 80.0 <= lon <= 83.0:
        return "Chennai - Coromandel Coast"
    if 10.0 <= lat <= 13.0 and 79.5 <= lon <= 81.0:
        return "Palk Bay - Rameswaram"
    if 8.0 <= lat <= 10.0 and 77.5 <= lon <= 80.0:
        return "Gulf of Mannar"
    if 5.0 <= lat <= 10.0 and 68.0 <= lon <= 77.0:
        return "Arabian Sea - Offshore India"
    if 5.0 <= lat <= 10.0 and 80.0 <= lon <= 95.0:
        return "Bay of Bengal - Offshore India"
    if 6.0 <= lat <= 14.0 and 92.0 <= lon <= 94.5:
        return "Andaman & Nicobar Islands"
    if 0.0 <= lat <= 8.0 and 72.0 <= lon <= 80.0:
        return "Indian Ocean - South of Kerala"
    return f"Indian Waters - {lat:.1f}°N, {lon:.1f}°E"


def _severity(score: float) -> str:
    if score >= 0.85: return "CRITICAL"
    if score >= 0.70: return "HIGH"
    if score >= 0.50: return "MEDIUM"
    return "LOW"


def _anomaly_type_label(anomaly_type: str) -> str:
    return {
        "speed_deviation":  "Speed deviation from expected route",
        "course_deviation": "Unexpected course deviation",
        "dark_gap":         "Unannounced AIS gap (dark period)",
        "loitering":        "Unscheduled loitering in shipping lane",
        "route_deviation":  "Route deviation from corridor",
    }.get(anomaly_type, anomaly_type.replace("_", " ").title())


def _build_candidate_score(anomaly_score: float, lat: float, lon: float,
                            ts: datetime, nearby_anomalies: list[dict]) -> dict:
    """
    Build a composite spill score WITHOUT a real SAR image.
    wind_filter is called synchronously here because _build_candidate_score
    is always called via asyncio.to_thread (see run_spill_pipeline_job).
    """
    wind = apply_wind_filter(lat, lon, ts)
    spatial = apply_spatial_context(
        30.0,   # conservative open-water assumption (no coastline GDF available)
        False,
    )
    combined_weight = wind["weight"] * spatial["weight"]

    # This anomaly itself counts as the AIS correlation
    ais = apply_ais_correlation(nearby_anomalies if nearby_anomalies else [
        {"anomaly_score": anomaly_score}   # the triggering anomaly
    ])

    return compute_final_score(
        unet_confidence=anomaly_score,
        lookalike_prob=0.70,
        spatial_weight=combined_weight,
        ais_boost=ais["boost"],
        persistence_penalty=1.0,
    ) | {
        "wind":      wind,
        "spatial":   spatial,
        "ais_boost": ais["boost"],
        "wind_speed_ms": wind.get("wind_speed_ms", 6.0),
    }


# ── Main job ───────────────────────────────────────────────────────────────────

async def run_spill_pipeline_job():
    now = datetime.now(timezone.utc)
    # Look back 2× the anomaly window so we never miss a just-written anomaly
    lookback = timedelta(minutes=max(settings.anomaly_window_minutes * 2, 5))
    since = now - lookback

    # ── Step 1: fetch new high-score anomalies ────────────────────────────
    anomalies = await store.query(
        ANOMALY_TABLE,
        predicate=lambda r: (
            float(r.get("anomaly_score", 0)) >= SPILL_ANOMALY_THRESHOLD
            and _ensure_dt(r.get("detected_at", now)) >= since
        ),
        order_by="detected_at",
    )

    if not anomalies:
        logger.debug("Spill pipeline: no qualifying anomalies this tick.")
        # Still run step 3 so older unprocessed candidates get incidents
    else:
        logger.info("Spill pipeline: %d anomalies above threshold.", len(anomalies))

    # ── Step 2: create spill candidates from anomalies ────────────────────
    existing_candidates = await store.all(SPILL_TABLE)
    created = 0

    for anomaly in anomalies:
        if created >= CANDIDATES_PER_TICK:
            logger.debug("Spill pipeline: reached %d candidate cap for this tick.", CANDIDATES_PER_TICK)
            break
        lat = float(anomaly.get("latitude", 0))
        lon = float(anomaly.get("longitude", 0))
        ts  = _ensure_dt(anomaly.get("detected_at", now))
        score = float(anomaly.get("anomaly_score", 0))
        mmsi  = str(anomaly.get("mmsi", ""))

        # Dedup: skip if a candidate already exists within 5 km / 2 hours
        too_close = False
        for c in existing_candidates:
            c_ts = _ensure_dt(c.get("detected_at", now))
            if abs((c_ts - ts).total_seconds()) > DEDUP_WINDOW_HOURS * 3600:
                continue
            if haversine_km(lat, lon,
                            float(c.get("centroid_lat", 0)),
                            float(c.get("centroid_lon", 0))) < DEDUP_RADIUS_KM:
                too_close = True
                break

        if too_close:
            logger.debug(
                "Spill pipeline: skipping anomaly mmsi=%s (duplicate within %dkm/%dh)",
                mmsi, DEDUP_RADIUS_KM, DEDUP_WINDOW_HOURS,
            )
            continue

        # Build composite score — runs in a thread so blocking wind API
        # calls don't starve the FastAPI event loop
        nearby = await store.query_within_radius(
            ANOMALY_TABLE, lat, lon, DEDUP_RADIUS_KM,
            window_start=ts - timedelta(hours=DEDUP_WINDOW_HOURS),
            window_end=ts + timedelta(hours=DEDUP_WINDOW_HOURS),
            timestamp_field="detected_at",
        )
        scoring = await asyncio.to_thread(
            _build_candidate_score, score, lat, lon, ts, nearby
        )

        region = _region_name(lat, lon)
        anomaly_label = _anomaly_type_label(anomaly.get("anomaly_type", ""))

        candidate = await store.insert(SPILL_TABLE, {
            "sar_scene_id":       None,       # no SAR image — AIS-derived candidate
            "centroid_lat":       lat,
            "centroid_lon":       lon,
            "unet_confidence":    score,       # proxy
            "wind_speed_ms":      scoring["wind_speed_ms"],
            "lookalike_prob":     0.70,
            "spatial_weight":     scoring["spatial"]["weight"],
            "ais_boost":          scoring["ais_boost"],
            "persistence_penalty": 1.0,
            "final_score":        scoring["final_score"],
            "verdict":            scoring["verdict"],
            "filter_breakdown": {
                "source":         "ais_anomaly",
                "anomaly_type":   anomaly.get("anomaly_type"),
                "anomaly_score":  score,
                "wind":           scoring["wind"],
                "spatial":        scoring["spatial"],
            },
            "attributed_mmsi":    mmsi,
            "detected_at":        ts,
            # Enrichment fields the frontend uses
            "regionName":         region,
            "confidencePct":      round(scoring["final_score"] * 100, 1),
            "areaSqKm":           round(scoring["final_score"] * 12, 2),
            "windSpeedKts":       round(scoring["wind_speed_ms"] * 1.94384, 1),
            "_title": (
                f"{_severity(scoring['final_score'])} Risk Discharge — "
                f"{region}"
            ),
            "_sensor_source":     "AIS Anomaly Correlation (no SAR image)",
            "_area_sq_km":        round(scoring["final_score"] * 12, 2),
            "_evidence_count":    len(nearby) + 1,
            "_anomaly_label":     anomaly_label,
        })

        # Keep the in-memory dedup list current so later iterations in
        # this same tick don't create a second candidate for the same event.
        existing_candidates.append(candidate)
        created += 1

        logger.info(
            "Spill candidate created: id=%s mmsi=%s score=%.3f verdict=%s region=%s",
            candidate["id"], mmsi,
            scoring["final_score"], scoring["verdict"], region,
        )

    # ── Step 3: promote confirmed candidates to incidents ─────────────────
    # Find candidates that are "confirmed" but have no incident yet.
    all_incidents = await store.all(INCIDENT_TABLE)
    incident_candidate_ids = {
        r.get("spill_candidate_id") for r in all_incidents
    }

    confirmed_candidates = await store.query(
        SPILL_TABLE,
        predicate=lambda r: (
            r.get("verdict") == "confirmed"
            and r.get("id") not in incident_candidate_ids
        ),
    )

    for candidate in confirmed_candidates:
        lat = float(candidate.get("centroid_lat", 0))
        lon = float(candidate.get("centroid_lon", 0))
        ts  = _ensure_dt(candidate.get("detected_at", now))

        # Attribution: rank nearby vessels
        ranked = await rank_candidate_vessels(store, lat, lon, ts,
                                              radius_km=10.0, window_hours=12.0)
        top = ranked[0] if ranked else None

        # Pull attributed mmsi from candidate if no nearby vessel found
        attr_mmsi = (top["mmsi"] if top
                     else candidate.get("attributed_mmsi"))
        attr_conf  = (top["attribution_confidence"] if top else 60.0)

        final_score = float(candidate.get("final_score", 0.5))
        region      = candidate.get("regionName") or _region_name(lat, lon)

        incident = await store.insert(INCIDENT_TABLE, {
            "spill_candidate_id":      candidate["id"],
            "latitude":                lat,
            "longitude":               lon,
            "risk_score":              final_score,
            "attributed_mmsi":         attr_mmsi,
            "attributed_vessel_name":  None,   # filled in by attribution view
            "attribution_confidence":  attr_conf,
            "status":                  "confirmed_pending_notification",
            "icg_notified_at":         None,
            "icg_acknowledged_at":     None,
            "public_released_at":      None,
            "created_at":              now,
            "_title": (
                candidate.get("_title")
                or f"{_severity(final_score)} Oil Spill — {region}"
            ),
            "_sensor_source":          candidate.get("_sensor_source",
                                        "AIS Anomaly + Wind Correlation"),
            "_area_sq_km":             candidate.get("_area_sq_km",
                                        round(final_score * 12, 2)),
            "_evidence_count":         candidate.get("_evidence_count", 2),
        })

        # Send ICG alert (mock in prototype)
        incident = await notify_and_gate_incident(store, incident)

        logger.info(
            "Incident created: id=%s from candidate=%s score=%.3f mmsi=%s",
            incident["id"], candidate["id"], final_score, attr_mmsi,
        )

    total_confirmed = len(confirmed_candidates)
    if total_confirmed:
        logger.info("Spill pipeline: %d new incident(s) created this tick.", total_confirmed)
    else:
        logger.debug("Spill pipeline: no new incidents this tick.")
