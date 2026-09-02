"""
Scheduled job: re-scores a rolling window of recent AIS positions per
vessel and writes newly flagged anomalies. Run every ANOMALY_WINDOW_MINUTES
minutes (default: 1).

Reads from ais_history (append-only log) instead of vessel_positions
(upsert/latest-only) so there is always a sequence of positions to compute
features from.  vessel_positions is only used by the live map.

Fix summary vs the old version:
  1. Source table changed from VESSEL_TABLE → HISTORY_TABLE.
  2. window_start no longer multiplied by 30 (that was a typo that produced
     a 30-minute window from a 1-minute config value; now it is the plain
     configured value).
  3. Timestamp comparison is guarded — values that survived the JSON
     round-trip as strings are parsed before comparison.
  4. The IsolationForest bootstrap now waits for ≥ 10 feature rows (not
     just raw position rows) before fitting, and logs clearly when it skips.
  5. Duplicate anomaly guard: we skip writing a new anomaly for an MMSI if
     one already exists that was detected within the last window period, so
     the table doesn't flood with repeated entries for the same vessel.
"""

import asyncio
import logging
from datetime import datetime, timedelta, timezone

from app.db.session import store
from app.db.json_store import _lock_for, _load, _save
from app.models.ais_history import TABLE as HISTORY_TABLE
from app.models.ais_anomaly import TABLE as AIS_ANOMALY_TABLE
from app.models.vessel_position import TABLE as VESSEL_TABLE
from app.ml.anomaly_detector import AISAnomalyDetector, compute_features
from app.config import settings

logger = logging.getLogger("run_anomaly_detection")

_detector = AISAnomalyDetector()


def _dummy_corridor_distance(lat: float, lon: float) -> float:
    """
    Placeholder corridor-distance function.
    Replace with haversine against stored shipping-lane geometry in production.
    """
    return 0.0


# ── Severity mapping ───────────────────────────────────────────────────────────
_SEVERITY_MAP = {
    0.9: "CRITICAL",
    0.75: "HIGH",
    0.6: "MEDIUM",
    0.0: "LOW",
}

_ANOMALY_LABELS = {
    "speed_deviation": "Speed deviation from expected route",
    "course_deviation": "Unexpected course deviation",
    "dark_gap": "Unannounced AIS gap (dark period)",
    "loitering": "Unscheduled loitering in shipping lane",
    "route_deviation": "Route deviation from corridor",
}


async def _flag_vessel_suspicious(
    mmsi: str,
    anomaly_type: str,
    anomaly_score: float,
    lat: float,
    lon: float,
) -> None:
    """
    Update the vessel_positions record for *mmsi* with suspicious=True and
    the corresponding anomaly metadata so the frontend map/table highlights
    the vessel immediately.
    """
    async with _lock_for(VESSEL_TABLE):
        data = _load(VESSEL_TABLE)
        for r in data["records"]:
            if str(r.get("mmsi")) == mmsi:
                r["suspicious"] = True
                r["anomalyReason"] = _ANOMALY_LABELS.get(
                    anomaly_type, anomaly_type.replace("_", " ").title()
                )
                # Determine severity from score
                severity = "LOW"
                for threshold, label in sorted(_SEVERITY_MAP.items(), reverse=True):
                    if anomaly_score >= threshold:
                        severity = label
                        break
                r["anomalySeverity"] = severity
                _save(VESSEL_TABLE, data)
                logger.info(
                    "Vessel %s flagged suspicious: type=%s score=%.3f severity=%s",
                    mmsi, anomaly_type, anomaly_score, severity,
                )
                return
        # If vessel not found in positions table, skip silently
        logger.debug(
            "Vessel %s not in vessel_positions — cannot propagate suspicious flag.",
            mmsi,
        )


def _ensure_dt(value) -> datetime:
    """
    Return a timezone-aware datetime regardless of whether *value* arrived
    as a datetime object or as an ISO-format string (JSON round-trip).
    """
    if isinstance(value, datetime):
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value
    if isinstance(value, str):
        try:
            dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
        except ValueError:
            pass
    # fallback — treat as "now" so the row is always included in the window
    return datetime.now(timezone.utc)


