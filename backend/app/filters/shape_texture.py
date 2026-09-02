"""
Layer 2: Shape & texture classifier.

Extracts geometric/textural features from a U-Net candidate mask
(aspect ratio, edge gradient, GLCM texture) and feeds them into a
trained Random Forest that outputs P(real spill) vs. natural look-alike.
"""

import numpy as np
import joblib
from skimage.feature import graycomatrix, graycoprops

from app.config import settings

FEATURE_ORDER = ["aspect_ratio", "edge_gradient", "glcm_contrast",
                  "glcm_homogeneity", "area_px", "wind_speed_ms"]


def extract_shape_texture_features(mask: np.ndarray, sar_image: np.ndarray) -> dict:
    ys, xs = np.where(mask > 0)
    if len(xs) < 5:
        return {"aspect_ratio": 0.0, "edge_gradient": 0.0, "glcm_contrast": 0.0,
                "glcm_homogeneity": 0.0, "area_px": float(len(xs))}

    width = xs.max() - xs.min() + 1
    height = ys.max() - ys.min() + 1
    aspect_ratio = max(width, height) / max(1, min(width, height))

    gy, gx = np.gradient(sar_image.astype(float))
    grad_mag = np.sqrt(gx ** 2 + gy ** 2)
    edge_gradient = float(np.mean(grad_mag[mask > 0]))

    patch = sar_image[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    patch_range = patch.max() - patch.min()
    patch_norm = np.clip((patch - patch.min()) / (patch_range + 1e-6) * 255,
                          0, 255).astype(np.uint8)
    glcm = graycomatrix(patch_norm, distances=[1], angles=[0], levels=256,
                         symmetric=True, normed=True)
    contrast = float(graycoprops(glcm, "contrast")[0, 0])
    homogeneity = float(graycoprops(glcm, "homogeneity")[0, 0])

    return {
        "aspect_ratio": aspect_ratio,
        "edge_gradient": edge_gradient,
        "glcm_contrast": contrast,
        "glcm_homogeneity": homogeneity,
        "area_px": float(len(xs)),
    }


class LookalikeClassifier:
    def __init__(self, model_path: str | None = None):
        self.model_path = model_path or settings.lookalike_model_path
        self.model = None

    def load(self):
        try:
            self.model = joblib.load(self.model_path)
        except FileNotFoundError as e:
            raise RuntimeError(
                f"Look-alike classifier not found at {self.model_path}. "
                "Train it on labeled real-spill vs. look-alike examples first "
                "(see scripts/train_lookalike_classifier.py)."
            ) from e

    def predict_proba_spill(self, features: dict, wind_speed_ms: float) -> float:
        if self.model is None:
            raise RuntimeError("Call .load() before predict_proba_spill().")

        row = np.array([[
            features.get("aspect_ratio", 0),
            features.get("edge_gradient", 0),
            features.get("glcm_contrast", 0),
            features.get("glcm_homogeneity", 0),
            features.get("area_px", 0),
            wind_speed_ms,
        ]])
        proba = self.model.predict_proba(row)[0]
        return float(proba[1]) if len(proba) > 1 else float(proba[0])
