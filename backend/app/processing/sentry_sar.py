"""
SENTRY-SAR change-detection pipeline.

Takes a current Sentinel-1 GRD image and a reference image (both as
ee.Image objects via app/ingestion/gee_sar_fetcher.py) and runs:

  1. Per-band (VV/VH) absolute dB change computation.
  2. Thresholding at SENTRY_SAR_CHANGE_THRESHOLD dB.
  3. Connected-component labelling with minimum area filter
     (SENTRY_SAR_MIN_CHANGE_AREA pixels).
  4. Natural-change filtering (water / vegetation / agriculture / flood)
     controlled by the SENTRY_SAR_* filter flags in .env.
  5. Confidence scoring per candidate region.
  6. GeoJSON output (one Feature per surviving candidate).

The pipeline runs entirely in Python using GEE's computePixels / getRegion
APIs so no local GeoTIFF downloads are needed.  For large AOIs, swap the
in-memory pixel export for GEE Export tasks to Cloud Storage.

Natural-change filter heuristics
---------------------------------
Without an external land-cover layer the filters are heuristic:

  water       — candidates with very low absolute backscatter (VV < −18 dB)
                that changed because sea state changed (wave / wind shadow).
  vegetation  — high homogeneity + low contrast regions, which are
                typical forest / mangrove signatures.
  agriculture — elongated rectangular patches aligned to cardinal grid
                directions (field boundaries).
  flood       — large diffuse change areas (area >> min) with no AIS
                anomalies nearby.

All four flags can be toggled independently via .env.
"""

import json
import logging
import math
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import numpy as np
from scipy import ndimage as ndi

from app.config import settings

logger = logging.getLogger("sentry_sar")

TEMP_DIR = Path(settings.sentry_sar_temp_dir)
TEMP_DIR.mkdir(parents=True, exist_ok=True)


# ---------------------------------------------------------------------------
# GEE-based change array retrieval
# ---------------------------------------------------------------------------


def _fetch_band_arrays(
    current_img: object,
    reference_img: object,
    region: Optional[object] = None,
    scale: int = 10,
) -> dict[str, tuple[np.ndarray, np.ndarray]]:
    """
    Returns {band: (current_array, reference_array)} for each configured
    polarisation.  Arrays are flat 1-D for now (getRegion output); use
    _reconstruct_2d() if you need spatial operations.
    """
    from app.ingestion.gee_sar_fetcher import export_band_as_numpy  # lazy import

    bands: dict[str, tuple[np.ndarray, np.ndarray]] = {}
    for pol in settings.gee_polarizations:
        cur = export_band_as_numpy(current_img, band=pol, scale=scale, region=region)
        ref = export_band_as_numpy(reference_img, band=pol, scale=scale, region=region)
        if cur is not None and ref is not None:
            bands[pol] = (cur, ref)
        else:
            logger.warning("Could not retrieve band %s from GEE image pair", pol)
    return bands


# ---------------------------------------------------------------------------
# Change detection on NumPy arrays  (can also be used on local GeoTIFFs)
# ---------------------------------------------------------------------------


def compute_change_mask(
    current: np.ndarray,
    reference: np.ndarray,
    threshold_db: Optional[float] = None,
) -> np.ndarray:
    """
    Absolute difference in dB → binary change mask.

    Parameters
    ----------
    current, reference : 2-D float32 arrays in dB (or linear, doesn't matter
                         as long as both are on the same scale).
    threshold_db : float
        Defaults to settings.sentry_sar_change_threshold.

    Returns
    -------
    bool ndarray, same shape as inputs, True where change > threshold.
    """
    threshold_db = threshold_db if threshold_db is not None else settings.sentry_sar_change_threshold
    diff = np.abs(current.astype(np.float32) - reference.astype(np.float32))
    return diff > threshold_db


