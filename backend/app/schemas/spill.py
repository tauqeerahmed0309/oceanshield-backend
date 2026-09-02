from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel


class SpillCandidateOut(BaseModel):
    id: int
    centroid_lat: float
    centroid_lon: float
    unet_confidence: float
    wind_speed_ms: Optional[float] = None
    lookalike_prob: Optional[float] = None
    spatial_weight: float
    ais_boost: float
    persistence_penalty: float
    final_score: Optional[float] = None
    verdict: Optional[str] = None
    filter_breakdown: Optional[dict[str, Any]] = None
    detected_at: datetime
    # Enriched fields added by the API layer
    regionName: Optional[str] = None
    confidencePct: Optional[float] = None
    areaSqKm: Optional[float] = None
    windSpeedKts: Optional[float] = None

    class Config:
        from_attributes = True


class ImageAnalysisRequest(BaseModel):
    latitude: float
    longitude: float
    timestamp: datetime
