"""
Composite risk scoring — combines all 5 filter layers into one 0-1 score.
Score >= threshold -> "confirmed", else "unverified" (never hidden).
"""

from app.config import settings


def compute_final_score(
    unet_confidence: float,
    lookalike_prob: float | None,
    spatial_weight: float,
    ais_boost: float,
    persistence_penalty: float,
) -> dict:
    lookalike_prob = lookalike_prob if lookalike_prob is not None else 0.5

    raw_score = (
        unet_confidence * lookalike_prob * spatial_weight
        * ais_boost * persistence_penalty
    )
    final_score = min(raw_score, 1.0)

    verdict = "confirmed" if final_score >= settings.confirm_score_threshold else "unverified"

    return {"final_score": final_score, "verdict": verdict}