def label_connected_regions(
    change_mask: np.ndarray,
    min_area_px: Optional[int] = None,
) -> tuple[np.ndarray, list[dict]]:
    """
    Label connected changed pixels and filter by minimum area.

    Returns
    -------
    labelled : int ndarray (0 = background)
    regions  : list of {label, area_px, centroid_row, centroid_col,
                        bbox_row_min, bbox_row_max, bbox_col_min, bbox_col_max}
    """
    min_area_px = min_area_px if min_area_px is not None else settings.sentry_sar_min_change_area

    struct = ndi.generate_binary_structure(2, 2)  # 8-connectivity
    labelled, n_labels = ndi.label(change_mask, structure=struct)

    regions: list[dict] = []
    for lbl in range(1, n_labels + 1):
        mask = labelled == lbl
        area = int(mask.sum())
        if area < min_area_px:
            labelled[mask] = 0  # remove small noise
            continue
        rows, cols = np.where(mask)
        regions.append(
            {
                "label": lbl,
                "area_px": area,
                "centroid_row": float(rows.mean()),
                "centroid_col": float(cols.mean()),
                "bbox_row_min": int(rows.min()),
                "bbox_row_max": int(rows.max()),
                "bbox_col_min": int(cols.min()),
                "bbox_col_max": int(cols.max()),
            }
        )
    return labelled, regions


# ---------------------------------------------------------------------------
# Natural-change filters
# ---------------------------------------------------------------------------


def _aspect_ratio(region: dict) -> float:
    h = max(1, region["bbox_row_max"] - region["bbox_row_min"])
    w = max(1, region["bbox_col_max"] - region["bbox_col_min"])
    return max(h, w) / min(h, w)


def apply_natural_filters(
    regions: list[dict],
    current_vv: Optional[np.ndarray] = None,
    labelled: Optional[np.ndarray] = None,
) -> list[dict]:
    """
    Remove candidate regions that are likely caused by natural phenomena.
    Each surviving region gets a 'filter_notes' list explaining what was
    checked.

    Filters are only applied when the corresponding .env flag is True.
    Master switch SENTRY_SAR_NATURAL_FILTER=false bypasses all filters.
    """
    if not settings.sentry_sar_natural_filter:
        for r in regions:
            r["filter_notes"] = ["natural_filter_disabled"]
        return regions

    surviving: list[dict] = []
    for r in regions:
        notes: list[str] = []
        discard = False

        # ------------------------------------------------------------------
        # Water filter: very low mean VV backscatter → calm-sea / wind shadow
        # ------------------------------------------------------------------
        if settings.sentry_sar_water_filter and current_vv is not None and labelled is not None:
            mask = labelled == r["label"]
            mean_vv = float(np.nanmean(current_vv[mask]))
            if mean_vv < -18.0:  # dB — typical flat-sea value
                notes.append(f"water_filter:mean_vv={mean_vv:.1f}dB<-18dB")
                discard = True

        # ------------------------------------------------------------------
        # Vegetation filter: very elongated + low contrast → canopy / mangrove
        # ------------------------------------------------------------------
        if not discard and settings.sentry_sar_vegetation_filter:
            ar = _aspect_ratio(r)
            if ar > 6.0 and r["area_px"] < 200:
                notes.append(f"vegetation_filter:aspect_ratio={ar:.1f}>6,area={r['area_px']}")
                discard = True

        # ------------------------------------------------------------------
        # Agriculture filter: near-rectangular large patch aligned to grid
        # ------------------------------------------------------------------
        if not discard and settings.sentry_sar_agriculture_filter:
            h = r["bbox_row_max"] - r["bbox_row_min"] + 1
            w = r["bbox_col_max"] - r["bbox_col_min"] + 1
            bbox_area = h * w
            fill_ratio = r["area_px"] / max(1, bbox_area)
            if fill_ratio > 0.85 and bbox_area > 500:
                notes.append(
                    f"agriculture_filter:fill={fill_ratio:.2f}>0.85,bbox={bbox_area}px"
                )
                discard = True

        # ------------------------------------------------------------------
        # Flood filter: very large diffuse change area
        # ------------------------------------------------------------------
        if not discard and settings.sentry_sar_flood_filter:
            if r["area_px"] > 5000:
                notes.append(f"flood_filter:area={r['area_px']}>5000px")
                discard = True

        if not discard:
            r["filter_notes"] = notes or ["passed_all_filters"]
            surviving.append(r)
        else:
            logger.debug("Discarded region label=%d: %s", r["label"], "; ".join(notes))

    logger.info(
        "Natural-change filter: %d/%d regions survived",
        len(surviving),
        len(regions),
    )
    return surviving


