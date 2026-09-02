"""
Layer 3: Spatial context rules.

Candidates hugging a coastline/island are likely wind shadows, not
spills. Candidates in a known seasonal biogenic bloom zone are likely
algae, not oil. Both are simple geographic lookups, no ML needed.
"""

from shapely.geometry import Point
import geopandas as gpd


def distance_to_coast_km(lat: float, lon: float, coastline_gdf: gpd.GeoDataFrame) -> float:
    """
    coastline_gdf: a GeoDataFrame of coastline geometry (e.g. loaded from a
    Natural Earth or NOAA shoreline shapefile), in a projected CRS for
    accurate distance in km.
    """
    point = gpd.GeoSeries([Point(lon, lat)], crs="EPSG:4326").to_crs(coastline_gdf.crs)
    distances_km = coastline_gdf.geometry.distance(point.iloc[0]) / 1000.0
    return float(distances_km.min())


def apply_spatial_context(distance_to_coast: float, in_known_bloom_zone: bool = False) -> dict:
    weight = 1.0
    if distance_to_coast < 2.0:
        weight *= 0.5
    if in_known_bloom_zone:
        weight *= 0.6

    return {"distance_to_coast_km": distance_to_coast,
            "in_known_bloom_zone": in_known_bloom_zone, "weight": weight}
