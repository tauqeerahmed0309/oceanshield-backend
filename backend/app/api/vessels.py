from fastapi import APIRouter, Depends

from app.db.session import get_db
from app.db.json_store import JSONStore
from app.models.vessel_position import TABLE
from app.schemas.vessel import VesselPositionOut

router = APIRouter(prefix="/vessels", tags=["vessels"])


@router.get("", response_model=list[dict])
@router.get("/", response_model=list[dict], include_in_schema=False)
async def list_latest_vessel_positions(limit: int = 500, db: JSONStore = Depends(get_db)):
    """Latest known position per unique vessel (MMSI)."""
    all_records = await db.query(TABLE, order_by="timestamp", desc=True)
    # Deduplicate: keep only the most recent position per MMSI
    seen: dict[str, dict] = {}
    for r in all_records:
        mmsi = str(r.get("mmsi", ""))
        if mmsi and mmsi not in seen:
            seen[mmsi] = dict(r)
    results = list(seen.values())[:limit]
    return results


@router.get("/{mmsi}", response_model=list[dict])
async def get_vessel_track(mmsi: str, limit: int = 100, db: JSONStore = Depends(get_db)):
    """Recent position history for one vessel."""
    results = await db.query(
        TABLE, predicate=lambda r: r["mmsi"] == mmsi,
        order_by="timestamp", desc=True, limit=limit,
    )
    return [dict(r) for r in results]
