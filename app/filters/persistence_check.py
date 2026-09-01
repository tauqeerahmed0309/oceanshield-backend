"""
Layer 5: Persistence / permanent-patch check.

If the same dark shape appears in the same location across multiple SAR
passes, it's a permanent geographic feature (a fixed wind shadow, a
current shear zone), not a drifting spill. Requires at least 2 passes
of the same AOI grid cell to activate.
"""

import numpy as np


def compute_iou(mask_a: np.ndarray, mask_b: np.ndarray) -> float:
    if mask_a.shape != mask_b.shape:
        return 0.0
    intersection = np.logical_and(mask_a, mask_b).sum()
    union = np.logical_or(mask_a, mask_b).sum()
    return float(intersection / max(union, 1))


def apply_persistence_check(candidate_mask: np.ndarray,
                             previous_masks: list[np.ndarray],
                             overlap_threshold: float = 0.8) -> dict:
    penalty = 1.0
    max_iou = 0.0

    for prev_mask in previous_masks:
        iou = compute_iou(candidate_mask, prev_mask)
        max_iou = max(max_iou, iou)
        if iou > overlap_threshold:
            penalty = 0.2
            break

    return {"max_historical_iou": max_iou, "penalty": penalty}
