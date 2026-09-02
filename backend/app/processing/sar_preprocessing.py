"""
SAR preprocessing: calibration + speckle filtering, required before U-Net
runs. Raw radar backscatter is noisy — this cleans it into an
analysis-ready single-channel array.
"""

import numpy as np
import rasterio
from scipy.ndimage import median_filter


def load_sar_image(file_path: str, band: int = 1) -> tuple[np.ndarray, dict]:
    """Load a GeoTIFF SAR scene and return the raster array + metadata."""
    with rasterio.open(file_path) as src:
        array = src.read(band).astype(np.float32)
        meta = {
            "transform": src.transform,
            "crs": src.crs,
            "bounds": src.bounds,
        }
    return array, meta


def calibrate(array: np.ndarray) -> np.ndarray:
    """
    Simple linear calibration placeholder — converts raw digital numbers
    to a normalized backscatter-like range. Real calibration should use
    the scene's calibration LUT (via ESA SNAP or equivalent) for accurate
    sigma-nought values; this is a lightweight stand-in for prototyping.
    """
    array = np.clip(array, 0, np.percentile(array, 99.5))
    return (array - array.min()) / (array.ptp() + 1e-6)


def speckle_filter(array: np.ndarray, size: int = 3) -> np.ndarray:
    """Median filter as a simple speckle-noise reducer."""
    return median_filter(array, size=size)


def preprocess_sar_scene(file_path: str) -> np.ndarray:
    raw, _ = load_sar_image(file_path)
    calibrated = calibrate(raw)
    filtered = speckle_filter(calibrated)
    return filtered
