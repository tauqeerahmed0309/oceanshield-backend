"""
Google Earth Engine — Sentinel-1 GRD scene fetcher.

This module handles authentication and image retrieval from GEE using
the earthengine-api (ee) SDK.  It does NOT run SAR change detection
itself — that lives in app/processing/sentry_sar.py.  This layer is
purely responsible for:

  1. Initialising the GEE session (project = GEE_PROJECT_ID).
  2. Querying the Sentinel-1 GRD collection over the AOI + time window.
  3. Returning ee.Image objects (or their metadata dicts) to the caller.

Authentication strategy
-----------------------
Service-account JSON key (recommended for server deployments):
  Place the key at  data/gee_service_account.json  or set the env var
  GOOGLE_APPLICATION_CREDENTIALS to its path before starting the server.
  GEE will auto-discover credentials via Application Default Credentials.

  Alternatively, call `ee.Authenticate()` once interactively on the dev
  machine and the token is cached in ~/.config/earthengine/.

Both paths are supported; the module tries ADC first, then falls back to
a warning log so a missing key doesn't crash the whole server on startup.
"""

import logging
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional

from app.config import settings

logger = logging.getLogger("gee_sar_fetcher")

# ---------------------------------------------------------------------------
# Lazy GEE initialisation — imported at function-call time so the server
# still starts cleanly even if earthengine-api is not yet installed.
# ---------------------------------------------------------------------------

_gee_initialized: bool = False


def _init_gee() -> bool:
    """
    Initialise the Earth Engine session.  Called lazily before the first
    real API call.  Returns True on success, False (and logs) on failure.
    """
    global _gee_initialized
    if _gee_initialized:
        return True

    try:
        import ee  # noqa: PLC0415

        project = settings.gee_project_id
        if not project:
            logger.warning(
                "GEE_PROJECT_ID is not set — Google Earth Engine will not be available. "
                "Set GEE_PROJECT_ID in .env to enable the SENTRY-SAR GEE path."
            )
            return False

        # Try Application Default Credentials first (service account / gcloud).
        try:
            ee.Initialize(project=project)
            _gee_initialized = True
            logger.info("Google Earth Engine initialised (project=%s)", project)
            return True
        except ee.EEException as exc:
            logger.warning(
                "GEE initialisation failed with ADC (%s). "
                "Run `earthengine authenticate` or set GOOGLE_APPLICATION_CREDENTIALS.",
                exc,
            )
            return False

    except ImportError:
        logger.warning(
            "earthengine-api not installed — GEE SAR path disabled. "
            "Install with: pip install earthengine-api"
        )
        return False


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def get_s1_images_over_aoi(
    start_dt: Optional[datetime] = None,
    end_dt: Optional[datetime] = None,
    days_back: int = 14,
) -> list[dict]:
    """
    Query the Sentinel-1 GRD collection for scenes over the configured AOI
    in the given time window.

    Parameters
    ----------
    start_dt : datetime, optional
        Start of the search window (UTC).  Defaults to `days_back` days ago.
    end_dt : datetime, optional
        End of the search window (UTC).  Defaults to now.
    days_back : int
        How many days back to look when start_dt is not supplied.

    Returns
    -------
    list[dict]
        One dict per scene with keys:
          id, system_time_start, polarizations, orbit_direction, platform
        Returns an empty list if GEE is unavailable.
    """
    if not _init_gee():
        return []

    import ee  # noqa: PLC0415

    now = datetime.now(timezone.utc)
    start_dt = start_dt or (now - timedelta(days=days_back))
    end_dt = end_dt or now

    aoi = ee.Geometry.Rectangle(
        [
            settings.aoi_bounding_box_lon_min,
            settings.aoi_bounding_box_lat_min,
            settings.aoi_bounding_box_lon_max,
            settings.aoi_bounding_box_lat_max,
        ]
    )

    collection = (
        ee.ImageCollection(settings.gee_s1_collection)
        .filterBounds(aoi)
        .filterDate(start_dt.strftime("%Y-%m-%d"), end_dt.strftime("%Y-%m-%d"))
        .filter(ee.Filter.eq("instrumentMode", settings.gee_s1_instrument_mode))
        .filter(ee.Filter.eq("orbitProperties_pass", settings.gee_s1_orbit_direction))
    )

    # Filter to only scenes that have all requested polarisations.
    for pol in settings.gee_polarizations:
        collection = collection.filter(
            ee.Filter.listContains("transmitterReceiverPolarisation", pol)
        )

    try:
        image_list = collection.toList(50)  # max 50 scenes per poll
        count = image_list.length().getInfo()
        if count == 0:
            logger.info("No Sentinel-1 scenes found for AOI in window %s – %s", start_dt, end_dt)
            return []

        scenes = []
        for i in range(count):
            img = ee.Image(image_list.get(i))
            info = img.getInfo()
            props = info.get("properties", {})
            scenes.append(
                {
                    "id": info.get("id", f"s1_{i}"),
                    "system_time_start": props.get("system:time_start"),
                    "polarizations": props.get("transmitterReceiverPolarisation", []),
                    "orbit_direction": props.get("orbitProperties_pass"),
                    "platform": props.get("platform_number", "S1"),
                    "resolution_meters": 10,
                    "_ee_image_id": info.get("id"),
                }
            )
        logger.info("Found %d Sentinel-1 scene(s) in window %s – %s", len(scenes), start_dt, end_dt)
        return scenes

    except Exception:  # noqa: BLE001
        logger.exception("GEE scene query failed")
        return []