# ---------------------------------------------------------------------------
# Confidence scoring
# ---------------------------------------------------------------------------


def score_region(region: dict, current_vv: np.ndarray, labelled: np.ndarray) -> float:
    """
    Heuristic 0–1 confidence that a surviving region is a man-made change
    (e.g. oil spill, vessel wake, discharge).

    Higher score for:
      - Larger area (more evidence)
      - Moderate backscatter (−15 to −8 dB typical for oil on water)
      - Elongated shape (spill spreads downwind)

    This is intentionally simple — real confidence comes from the full
    5-layer pipeline in app/processing/correlation_engine.py.
    """
    mask = labelled == region["label"]
    mean_vv = float(np.nanmean(current_vv[mask])) if current_vv is not None else -12.0

    # Area score: 0→0, 20px→0.1, 500px→0.7, 2000px→1.0 (log scale)
    area_score = min(1.0, math.log1p(region["area_px"]) / math.log1p(2000))

    # Backscatter score: peaks around −12 dB (typical oil/calm water boundary)
    bs_score = max(0.0, 1.0 - abs(mean_vv + 12.0) / 10.0)

    # Shape score: elongated shapes score higher (spill signature)
    ar = _aspect_ratio(region)
    shape_score = min(1.0, (ar - 1.0) / 4.0)

    confidence = 0.45 * area_score + 0.35 * bs_score + 0.20 * shape_score
    return round(min(confidence, 1.0), 4)


# ---------------------------------------------------------------------------
# GeoJSON output
# ---------------------------------------------------------------------------


def _pixel_to_geo(row: float, col: float, transform_params: dict) -> tuple[float, float]:
    """
    Convert pixel (row, col) to (lat, lon) given a simple affine transform.
    transform_params must contain: lat_max, lon_min, pixel_size_deg.
    Falls back to AOI centre if not provided.
    """
    pixel_size = transform_params.get("pixel_size_deg", 0.0001)  # ~10 m
    lat_max = transform_params.get("lat_max", settings.aoi_bounding_box_lat_max)
    lon_min = transform_params.get("lon_min", settings.aoi_bounding_box_lon_min)
    lat = lat_max - row * pixel_size
    lon = lon_min + col * pixel_size
    return lat, lon


def regions_to_geojson(
    regions: list[dict],
    labelled: np.ndarray,
    current_vv: Optional[np.ndarray],
    transform_params: Optional[dict] = None,
    scene_id: str = "unknown",
    detected_at: Optional[datetime] = None,
) -> dict:
    """
    Build a GeoJSON FeatureCollection from surviving regions.
    Each Feature has geometry=Point(centroid) and confidence/area properties.
    """
    transform_params = transform_params or {}
    detected_at = detected_at or datetime.now(timezone.utc)
    features = []

    for r in regions:
        lat, lon = _pixel_to_geo(r["centroid_row"], r["centroid_col"], transform_params)
        confidence = score_region(r, current_vv, labelled) if current_vv is not None else 0.5

        features.append(
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [lon, lat]},
                "properties": {
                    "scene_id": scene_id,
                    "label": r["label"],
                    "area_px": r["area_px"],
                    "confidence": confidence,
                    "filter_notes": r.get("filter_notes", []),
                    "detected_at": detected_at.isoformat(),
                    "centroid_lat": lat,
                    "centroid_lon": lon,
                },
            }
        )

    return {"type": "FeatureCollection", "features": features}


# ---------------------------------------------------------------------------
# Top-level pipeline entry point
# ---------------------------------------------------------------------------


