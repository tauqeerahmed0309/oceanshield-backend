from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from app.db.session import get_db
from app.db.json_store import JSONStore
from app.models.incident import TABLE as INCIDENT_TABLE
from app.models.spill_candidate import TABLE as SPILL_TABLE
from app.schemas.incident import IncidentOut
from app.processing.correlation_engine import rank_candidate_vessels
from app.alerting.icg_notifier import notify_and_gate_incident

router = APIRouter(prefix="/incidents", tags=["incidents"])


@router.get("/", response_model=list[IncidentOut])
async def list_incidents(
    public_only: bool = True, limit: int = 50, db: JSONStore = Depends(get_db)
):
    """
    public_only=True (default) only returns incidents already released to
    the public dashboard — i.e. ICG has already been notified first.
    """
    predicate = (lambda r: r["status"] == "confirmed_public") if public_only else None
    return await db.query(INCIDENT_TABLE, predicate=predicate,
                           order_by="created_at", desc=True, limit=limit)


@router.get("/{incident_id}", response_model=IncidentOut)
async def get_incident(incident_id: int, db: JSONStore = Depends(get_db)):
    incident = await db.get(INCIDENT_TABLE, incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident


@router.post("/from-candidate/{candidate_id}", response_model=IncidentOut)
async def create_incident_from_candidate(candidate_id: int, db: JSONStore = Depends(get_db)):
    """
    Promotes a confirmed spill candidate into a formal incident: ranks
    candidate vessels for attribution, then triggers the ICG-first alert
    gate before public release.
    """
    candidate = await db.get(SPILL_TABLE, candidate_id)
    if not candidate or candidate.get("verdict") != "confirmed":
        raise HTTPException(status_code=400, detail="Candidate not found or not confirmed")

    ranked_vessels = await rank_candidate_vessels(
        db, candidate["centroid_lat"], candidate["centroid_lon"], candidate["detected_at"]
    )
    top_vessel = ranked_vessels[0] if ranked_vessels else None

    incident = await db.insert(INCIDENT_TABLE, {
        "spill_candidate_id": candidate["id"],
        "latitude": candidate["centroid_lat"],
        "longitude": candidate["centroid_lon"],
        "risk_score": candidate["final_score"],
        "attributed_mmsi": top_vessel["mmsi"] if top_vessel else None,
        "attribution_confidence": top_vessel["attribution_confidence"] if top_vessel else None,
        "status": "confirmed_pending_notification",
        "created_at": datetime.now(timezone.utc),
    })

    # ICG-first alert gate — see alerting/icg_notifier.py
    incident = await notify_and_gate_incident(db, incident)

    return incident
