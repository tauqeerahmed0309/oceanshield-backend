"""
Wind speed lookup via Open-Meteo (free, no API key required).
Used by filters/wind_filter.py to check conditions at a SAR candidate's
location/time.

Results are cached by (rounded lat, lon, date+hour) so a burst of
candidates in the same area only makes one network call per hour slot.
"""

import logging
import requests
from datetime import datetime
from functools import lru_cache

from app.config import settings

logger = logging.getLogger("weather_client")

# Round coordinates to 0.5° grid for caching — good enough for wind
_GRID = 0.5


def _round(v: float) -> float:
    return round(v / _GRID) * _GRID


@lru_cache(maxsize=512)
def _cached_wind(lat_r: float, lon_r: float, date_str: str, hour: int) -> float:
    """Cached inner call — key is rounded lat/lon + date + hour."""
    params = {
        "latitude": lat_r,
        "longitude": lon_r,
        "hourly": "wind_speed_10m",
        "start_date": date_str,
        "end_date": date_str,
        "wind_speed_unit": "ms",
    }
    try:
        resp = requests.get(settings.open_meteo_url, params=params, timeout=5)
        resp.raise_for_status()
        data = resp.json()
        speeds = data["hourly"]["wind_speed_10m"]
        return float(speeds[hour])
    except Exception:
        return 6.0  # neutral fallback


def get_wind_speed_ms(lat: float, lon: float, timestamp: datetime) -> float:
    """
    Returns wind speed in m/s at the given location/time.
    Results are LRU-cached by grid cell + hour so repeated calls for
    nearby candidates don't generate redundant network requests.
    Falls back to 6.0 m/s on any error.
    """
    try:
        return _cached_wind(
            _round(lat), _round(lon),
            timestamp.strftime("%Y-%m-%d"),
            timestamp.hour,
        )
    except Exception:
        return 6.0
