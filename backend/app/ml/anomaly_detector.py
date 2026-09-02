"""
AIS anomaly detection — Isolation Forest over a rolling window of vessel
positions. Features: speed deviation, course deviation, ping-gap duration,
and route/corridor deviation.
"""

import numpy as np
from sklearn.ensemble import IsolationForest


FEATURE_NAMES = ["speed_deviation", "course_deviation", "ping_gap_minutes",
                  "route_corridor_distance_km"]


class AISAnomalyDetector:
    def __init__(self, contamination: float = 0.05):
        self.model = IsolationForest(
            n_estimators=200, contamination=contamination, random_state=42
        )
        self._fitted = False

    def fit(self, feature_rows: list[list[float]]):
        """feature_rows: list of [speed_dev, course_dev, ping_gap, route_dist]."""
        X = np.array(feature_rows)
        self.model.fit(X)
        self._fitted = True

    def score(self, feature_rows: list[list[float]]) -> list[float]:
        """
        Returns an anomaly score in [0, 1] per row (higher = more anomalous).

        Strategy:
        - IsolationForest.decision_function returns negative values for
          anomalies and positive for normal points.
        - We use a sigmoid mapping centred on 0 so each row gets an
          independent score rather than depending on the range of the batch.
          This avoids the "all scores 1.0" problem when all rows in a
          small batch look equally unusual to the model.
        - Scores < 0 from the model map to > 0.5 (anomalous).
        - Scores > 0 map to < 0.5 (normal).
        """
        if not self._fitted:
            raise RuntimeError("Model not fitted — call fit() with historical data first.")

        import math
        X = np.array(feature_rows)
        raw = self.model.decision_function(X)   # negative = anomalous

        scores = []
        for r in raw:
            # Sigmoid: decision_function of -0.1 → ~0.52, -0.5 → ~0.62, 0 → 0.5
            # Scale by 5 so typical IF output range (-0.5 to +0.5) maps well to (0.1, 0.9)
            s = 1.0 / (1.0 + math.exp(5.0 * r))
            scores.append(round(s, 4))
        return scores

    def classify_anomaly_type(self, row: list[float]) -> str:
        """Pick the dominant feature to label the anomaly type."""
        speed_dev, course_dev, ping_gap, route_dist = row
        candidates = {
            "speed_deviation": speed_dev,
            "course_deviation": course_dev,
            "dark_gap": ping_gap,
            "route_deviation": route_dist,
        }
        return max(candidates, key=candidates.get)


def _to_datetime(value) -> "datetime":
    """Coerce a stored timestamp (datetime object or ISO string) to datetime."""
    from datetime import datetime, timezone
    if isinstance(value, datetime):
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value
    if isinstance(value, str):
        try:
            dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
            return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
        except ValueError:
            pass
    return datetime.now(timezone.utc)


def compute_features(positions: list[dict], expected_speed: float,
                      expected_course: float, corridor_distance_fn) -> list[list[float]]:
    """
    positions: list of {lat, lon, sog, cog, timestamp} ordered by time for one vessel.
    corridor_distance_fn(lat, lon) -> distance in km to the expected shipping corridor.
    Timestamps may be datetime objects or ISO strings (JSON round-trip safe).
    """
    rows = []
    prev_ts = None
    for p in positions:
        speed_dev = abs((p.get("sog") or 0.0) - expected_speed)
        course_dev = abs((p.get("cog") or 0.0) - expected_course) % 360
        course_dev = min(course_dev, 360 - course_dev)

        ts = _to_datetime(p.get("timestamp"))
        ping_gap = 0.0
        if prev_ts is not None:
            ping_gap = max((ts - prev_ts).total_seconds() / 60.0, 0.0)
        prev_ts = ts

        route_dist = corridor_distance_fn(p["lat"], p["lon"])

        rows.append([speed_dev, course_dev, ping_gap, route_dist])
    return rows
