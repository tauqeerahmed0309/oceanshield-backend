"""
Layer 1: Wind speed filter.

Below ~3 m/s, calm water is visually indistinguishable from an oil slick
in SAR backscatter. Above ~10 m/s, rough seas can break up or mask real
slicks. Neither case rejects a candidate outright — both discount its
weight, since the signal is genuinely ambiguous either way.
"""

from datetime import datetime
from app.ingestion.weather_client import get_wind_speed_ms


def apply_wind_filter(lat: float, lon: float, timestamp: datetime) -> dict:
    wind_speed = get_wind_speed_ms(lat, lon, timestamp)

    weight = 1.0
    if wind_speed < 3.0:
        weight = 0.3
    elif wind_speed > 10.0:
        weight = 0.7

    return {"wind_speed_ms": wind_speed, "weight": weight}
