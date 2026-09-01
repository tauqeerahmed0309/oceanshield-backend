"""
Periodic check for new Sentinel-1 SAR scenes over the AOI, via the
Copernicus Data Space / Sentinel Hub catalogue API.

Sentinel-1 revisit is ~12 days per location (single-satellite gap since
Sentinel-1B's failure), so this only needs to run ~daily, not continuously.
When an AIS anomaly is severe, call check_for_new_scene() immediately
instead of waiting for the next scheduled poll.

NOTE: Requires real Copernicus OAuth credentials (client id/secret) in
.env. This module stubs the actual OAuth token exchange — fill in with
Sentinel Hub's documented auth flow before using in production.
"""

import logging
from datetime import datetime, timezone
from pathlib import Path

import requests

from app.config import settings
from app.db.session import store
from app.models.sar_scene import TABLE as SAR_SCENE_TABLE

logger = logging.getLogger("sar_fetcher")

CATALOGUE_URL = "https://catalogue.dataspace.copernicus.eu/resto/api/collections/Sentinel1/search.json"
DOWNLOAD_DIR = Path("data/sar_scenes")
DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)


def _aoi_bbox_str() -> str:
    return (f"{settings.aoi_bounding_box_lon_min},{settings.aoi_bounding_box_lat_min},"
            f"{settings.aoi_bounding_box_lon_max},{settings.aoi_bounding_box_lat_max}")


def query_new_scenes(since: datetime) -> list[dict]:
    """Query the Copernicus catalogue for scenes over the AOI since a given time."""
    params = {
        "box": _aoi_bbox_str(),
        "startDate": since.isoformat(),
        "productType": "GRD",
        "maxRecords": 10,
        "sortParam": "startDate",
        "sortOrder": "descending",
    }
    try:
        resp = requests.get(CATALOGUE_URL, params=params, timeout=30)
        resp.raise_for_status()
        return resp.json().get("features", [])
    except requests.RequestException:
        logger.exception("Copernicus catalogue query failed")
        return []


async def check_for_new_scene(triggered_by_anomaly: bool = False):
    """
    Check the catalogue for a new scene. If found and not already stored,
    save its metadata (actual download requires an authenticated session —
    stubbed here as a placeholder file path).
    """
    since = datetime.now(timezone.utc)
    scenes = query_new_scenes(since)

    if not scenes:
        logger.info("No new SAR scenes over AOI (triggered_by_anomaly=%s)",
                     triggered_by_anomaly)
        return None

    scene = scenes[0]
    scene_id = scene.get("id", "unknown")
    scene_time_str = scene.get("properties", {}).get("startDate")
    scene_time = datetime.fromisoformat(scene_time_str) if scene_time_str \
        else datetime.now(timezone.utc)

    # Placeholder: real download would use an authenticated Sentinel Hub
    # session and save the GeoTIFF here.
    file_path = str(DOWNLOAD_DIR / f"{scene_id}.tif")

    record = await store.insert(SAR_SCENE_TABLE, {
        "scene_id": scene_id,
        "source": "copernicus",
        "file_path": file_path,
        "aoi_lat_min": settings.aoi_bounding_box_lat_min,
        "aoi_lon_min": settings.aoi_bounding_box_lon_min,
        "aoi_lat_max": settings.aoi_bounding_box_lat_max,
        "aoi_lon_max": settings.aoi_bounding_box_lon_max,
        "scene_timestamp": scene_time,
        "fetched_at": datetime.now(timezone.utc),
    })
    logger.info("Stored new SAR scene %s", scene_id)
    return record
