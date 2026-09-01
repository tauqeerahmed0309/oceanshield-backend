from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from app.db.session import get_db
from app.db.json_store import JSONStore
from app.models.incident import TABLE as INCIDENT_TABLE
from app.schemas.incident import IncidentOut

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("/{incident_id}/status", response_model=IncidentOut)
async def get_alert_status(incident_id: int, db: JSONStore = Depends(get_db)):
    """Notification timeline for a specific incident (sent/acknowledged/released)."""
    incident = await db.get(INCIDENT_TABLE, incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident


@router.post("/{incident_id}/acknowledge")
async def acknowledge_alert(incident_id: int, db: JSONStore = Depends(get_db)):
    """
    Mock endpoint simulating ICG acknowledging receipt of the alert
    (e.g. via a secure link in the notification email/SMS).
    """
    incident = await db.get(INCIDENT_TABLE, incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    acknowledged_at = datetime.now(timezone.utc)
    await db.update(INCIDENT_TABLE, incident_id, {"icg_acknowledged_at": acknowledged_at})
    return {"incident_id": incident_id, "acknowledged_at": acknowledged_at}
