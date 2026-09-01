from datetime import datetime
from pydantic import BaseModel


class AISAnomalyOut(BaseModel):
    mmsi: str
    latitude: float
    longitude: float
    anomaly_type: str
    anomaly_score: float
    detected_at: datetime

    class Config:
        from_attributes = True
