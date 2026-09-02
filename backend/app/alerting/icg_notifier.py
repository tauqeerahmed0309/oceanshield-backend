"""
ICG/MRCC priority alerting — ensures the Indian Coast Guard is notified
of a confirmed incident BEFORE it's released to the general dashboard.

Status flow:
    confirmed_pending_notification -> (ICG alert sent) -> confirmed_public

For the prototype, the "ICG endpoint" is a mock webhook — swap
settings.icg_alert_webhook_url for a real ICG/MRCC integration in
production, routed to the correct Regional Response Centre (West /
East / Andaman & Nicobar) based on incident coordinates.
"""

import logging
from datetime import datetime, timezone

import requests

from app.config import settings
from app.db.json_store import JSONStore, Record
from app.models.incident import TABLE as INCIDENT_TABLE

logger = logging.getLogger("icg_notifier")


def _regional_centre(lat: float, lon: float) -> str:
    """Rough India-coast regional routing — refine boundaries for production."""
    if lon < 75:
        return "West Region (Mumbai)"
    elif lon < 85:
        return "East Region (Chennai/Vizag)"
    else:
        return "Andaman & Nicobar Region"


def send_icg_alert(incident: Record) -> bool:
    """Send the priority alert. Returns True if the send succeeded."""
    region = _regional_centre(incident.latitude, incident.longitude)

    payload = {
        "incident_id": incident.id,
        "location": {"lat": incident.latitude, "lon": incident.longitude},
        "risk_score": incident.risk_score,
        "attributed_mmsi": incident.attributed_mmsi,
        "attribution_confidence": incident.attribution_confidence,
        "regional_response_centre": region,
        "detected_at": incident.created_at.isoformat(),
    }

    if not settings.icg_alert_webhook_url:
        logger.warning("No ICG webhook configured — logging alert instead of sending: %s",
                        payload)
        return True  # prototype mode: treat as "sent" for demo purposes

    try:
        resp = requests.post(settings.icg_alert_webhook_url, json=payload, timeout=10)
        resp.raise_for_status()
        logger.info("ICG alert sent for incident %s to %s", incident.id, region)
        return True
    except requests.RequestException:
        logger.exception("Failed to send ICG alert for incident %s", incident.id)
        return False


async def notify_and_gate_incident(db: JSONStore, incident: Record,
                                     release_delay_ok: bool = True) -> Record:
    """
    Sends the ICG alert first, logs the timestamp, and only then allows
    the incident to be flagged for public dashboard release. Returns the
    (possibly updated) incident record.
    """
    success = send_icg_alert(incident)

    if success:
        patch = {"icg_notified_at": datetime.now(timezone.utc)}
        if release_delay_ok:
            patch["status"] = "confirmed_public"
            patch["public_released_at"] = datetime.now(timezone.utc)
        incident = await db.update(INCIDENT_TABLE, incident.id, patch)

    return incident