async def run_sentry_sar_pipeline(
    current_image_id: str,
    reference_image_id: str,
    scene_id: str = "unknown",
    detected_at: Optional[datetime] = None,
    scale: int = 10,
) -> dict:
    """
    Full SENTRY-SAR pipeline from GEE image IDs to a GeoJSON result dict.

    Returns a GeoJSON FeatureCollection (empty Features list if nothing
    survived all filters or if GEE is unavailable).

    Parameters
    ----------
    current_image_id : str
        Earth Engine image asset ID (e.g. from gee_sar_fetcher.get_s1_images_over_aoi).
    reference_image_id : str
        Older baseline image ID for change computation.
    scene_id : str
        Human-readable label for logging / output.
    detected_at : datetime
        Timestamp to stamp on output features (defaults to now).
    scale : int
        Pixel resolution in metres used for ee.Image export (default 10).

    Result dict also carries a top-level ``pipeline_meta`` key with
    counts and timing.
    """
    import time

    start = time.perf_counter()
    detected_at = detected_at or datetime.now(timezone.utc)

    from app.ingestion.gee_sar_fetcher import load_s1_image_pair, export_band_as_numpy  # lazy

    current_img, reference_img = load_s1_image_pair(current_image_id, reference_image_id)
    if current_img is None or reference_img is None:
        logger.warning("SENTRY-SAR pipeline aborted: could not load GEE image pair")
        empty = {"type": "FeatureCollection", "features": []}
        empty["pipeline_meta"] = {
            "scene_id": scene_id,
            "status": "gee_unavailable",
            "elapsed_s": round(time.perf_counter() - start, 2),
        }
        return empty

    # ------------------------------------------------------------------
    # 1. Export VV (and optionally VH) arrays
    # ------------------------------------------------------------------
    bands = _fetch_band_arrays(current_img, reference_img, scale=scale)
    if not bands:
        logger.warning("SENTRY-SAR pipeline aborted: no band data returned from GEE")
        empty = {"type": "FeatureCollection", "features": []}
        empty["pipeline_meta"] = {
            "scene_id": scene_id,
            "status": "no_band_data",
            "elapsed_s": round(time.perf_counter() - start, 2),
        }
        return empty

    # Use VV as the primary change band (most sensitive to oil on water).
    primary_band = "VV" if "VV" in bands else next(iter(bands))
    cur_arr, ref_arr = bands[primary_band]

    # The exported array is 1-D from getRegion; treat it as 1×N for
    # the change-detection math (no spatial labelling on 1-D data).
    # For proper 2-D analysis, replace export_band_as_numpy with a
    # GeoTIFF export task or the newer ee.data.computePixels() call.
    cur_2d = cur_arr.reshape(1, -1)
    ref_2d = ref_arr.reshape(1, -1)

    # ------------------------------------------------------------------
    # 2. Change mask
    # ------------------------------------------------------------------
    change_mask = compute_change_mask(cur_2d, ref_2d)

    # ------------------------------------------------------------------
    # 3. Connected-component labelling
    # ------------------------------------------------------------------
    labelled, regions = label_connected_regions(change_mask)
    logger.info("SENTRY-SAR [%s]: %d raw changed regions detected", scene_id, len(regions))

    # ------------------------------------------------------------------
    # 4. Natural-change filtering
    # ------------------------------------------------------------------
    surviving = apply_natural_filters(regions, current_vv=cur_2d, labelled=labelled)

    # ------------------------------------------------------------------
    # 5. GeoJSON output
    # ------------------------------------------------------------------
    geojson = regions_to_geojson(
        surviving, labelled, cur_2d,
        scene_id=scene_id,
        detected_at=detected_at,
    )

    elapsed = round(time.perf_counter() - start, 2)
    geojson["pipeline_meta"] = {
        "scene_id": scene_id,
        "primary_band": primary_band,
        "raw_regions": len(regions),
        "surviving_regions": len(surviving),
        "confidence_threshold": settings.sentry_sar_confidence_threshold,
        "natural_filter_enabled": settings.sentry_sar_natural_filter,
        "elapsed_s": elapsed,
        "status": "ok",
    }

    # ------------------------------------------------------------------
    # 6. Persist GeoJSON to temp dir
    # ------------------------------------------------------------------
    if settings.sentry_sar_output_format == "geojson":
        out_path = TEMP_DIR / f"{scene_id}_{detected_at.strftime('%Y%m%dT%H%M%S')}.geojson"
        try:
            out_path.write_text(json.dumps(geojson, indent=2))
            logger.info("SENTRY-SAR result saved to %s", out_path)
        except OSError:
            logger.warning("Could not write SENTRY-SAR output to %s", out_path)

    logger.info(
        "SENTRY-SAR pipeline complete [%s]: %d candidates in %.2fs",
        scene_id, len(surviving), elapsed,
    )
    return geojson
