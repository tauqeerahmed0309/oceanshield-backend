from fastapi import APIRouter, Depends

from app.db.session import get_db
from app.db.json_store import JSONStore
from app.models.vessel_position import TABLE
from app.schemas.vessel import VesselPositionOut

router = APIRouter(prefix="/vessels", tags=["vessels"])


@router.get("/", response_model=list[VesselPositionOut])
async def list_latest_vessel_positions(limit: int = 200, db: JSONStore = Depends(get_db)):
    """Latest known position per vessel currently in the AOI (simplified: latest N rows)."""
    return await db.query(TABLE, order_by="timestamp", desc=True, limit=limit)


@router.get("/{mmsi}", response_model=list[VesselPositionOut])
async def get_vessel_track(mmsi: str, limit: int = 100, db: JSONStore = Depends(get_db)):
    """Recent position history for one vessel."""
    return await db.query(
        TABLE, predicate=lambda r: r["mmsi"] == mmsi,
        order_by="timestamp", desc=True, limit=limit,
    )
