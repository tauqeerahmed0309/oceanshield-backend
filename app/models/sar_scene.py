"""
SAR scene metadata — stored as a plain Record (dict) in the JSON store.

Fields: id, scene_id, source ("copernicus" | "upload"), file_path,
aoi_lat_min, aoi_lon_min, aoi_lat_max, aoi_lon_max, scene_timestamp, fetched_at
"""

TABLE = "sar_scenes"
