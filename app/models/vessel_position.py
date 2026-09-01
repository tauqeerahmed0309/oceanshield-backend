"""
Vessel position — stored as a plain Record (dict) in the JSON store, not
a SQLAlchemy model. See app/db/json_store.py.

Fields: id, mmsi, ship_name, latitude, longitude, sog, cog, timestamp
"""

TABLE = "vessel_positions"
