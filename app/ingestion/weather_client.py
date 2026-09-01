"""
Wind speed lookup via Open-Meteo (free, no API key required).
Used by filters/wind_filter.py to check conditions at a SAR candidate's
location/time.
"""

import requests
from datetime import datetime

from app.config import settings


def get_wind_speed_ms(lat: float, lon: float, timestamp: datetime) -> float:
    """
    Returns wind speed in m/s at the given location/time.
    Falls back to a moderate default (6.0 m/s) if the API call fails,
    so a transient network issue doesn't crash the pipeline — the
    candidate will just be scored without a strong wind signal.
    """
    date_str = timestamp.strftime("%Y-%m-%d")
    hour = timestamp.hour

    params = {
        "latitude": lat,
        "longitude": lon,
        "hourly": "wind_speed_10m",
        "start_date": date_str,
        "end_date": date_str,
        "wind_speed_unit": "ms",
    }

    try:
        resp = requests.get(settings.open_meteo_url, params=params, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        speeds = data["hourly"]["wind_speed_10m"]
        return float(speeds[hour])
    except (requests.RequestException, KeyError, IndexError, ValueError):
        return 6.0  # neutral fallback — see docstring
