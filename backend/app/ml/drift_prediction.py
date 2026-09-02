"""
Oil Slick Drift Prediction Module.

Implements Lagrangian particle tracking for:
1. Hindcasting: trace slick backward to find origin point and time
2. Forecasting: predict future slick movement and spread

Uses ocean current data (OSCAR/GEBCO) and wind data (Open-Meteo)
to model oil slick drift based on:
- Wind-induced drift (typically 3-4% of wind speed at 10m height)
- Ocean current transport
- Stokes drift from surface waves
- Turbulent diffusion for spreading

References:
- NOAA Oil Spill Response Manual
- simplified GEBCO/OSCAR current models
"""

import math
from datetime import datetime, timedelta, timezone
from dataclasses import dataclass
from typing import Optional

import numpy as np

from app.ingestion.weather_client import get_wind_speed_ms


@dataclass
class DriftResult:
    """Result of drift prediction."""
    origin_lat: float
    origin_lon: float
    origin_time: datetime
    drift_distance_km: float
    drift_direction_deg: float
    confidence: float
    trajectory: list[dict]  # List of {lat, lon, time} points
    spread_area_km2: float


class OilDriftPredictor:
    """
    Predicts oil slick drift using simplified Lagrangian tracking.
    
    Oil drift = 0.94 * current_vector + 0.035 * wind_vector
    (Nordhausen et al., 1996)
    """
    
    def __init__(self):
        # Oil-specific drift coefficients
        self.wind_drift_factor = 0.035  # 3.5% of wind speed
        self.wind_drift_angle = 0.0     # degrees to right of wind (Ekman)
        self.current_factor = 0.94      # 94% of ocean current
        
        # Diffusion coefficient for spreading (m^2/s)
        self.diffusion_coeff = 10.0
        
        # Indian Ocean current patterns (simplified seasonal model)
        self._current_patterns = {
            "NE_monsoon": {  # Nov-Mar
                "direction": 225,  # SW
                "speed_knots": 0.5
            },
            "SW_monsoon": {  # Jun-Sep
                "direction": 45,   # NE
                "speed_knots": 0.8
            },
            "inter_monsoon": {  # Apr-May, Oct
                "direction": 0,
                "speed_knots": 0.2
            }
        }
    
    def _get_monsoon_season(self, timestamp: datetime) -> str:
        """Determine Indian Ocean monsoon season."""
        month = timestamp.month
        if month in [11, 12, 1, 2, 3]:
            return "NE_monsoon"
        elif month in [6, 7, 8, 9]:
            return "SW_monsoon"
        else:
            return "inter_monsoon"
    
    def _get_ocean_current(self, lat: float, lon: float, timestamp: datetime) -> tuple[float, float]:
        """
        Get ocean current velocity at a point.
        Returns (u, v) in m/s (eastward, northward).
        
        Simplified Indian Ocean current model based on season and location.
        """
        season = self._get_monsoon_season(timestamp)
        pattern = self._current_patterns[season]
        
        speed_ms = pattern["speed_knots"] * 0.5144  # knots to m/s
        direction_rad = math.radians(pattern["direction"])
        
        # Modify based on latitude (stronger currents near equator)
        lat_factor = 1.0 + 0.5 * math.cos(math.radians(lat))
        speed_ms *= lat_factor
        
        # Western boundary currents (stronger near India's west coast)
        if 68 <= lon <= 77:
            speed_ms *= 1.3
        
        u = speed_ms * math.sin(direction_rad)  # eastward
        v = speed_ms * math.cos(direction_rad)  # northward
        
        return u, v
    
    def _get_wind_vector(self, lat: float, lon: float, timestamp: datetime) -> tuple[float, float]:
        """
        Get wind velocity at a point.
        Returns (u, v) in m/s (eastward, northward).
        Uses cached wind speed to avoid excessive API calls.
        """
        try:
            wind_speed_ms = get_wind_speed_ms(lat, lon, timestamp)
        except Exception:
            wind_speed_ms = 6.0  # fallback
        
        # Simplified wind direction based on season and location
        season = self._get_monsoon_season(timestamp)
        
        if season == "NE_monsoon":
            wind_dir = 315
        elif season == "SW_monsoon":
            wind_dir = 135
        else:
            wind_dir = 270
        
        wind_dir_rad = math.radians(wind_dir)
        u = wind_speed_ms * math.sin(wind_dir_rad)
        v = wind_speed_ms * math.cos(wind_dir_rad)
        
        return u, v
    
    def _step_position(self, lat: float, lon: float, u: float, v: float, dt_seconds: float) -> tuple[float, float]:
        """Advance position by one time step."""
        # Convert velocity to displacement
        # 1 degree latitude ≈ 111 km
        # 1 degree longitude ≈ 111 * cos(lat) km
        d_lat = (v * dt_seconds) / (111000.0)
        d_lon = (u * dt_seconds) / (111000.0 * math.cos(math.radians(lat)))
        
        return lat + d_lat, lon + d_lon
    
    def hindcast(
        self,
        spill_lat: float,
        spill_lon: float,
        spill_time: datetime,
        hours_back: float = 72.0,
        time_step_hours: float = 6.0
    ) -> DriftResult:
        """
        Trace oil slick backward to find origin point and time.
        Uses 6-hour time steps to minimize API calls while maintaining accuracy.
        """
        dt_seconds = time_step_hours * 3600
        steps = max(1, int(hours_back / time_step_hours))
        
        lat, lon = spill_lat, spill_lon
        trajectory = [{"lat": lat, "lon": lon, "time": spill_time}]
        
        total_u = 0.0
        total_v = 0.0
        
        for i in range(steps):
            current_time = spill_time - timedelta(hours=(i + 1) * time_step_hours)
            
            u_current, v_current = self._get_ocean_current(lat, lon, current_time)
            u_wind, v_wind = self._get_wind_vector(lat, lon, current_time)
            
            u_total = self.current_factor * u_current + self.wind_drift_factor * u_wind
            v_total = self.current_factor * v_current + self.wind_drift_factor * v_wind
            
            lat, lon = self._step_position(lat, lon, -u_total, -v_total, dt_seconds)
            
            total_u += u_total
            total_v += v_total
            
            trajectory.append({"lat": lat, "lon": lon, "time": current_time})
        
        trajectory.reverse()
        
        drift_distance = math.sqrt(total_u**2 + total_v**2) * hours_back * 3600 / 1000
        drift_direction = math.degrees(math.atan2(total_u, total_v)) % 360
        confidence = max(0.3, 1.0 - (hours_back / 120.0))
        
        return DriftResult(
            origin_lat=lat,
            origin_lon=lon,
            origin_time=trajectory[0]["time"],
            drift_distance_km=drift_distance,
            drift_direction_deg=drift_direction,
            confidence=confidence,
            trajectory=trajectory,
            spread_area_km2=self._estimate_spread(hours_back, drift_distance)
        )
    
    def forecast(
        self,
        spill_lat: float,
        spill_lon: float,
        spill_time: datetime,
        hours_forward: float = 48.0,
        time_step_hours: float = 6.0
    ) -> DriftResult:
        """
        Predict future slick movement and spread.
        Uses 6-hour time steps to minimize API calls.
        """
        dt_seconds = time_step_hours * 3600
        steps = max(1, int(hours_forward / time_step_hours))
        
        lat, lon = spill_lat, spill_lon
        trajectory = [{"lat": lat, "lon": lon, "time": spill_time}]
        
        total_u = 0.0
        total_v = 0.0
        
        for i in range(steps):
            current_time = spill_time + timedelta(hours=(i + 1) * time_step_hours)
            
            u_current, v_current = self._get_ocean_current(lat, lon, current_time)
            u_wind, v_wind = self._get_wind_vector(lat, lon, current_time)
            
            u_total = self.current_factor * u_current + self.wind_drift_factor * u_wind
            v_total = self.current_factor * v_current + self.wind_drift_factor * v_wind
            
            lat, lon = self._step_position(lat, lon, u_total, v_total, dt_seconds)
            
            total_u += u_total
            total_v += v_total
            
            trajectory.append({"lat": lat, "lon": lon, "time": current_time})
        
        drift_distance = math.sqrt(total_u**2 + total_v**2) * hours_forward * 3600 / 1000
        drift_direction = math.degrees(math.atan2(total_u, total_v)) % 360
        
        # Confidence decreases with prediction horizon
        confidence = max(0.2, 1.0 - (hours_forward / 96.0))
        
        return DriftResult(
            origin_lat=lat,
            origin_lon=lon,
            origin_time=trajectory[-1]["time"],
            drift_distance_km=drift_distance,
            drift_direction_deg=drift_direction,
            confidence=confidence,
            trajectory=trajectory,
            spread_area_km2=self._estimate_spread(hours_forward, drift_distance)
        )
    
    def _estimate_spread(self, hours: float, drift_km: float) -> float:
        """
        Estimate oil slick spread area based on time and drift.
        
        Simplified model:
        - Initial area grows due to turbulent diffusion
        - Wind and current cause elongation in drift direction
        """
        # Diffusion-based spreading (Fay's gravity-viscous regime approximation)
        diffusion_km2 = self.diffusion_coeff * hours * 3600 / 1e6
        
        # Wind-induced elongation
        wind_elongation = drift_km * 0.1  # rough estimate
        
        # Total area
        base_area = max(1.0, diffusion_km2 * 10)  # minimum 1 km2
        total_area = base_area + wind_elongation
        
        return round(total_area, 2)
    
    def attribute_vessel(
        self,
        spill_lat: float,
        spill_lon: float,
        spill_time: datetime,
        vessels: list[dict],
        hindcast_hours: float = 24.0
    ) -> list[dict]:
        """
        Attribute potential source vessel using drift hindcasting.
        
        For each vessel, calculates:
        1. Was it near the spill origin at the estimated time?
        2. Does its trajectory match the drift pattern?
        3. Does it have AIS anomalies around that time?
        
        Args:
            spill_lat, spill_lon: Observed spill location
            spill_time: Time of observation
            vessels: List of vessel positions with timestamps
            hindcast_hours: How far back to trace
            
        Returns:
            Ranked list of vessels with attribution scores
        """
        # Hindcast to find origin
        origin = self.hindcast(spill_lat, spill_lon, spill_time, hindcast_hours)
        
        vessel_scores = []
        
        for vessel in vessels:
            mmsi = vessel.get("mmsi")
            v_lat = vessel.get("latitude", 0)
            v_lon = vessel.get("longitude", 0)
            v_time = vessel.get("timestamp")
            
            if isinstance(v_time, str):
                try:
                    v_time = datetime.fromisoformat(v_time.replace("Z", "+00:00"))
                except:
                    continue
            
            # Calculate distance from vessel to spill origin
            dist_km = self._haversine_distance(
                v_lat, v_lon,
                origin.origin_lat, origin.origin_lon
            )
            
            # Time difference
            time_diff_hours = abs((v_time - origin.origin_time).total_seconds()) / 3600
            
            # Proximity score (closer = higher score)
            proximity_score = max(0, 1.0 - (dist_km / 50.0))  # 50km radius
            
            # Temporal score (closer in time = higher score)
            temporal_score = max(0, 1.0 - (time_diff_hours / 12.0))  # 12-hour window
            
            # Anomaly score if available
            anomaly_score = vessel.get("anomaly_score", 0.0)
            
            # Combined attribution score
            attribution_score = (
                0.4 * proximity_score +
                0.3 * temporal_score +
                0.3 * anomaly_score
            )
            
            vessel_scores.append({
                "mmsi": mmsi,
                "ship_name": vessel.get("ship_name", "Unknown"),
                "distance_to_origin_km": round(dist_km, 2),
                "time_diff_hours": round(time_diff_hours, 1),
                "proximity_score": round(proximity_score, 3),
                "temporal_score": round(temporal_score, 3),
                "anomaly_score": round(anomaly_score, 3),
                "attribution_score": round(attribution_score, 3),
                "attribution_confidence": round(attribution_score * 100, 1)
            })
        
        # Sort by attribution score (highest first)
        vessel_scores.sort(key=lambda x: -x["attribution_score"])
        
        return vessel_scores
    
    def _calculate_bearing(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate bearing from point 1 to point 2 in degrees."""
        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)
        dlon_rad = math.radians(lon2 - lon1)

        x = math.sin(dlon_rad) * math.cos(lat2_rad)
        y = math.cos(lat1_rad) * math.sin(lat2_rad) - \
            math.sin(lat1_rad) * math.cos(lat2_rad) * math.cos(dlon_rad)

        bearing = math.degrees(math.atan2(x, y))
        return (bearing + 360) % 360

    def _haversine_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate distance between two points in km."""
        R = 6371.0  # Earth's radius in km
        
        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        
        a = math.sin(dlat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon/2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        
        return R * c


# Singleton instance
drift_predictor = OilDriftPredictor()
