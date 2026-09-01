"""
Incident — a confirmed oil-spill incident: a spill candidate that
crossed the confirm threshold, with vessel attribution and ICG-first
alert gating. Stored as a plain Record (dict) in the JSON store.

Fields: id, spill_candidate_id, latitude, longitude, risk_score,
attributed_mmsi, attribution_confidence, status
("confirmed_pending_notification" -> "confirmed_public"),
icg_notified_at, icg_acknowledged_at, public_released_at, created_at
"""

TABLE = "incidents"
