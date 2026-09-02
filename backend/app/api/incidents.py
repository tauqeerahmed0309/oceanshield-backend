"""
Incidents API — oil spill incidents in the frontend-expected shape.

GET  /incidents        — all incidents as Incident[] (frontend type)
GET  /incidents/{id}   — single incident by numeric or INC-YYYY-NNNN id
POST /incidents/from-candidate/{id} — promote spill candidate to incident
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from app.db.session import get_db
from app.db.json_store import JSONStore
from app.models.incident import TABLE as INCIDENT_TABLE
from app.models.spill_candidate import TABLE as SPILL_TABLE
from app.schemas.incident import db_record_to_incident
from app.processing.correlation_engine import rank_candidate_vessels
from app.alerting.icg_notifier import notify_and_gate_incident

router = APIRouter(prefix="/incidents", tags=["incidents"])


@router.get("")
@router.get("/", include_in_schema=False)
async def list_incidents(
    public_only: bool = False,
    limit: int = 50,
    db: JSONStore = Depends(get_db),
) -> list[dict]:
    predicate = (lambda r: r["status"] == "confirmed_public") if public_only else None
    records = await db.query(INCIDENT_TABLE, predicate=predicate,
                             order_by="created_at", desc=True, limit=limit)
    return [db_record_to_incident(dict(r)) for r in records]


@router.get("/{incident_id}")
async def get_incident(incident_id: str, db: JSONStore = Depends(get_db)) -> dict:
    # Try numeric ID first
    try:
        record = await db.get(INCIDENT_TABLE, int(incident_id))
    except ValueError:
        # String ID like INC-2026-0001 — try matching by suffix number
        try:
            num = int(incident_id.split("-")[-1])
            record = await db.get(INCIDENT_TABLE, num)
        except (ValueError, IndexError):
            record = None

    if not record:
        raise HTTPException(status_code=404, detail="Incident not found")
    return db_record_to_incident(dict(record))


@router.post("/from-candidate/{candidate_id}")
async def create_incident_from_candidate(
    candidate_id: int,
    db: JSONStore = Depends(get_db),
) -> dict:
    candidate = await db.get(SPILL_TABLE, candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Spill candidate not found")

    ranked = await rank_candidate_vessels(
        db, candidate["centroid_lat"], candidate["centroid_lon"],
        candidate["detected_at"],
    )
    top = ranked[0] if ranked else None

    record = await db.insert(INCIDENT_TABLE, {
        "spill_candidate_id": candidate["id"],
        "latitude": candidate["centroid_lat"],
        "longitude": candidate["centroid_lon"],
        "risk_score": candidate.get("final_score", 0.55),
        "attributed_mmsi": top["mmsi"] if top else None,
        "attribution_confidence": top["attribution_confidence"] if top else None,
        "status": "confirmed_pending_notification",
        "created_at": datetime.now(timezone.utc),
        "_sensor_source": "Sentinel-1A SAR (C-band VV)",
        "_area_sq_km": round(candidate.get("final_score", 0.5) * 20, 2),
    })

    record = await notify_and_gate_incident(db, record)
    return db_record_to_incident(dict(record))
