from fastapi import APIRouter, Depends

from app.db.session import get_db
from app.db.json_store import JSONStore
from app.models.ais_anomaly import TABLE
from app.schemas.anomaly import AISAnomalyOut

router = APIRouter(prefix="/anomalies", tags=["anomalies"])


@router.get("", response_model=list[AISAnomalyOut])
@router.get("/", response_model=list[AISAnomalyOut], include_in_schema=False)
async def list_recent_anomalies(limit: int = 100, db: JSONStore = Depends(get_db)):
    return await db.query(TABLE, order_by="detected_at", desc=True, limit=limit)
