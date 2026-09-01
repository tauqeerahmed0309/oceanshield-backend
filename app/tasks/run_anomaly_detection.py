"""
Scheduled job: re-scores a rolling window of recent AIS positions per
vessel and writes newly flagged anomalies. Run every 1-5 minutes.

Note: the Isolation Forest model should be pre-fitted on a batch of
historical "normal" traffic (see scripts/train_anomaly_model.py) — this
job only calls .score(), not .fit(), on each run.
"""

import logging
from datetime import datetime, timedelta, timezone

from app.db.session import store
from app.models.vessel_position import TABLE as VESSEL_TABLE
from app.models.ais_anomaly import TABLE as AIS_ANOMALY_TABLE
from app.ml.anomaly_detector import AISAnomalyDetector, compute_features
from app.config import settings

logger = logging.getLogger("run_anomaly_detection")

# In production, load a pre-fitted model from disk instead of a fresh instance.
_detector = AISAnomalyDetector()


def _dummy_corridor_distance(lat: float, lon: float) -> float:
    """
    Placeholder corridor-distance function. Replace with a real shipping-lane
    distance check (haversine against a stored lane geometry).
    """
    return 0.0


async def run_anomaly_detection_job():
    window_start = datetime.now(timezone.utc) - timedelta(
        minutes=settings.anomaly_window_minutes * 30  # look back further than one tick
    )

    rows = await store.query(
        VESSEL_TABLE,
        predicate=lambda r: r["timestamp"] >= window_start,
        order_by="timestamp",
    )

    by_vessel: dict[str, list[dict]] = {}
    for r in rows:
        by_vessel.setdefault(r["mmsi"], []).append({
            "lat": r["latitude"], "lon": r["longitude"],
            "sog": r["sog"], "cog": r["cog"], "timestamp": r["timestamp"],
        })

    if not _detector._fitted:
        # Bootstrap: fit on whatever's available if not fitted yet.
        # Replace with a properly pre-trained model in production.
        all_rows = []
        for positions in by_vessel.values():
            all_rows.extend(compute_features(
                positions, expected_speed=10.0, expected_course=180.0,
                corridor_distance_fn=_dummy_corridor_distance,
            ))
        if len(all_rows) >= 10:
            _detector.fit(all_rows)
        else:
            logger.info("Not enough data to fit anomaly model yet (%d rows)", len(all_rows))
            return

    flagged = 0
    for mmsi, positions in by_vessel.items():
        if len(positions) < 2:
            continue

        features = compute_features(
            positions, expected_speed=10.0, expected_course=180.0,
            corridor_distance_fn=_dummy_corridor_distance,
        )
        scores = _detector.score(features)

        latest_idx = len(positions) - 1
        latest_score = scores[latest_idx]

        if latest_score > 0.6:  # anomaly threshold
            anomaly_type = _detector.classify_anomaly_type(features[latest_idx])
            latest_pos = positions[latest_idx]

            await store.insert(AIS_ANOMALY_TABLE, {
                "mmsi": mmsi,
                "latitude": latest_pos["lat"],
                "longitude": latest_pos["lon"],
                "anomaly_type": anomaly_type,
                "anomaly_score": latest_score,
                "detected_at": latest_pos["timestamp"],
            })
            flagged += 1

    logger.info("Anomaly detection pass complete over %d vessels (%d flagged)",
                len(by_vessel), flagged)
