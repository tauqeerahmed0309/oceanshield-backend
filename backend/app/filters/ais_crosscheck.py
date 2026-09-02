"""
Layer 4: AIS cross-check — the core differentiator.

A confirmed SAR dark patch with a nearby AIS anomaly is very likely real
oil. A dark patch with NO suspicious vessel activity nearby at all is
very likely a natural look-alike. This correlation is what no competing
system (CleanSeaNet included) automates end-to-end.
"""

from datetime import datetime, timedelta

from app.config import settings
from app.db.json_store import JSONStore
from app.models.ais_anomaly import TABLE as AIS_ANOMALY_TABLE


async def find_nearby_ais_anomalies(
    db: JSONStore, lat: float, lon: float, timestamp: datetime,
    radius_km: float | None = None, window_hours: float | None = None,
) -> list[dict]:
    radius_km = radius_km or settings.ais_correlation_radius_km
    window_hours = window_hours or settings.ais_correlation_window_hours

    window_start = timestamp - timedelta(hours=window_hours)
    window_end = timestamp + timedelta(hours=window_hours)

    rows = await db.query_within_radius(
        AIS_ANOMALY_TABLE, lat, lon, radius_km,
        window_start=window_start, window_end=window_end,
        timestamp_field="detected_at",
    )
    rows.sort(key=lambda r: r["anomaly_score"], reverse=True)
    return rows


def apply_ais_correlation(nearby_anomalies: list[dict]) -> dict:
    if nearby_anomalies:
        best_score = max(a["anomaly_score"] for a in nearby_anomalies)
        boost = 1.0 + min(best_score, 1.0)  # up to 2x
    else:
        boost = 0.4  # no suspicious vessel nearby -> likely natural look-alike

    return {"nearby_anomalies": nearby_anomalies, "boost": boost}
