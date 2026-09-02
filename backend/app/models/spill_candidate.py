"""
Spill candidate — a dark-patch candidate from U-Net, after passing
through the multi-layer look-alike filter. Every candidate is stored,
not just confirmed ones — "unverified" results stay visible, never
silently dropped. Stored as a plain Record (dict) in the JSON store.

Fields: id, sar_scene_id, centroid_lat, centroid_lon, mask_path,
unet_confidence, wind_speed_ms, lookalike_prob, spatial_weight,
ais_boost, persistence_penalty, final_score, verdict
("confirmed" | "unverified"), filter_breakdown, detected_at
"""

TABLE = "spill_candidates"
