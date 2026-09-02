"""
Train the Random Forest look-alike classifier (app/filters/shape_texture.py)
on labeled real-spill vs. look-alike SAR examples.

Replace the synthetic data below with real features extracted from a
labeled dataset, e.g. the MKLab Kaggle oil-spill SAR dataset, using
extract_shape_texture_features() from app/filters/shape_texture.py on
each labeled mask.
"""

import numpy as np
from sklearn.ensemble import RandomForestClassifier
import joblib

from app.filters.shape_texture import FEATURE_ORDER


def build_synthetic_training_data(n: int = 200, seed: int = 42):
    """
    FOR DEMO/BOOTSTRAP ONLY. Replace with real labeled features before
    using this model for actual predictions.
    """
    rng = np.random.default_rng(seed)

    spills = np.column_stack([
        rng.normal(4.0, 0.8, n),   # aspect_ratio - elongated
        rng.normal(15, 3, n),      # edge_gradient - sharp boundary
        rng.normal(8, 2, n),       # glcm_contrast - low
        rng.normal(0.7, 0.1, n),   # glcm_homogeneity - high
        rng.normal(800, 200, n),   # area_px
        rng.normal(6, 1.5, n),     # wind_speed_ms - moderate
    ])
    lookalikes = np.column_stack([
        rng.normal(1.5, 0.5, n),
        rng.normal(30, 5, n),
        rng.normal(20, 4, n),
        rng.normal(0.4, 0.1, n),
        rng.normal(500, 300, n),
        rng.normal(4, 3, n),
    ])
    X = np.vstack([spills, lookalikes])
    y = np.array([1] * n + [0] * n)  # 1 = real spill, 0 = look-alike
    return X, y


def main():
    X, y = build_synthetic_training_data()

    model = RandomForestClassifier(
        n_estimators=200, max_depth=8, class_weight="balanced", random_state=42
    )
    model.fit(X, y)

    out_path = "app/ml/models/lookalike_rf.joblib"
    joblib.dump(model, out_path)
    print(f"Saved look-alike classifier to {out_path}")
    print(f"Feature order used: {FEATURE_ORDER}")
    print("NOTE: trained on synthetic placeholder data — retrain on a real "
          "labeled SAR oil-spill dataset before production use.")


if __name__ == "__main__":
    main()
