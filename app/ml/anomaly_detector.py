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
        IsolationForest's decision_function is roughly inverse to anomaly-ness,
        so we flip and normalize.
        """
        if not self._fitted:
            raise RuntimeError("Model not fitted — call fit() with historical data first.")

        X = np.array(feature_rows)
        raw = self.model.decision_function(X)  # higher = more normal
        # normalize to 0-1, flip so higher = more anomalous
        raw_min, raw_max = raw.min(), raw.max()
        if raw_max - raw_min < 1e-9:
            return [0.0] * len(raw)
        normalized = 1.0 - (raw - raw_min) / (raw_max - raw_min)
        return normalized.tolist()

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


def compute_features(positions: list[dict], expected_speed: float,
                      expected_course: float, corridor_distance_fn) -> list[list[float]]:
    """
    positions: list of {lat, lon, sog, cog, timestamp} ordered by time for one vessel.
    corridor_distance_fn(lat, lon) -> distance in km to the expected shipping corridor.
    """
    rows = []
    prev_ts = None
    for p in positions:
        speed_dev = abs((p.get("sog") or 0) - expected_speed)
        course_dev = abs((p.get("cog") or 0) - expected_course) % 360
        course_dev = min(course_dev, 360 - course_dev)

        ping_gap = 0.0
        if prev_ts is not None:
            ping_gap = (p["timestamp"] - prev_ts).total_seconds() / 60.0
        prev_ts = p["timestamp"]

        route_dist = corridor_distance_fn(p["lat"], p["lon"])

        rows.append([speed_dev, course_dev, ping_gap, route_dist])
    return rows