async def run_anomaly_detection_job():
    now = datetime.now(timezone.utc)
    # Use a window of 2× the scheduler interval so consecutive runs overlap
    # and we never miss a vessel that transmitted between ticks.
    window_start = now - timedelta(minutes=max(settings.anomaly_window_minutes * 2, 5))

    # ── 1. Pull recent history rows ──────────────────────────────────────
    rows = await store.query(
        HISTORY_TABLE,
        predicate=lambda r: _ensure_dt(r.get("timestamp", now)) >= window_start,
        order_by="timestamp",
    )

    if not rows:
        logger.info("Anomaly detection: no history rows in window yet — skipping.")
        return

    # ── 2. Group by vessel ───────────────────────────────────────────────
    by_vessel: dict[str, list[dict]] = {}
    for r in rows:
        by_vessel.setdefault(r["mmsi"], []).append({
            "lat":       r["latitude"],
            "lon":       r["longitude"],
            "sog":       r.get("sog") or 0.0,
            "cog":       r.get("cog") or 0.0,
            "timestamp": _ensure_dt(r["timestamp"]),
        })

    # ── 3. Bootstrap-fit the model if not yet fitted ─────────────────────
    if not _detector._fitted:
        all_feature_rows = []
        for positions in by_vessel.values():
            mean_course = sum(p["cog"] for p in positions) / len(positions)
            all_feature_rows.extend(compute_features(
                positions,
                expected_speed=10.0,
                expected_course=mean_course,
                corridor_distance_fn=_dummy_corridor_distance,
            ))
        if len(all_feature_rows) >= 10:
            _detector.fit(all_feature_rows)
            logger.info("Anomaly model bootstrap-fitted on %d feature rows.",
                        len(all_feature_rows))
        else:
            logger.info(
                "Not enough feature rows to fit anomaly model yet "
                "(%d rows, need ≥10) — will retry next tick.",
                len(all_feature_rows),
            )
            return

    # ── 4. Load recent anomalies to avoid duplicate writes ───────────────
    dedup_window = now - timedelta(minutes=max(settings.anomaly_window_minutes * 2, 5))
    recent_anomalies = await store.query(
        AIS_ANOMALY_TABLE,
        predicate=lambda r: _ensure_dt(r.get("detected_at", now)) >= dedup_window,
    )
    already_flagged = {r["mmsi"] for r in recent_anomalies}

    # ── 5. Score each vessel and write new anomalies ─────────────────────
    flagged = 0
    for mmsi, positions in by_vessel.items():
        if len(positions) < 2:
            continue  # need at least 2 pings for a meaningful ping-gap feature

        if mmsi in already_flagged:
            continue  # already have a fresh anomaly for this vessel

        features = compute_features(
            positions,
            expected_speed=10.0,
            expected_course=sum(p["cog"] for p in positions) / len(positions),  # vessel's own mean course
            corridor_distance_fn=_dummy_corridor_distance,
        )

        if len(features) < 2:
            continue

        scores = _detector.score(features)

        # Use the max score across all pings (not just the latest) —
        # the anomalous moment may not be the final ping.
        latest_idx = len(positions) - 1
        latest_score = max(scores)

        if latest_score > 0.6:
            # Use the position corresponding to the highest-score ping
            peak_idx = scores.index(max(scores))
            anomaly_type = _detector.classify_anomaly_type(features[peak_idx])
            latest_pos = positions[peak_idx]

            await store.insert(AIS_ANOMALY_TABLE, {
                "mmsi":         mmsi,
                "latitude":     latest_pos["lat"],
                "longitude":    latest_pos["lon"],
                "anomaly_type": anomaly_type,
                "anomaly_score": round(latest_score, 4),
                "detected_at":  latest_pos["timestamp"],
            })

            # Propagate suspicious flag to vessel_positions
            await _flag_vessel_suspicious(
                mmsi, anomaly_type, latest_score,
                latest_pos["lat"], latest_pos["lon"],
            )

            flagged += 1
            logger.info("Anomaly flagged: mmsi=%s type=%s score=%.3f",
                        mmsi, anomaly_type, latest_score)

    logger.info(
        "Anomaly detection pass: %d vessels evaluated, %d newly flagged.",
        len(by_vessel), flagged,
    )

    # ── 6. Immediately trigger spill pipeline if new anomalies were written ──
    # This closes the latency gap — instead of waiting up to N minutes for
    # the next scheduler tick, the pipeline runs right away while the fresh
    # anomaly records are hot.  We schedule it as a background task so the
    # current job returns quickly without blocking the event loop.
    if flagged > 0:
        from app.tasks.run_spill_pipeline import run_spill_pipeline_job  # lazy import avoids circular dep
        asyncio.create_task(run_spill_pipeline_job())
        logger.info(
            "Spill pipeline triggered immediately (%d new anomaly/ies).", flagged
        )

        # ── 7. Prune seed records now that real data exists ───────────────
        # Seeds are tagged with _seeded:true at seed time.  Once at least
        # one real anomaly/spill/incident has been written we can safely
        # remove the static placeholders so the dashboard shows only live
        # data.  Runs in the background so it doesn't delay the current job.
        from app.db.session import prune_seeded_records
        asyncio.create_task(prune_seeded_records())
