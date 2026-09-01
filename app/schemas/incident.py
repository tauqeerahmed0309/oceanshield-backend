from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class IncidentOut(BaseModel):
    id: int
    latitude: float
    longitude: float
    risk_score: float
    attributed_mmsi: Optional[str] = None
    attribution_confidence: Optional[float] = None
    status: str
    icg_notified_at: Optional[datetime] = None
    icg_acknowledged_at: Optional[datetime] = None
    public_released_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True