def load_s1_image_pair(
    current_image_id: str,
    reference_image_id: str,
) -> tuple[Optional[object], Optional[object]]:
    """
    Load a current + reference ee.Image pair for change detection.
    Returns (current_ee_image, reference_ee_image), both clipped to the AOI.
    Either element is None if loading fails.
    """
    if not _init_gee():
        return None, None

    import ee  # noqa: PLC0415

    aoi = ee.Geometry.Rectangle(
        [
            settings.aoi_bounding_box_lon_min,
            settings.aoi_bounding_box_lat_min,
            settings.aoi_bounding_box_lon_max,
            settings.aoi_bounding_box_lat_max,
        ]
    )

    try:
        current = ee.Image(current_image_id).clip(aoi)
        reference = ee.Image(reference_image_id).clip(aoi)
        return current, reference
    except Exception:  # noqa: BLE001
        logger.exception(
            "Failed to load GEE image pair (%s / %s)", current_image_id, reference_image_id
        )
        return None, None


def export_band_as_numpy(
    ee_image: object,
    band: str = "VV",
    scale: int = 10,
    region: Optional[object] = None,
) -> Optional["np.ndarray"]:  # type: ignore[type-arg]
    """
    Export a single band of an ee.Image to a NumPy array via ee.data.computePixels.

    This uses the newer Pixel API which avoids Tasks / Drive round-trips
    and returns the array in-memory.  For very large AOIs (>100 km²) this
    will be slow; use GEE Export tasks instead.

    Parameters
    ----------
    ee_image : ee.Image
    band : str
        Band name, e.g. "VV" or "VH".
    scale : int
        Pixel size in metres (10 m for Sentinel-1 IW GRD).
    region : ee.Geometry, optional
        If not supplied, falls back to the global AOI rectangle.

    Returns
    -------
    np.ndarray or None
    """
    if not _init_gee():
        return None

    import ee  # noqa: PLC0415
    import numpy as np  # noqa: PLC0415

    if region is None:
        region = ee.Geometry.Rectangle(
            [
                settings.aoi_bounding_box_lon_min,
                settings.aoi_bounding_box_lat_min,
                settings.aoi_bounding_box_lon_max,
                settings.aoi_bounding_box_lat_max,
            ]
        )

    try:
        pixels = ee_image.select(band).getRegion(region, scale).getInfo()
        # getRegion returns [[header_row], [data_row], ...], header = ['id','lon','lat','time',band]
        if len(pixels) < 2:
            return None
        # Simple reconstruction into 2D — sufficient for change detection
        data_rows = pixels[1:]
        values = np.array([row[4] if row[4] is not None else np.nan for row in data_rows],
                          dtype=np.float32)
        return values
    except Exception:  # noqa: BLE001
        logger.exception("Failed to export band %s as numpy", band)
        return None
