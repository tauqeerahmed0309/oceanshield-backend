from datetime import datetime
from pydantic import BaseModel, ConfigDict


class VesselPositionOut(BaseModel):
    model_config = ConfigDict(extra='allow')
    
    id: int | None = None
    mmsi: str
    ship_name: str | None = None
    imo: str | None = None
    callsign: str | None = None
    flag: str | None = None
    type: str | None = None
    latitude: float
    longitude: float
    speed: float | None = None
    course: float | None = None
    sog: float | None = None
    cog: float | None = None
    timestamp: datetime
    status: str | None = None
    suspicious: bool = False
    anomalyReason: str | None = None
    anomalySeverity: str | None = None
