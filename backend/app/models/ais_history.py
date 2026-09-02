"""
AIS history — append-only log of every position received per vessel.

vessel_positions stays as a latest-only upsert table (for the map).
ais_history appends every incoming position so the anomaly detector
has a rolling window of readings to compute features against.

Fields: id, mmsi, latitude, longitude, sog, cog, timestamp
"""

TABLE = "ais_history"

# Trim the table to this many rows (oldest pruned first) to avoid
# unbounded growth during long-running sessions.
MAX_RECORDS = 50_000
