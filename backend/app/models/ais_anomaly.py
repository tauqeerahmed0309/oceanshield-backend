"""
AIS anomaly — stored as a plain Record (dict) in the JSON store.

Fields: id, mmsi, latitude, longitude, anomaly_type, anomaly_score, detected_at
anomaly_type is one of: "speed_deviation", "course_deviation", "dark_gap",
"loitering", "route_deviation"
"""

TABLE = "ais_anomalies"
