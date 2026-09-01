"""
Basic unit tests for the individually-testable filter functions
(no DB / network required for these).
"""

import numpy as np

from app.filters.persistence_check import compute_iou, apply_persistence_check
from app.filters.spatial_context import apply_spatial_context
from app.filters.ais_crosscheck import apply_ais_correlation
from app.processing.risk_scoring import compute_final_score


def test_compute_iou_identical_masks():
    mask = np.zeros((10, 10), dtype=np.uint8)
    mask[2:5, 2:5] = 1
    assert compute_iou(mask, mask) == 1.0


def test_compute_iou_disjoint_masks():
    a = np.zeros((10, 10), dtype=np.uint8)
    a[0:2, 0:2] = 1
    b = np.zeros((10, 10), dtype=np.uint8)
    b[8:10, 8:10] = 1
    assert compute_iou(a, b) == 0.0


def test_persistence_check_flags_repeat_patch():
    mask = np.zeros((10, 10), dtype=np.uint8)
    mask[2:6, 2:6] = 1
    result = apply_persistence_check(mask, previous_masks=[mask])
    assert result["penalty"] < 1.0


def test_spatial_context_downweights_coastal_patch():
    result = apply_spatial_context(distance_to_coast=0.5, in_known_bloom_zone=False)
    assert result["weight"] < 1.0


def test_ais_correlation_boosts_with_nearby_anomaly():
    with_anomaly = apply_ais_correlation([{"anomaly_score": 0.9}])
    without_anomaly = apply_ais_correlation([])
    assert with_anomaly["boost"] > without_anomaly["boost"]


def test_composite_score_confirms_above_threshold():
    result = compute_final_score(
        unet_confidence=0.9, lookalike_prob=0.9, spatial_weight=1.0,
        ais_boost=1.8, persistence_penalty=1.0,
    )
    assert result["verdict"] == "confirmed"


def test_composite_score_unverified_below_threshold():
    result = compute_final_score(
        unet_confidence=0.3, lookalike_prob=0.3, spatial_weight=0.5,
        ais_boost=0.4, persistence_penalty=1.0,
    )
    assert result["verdict"] == "unverified"
