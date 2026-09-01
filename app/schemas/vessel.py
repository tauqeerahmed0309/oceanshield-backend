from datetime import datetime
from pydantic import BaseModel


class VesselPositionOut(BaseModel):
    mmsi: str
    ship_name: str | None = None
    latitude: float
    longitude: float
    sog: float | None = None
    cog: float | None = None
    timestamp: datetime

    class Config:
        from_attributes = True
