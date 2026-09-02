"""
Vessel position — stored as a plain Record (dict) in the JSON store, not
a SQLAlchemy model. See app/db/json_store.py.

Fields: id, mmsi, ship_name, imo, callsign, flag, type, latitude, longitude, 
speed, course, sog, cog, timestamp, status, suspicious, anomalyReason, anomalySeverity
"""

TABLE = "vessel_positions"
