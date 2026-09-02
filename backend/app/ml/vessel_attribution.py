"""
Enhanced Vessel Attribution Model.

Ranks potential culprit vessels based on:
1. Spatio-temporal proximity to spill origin
2. AIS behavioral anomalies (speed, course, dark gaps)
3. Vessel type risk (tankers > cargo > passenger)
4. Drift trajectory correlation
5. Historical behavior patterns

This implements the scoring methodology described in:
"Spatio-temporal correlation of AIS data for oil spill attribution"
"""

import math
from datetime import datetime, timedelta, timezone
from dataclasses import dataclass
from typing import Optional

import numpy as np
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler


# Vessel type risk weights (IMO ship type codes)
VESSEL_TYPE_RISK = {
    # Tankers - highest risk
    "Oil Tanker": 1.0,
    "Crude Oil Tanker": 1.0,
    "Chemical Tanker": 0.9,
    "Product Tanker": 0.95,
    "LPG Carrier": 0.7,
    "Oil/Chemical Tanker": 0.95,
    
    # Cargo - moderate risk
    "Bulk Carrier": 0.4,
    "Container Ship": 0.3,
    "General Cargo": 0.35,
    "RoRo Cargo": 0.2,
    
    # Other - lower risk
    "Passenger/RoRo": 0.15,
    "Passenger Ship": 0.1,
    "Fishing Vessel": 0.1,
    "Supply Vessel": 0.3,
    "Offshore Supply": 0.4,
    "Tug": 0.2,
    
    # Default
    "Unknown": 0.5,
}


@dataclass
class AttributionScore:
    """Detailed vessel attribution score."""
    mmsi: str
    ship_name: str
    vessel_type: str
    
    # Component scores (0-1)
    proximity_score: float
    temporal_score: float
    trajectory_score: float
    anomaly_score: float
    vessel_type_score: float
    behavior_score: float
    
    # Final score
    attribution_score: float
    attribution_confidence: float
    
    # Details
    distance_to_spill_km: float
    time_diff_hours: float
    nearby_anomaly_types: list


class VesselAttributionModel:
    """
    Multi-factor vessel attribution scoring.
    
    Scoring components:
    1. Proximity (30%): Distance from vessel to spill origin
    2. Temporal (20%): Time overlap with spill occurrence window
    3. Trajectory (20%): Vessel path correlation with drift hindcast
    4. Anomaly (15%): AIS behavioral anomalies
    5. Vessel Type (10%): Risk based on vessel type
    6. Behavior (5%): Historical behavior patterns
    """
    
    # Weight for each scoring component
    WEIGHTS = {
        "proximity": 0.30,
        "temporal": 0.20,
        "trajectory": 0.20,
        "anomaly": 0.15,
        "vessel_type": 0.10,
        "behavior": 0.05,
    }
    
    def __init__(self):
        self.scaler = StandardScaler()
        self._ml_model = None
        self._ml_trained = False
    
    def score_vessels(
        self,
        spill_lat: float,
        spill_lon: float,
        spill_time: datetime,
        vessels: list[dict],
        spill_radius_km: float = 20.0,
        spill_window_hours: float = 24.0,
        drift_origin: Optional[dict] = None
    ) -> list[AttributionScore]:
        """
        Score all candidate vessels for attribution.
        
        Args:
            spill_lat, spill_lon: Observed spill location
            spill_time: Time of spill observation
            vessels: List of vessel position records
            spill_radius_km: Search radius around spill
            spill_window_hours: Time window for vessel presence
            drift_origin: Optional hindcast origin point
            
        Returns:
            Ranked list of AttributionScore objects
        """
        # Use drift origin if provided, otherwise use spill location
        origin_lat = drift_origin.get("lat", spill_lat) if drift_origin else spill_lat
        origin_lon = drift_origin.get("lon", spill_lon) if drift_origin else spill_lon
        origin_time = drift_origin.get("time", spill_time) if drift_origin else spill_time
        
        scores = []
        
        for vessel in vessels:
            score = self._score_single_vessel(
                vessel, origin_lat, origin_lon, origin_time,
                spill_radius_km, spill_window_hours
            )
            if score:
                scores.append(score)
        
        # Sort by attribution score (highest first)
        scores.sort(key=lambda x: -x.attribution_score)
        
        return scores
    
    def _score_single_vessel(
        self,
        vessel: dict,
        origin_lat: float,
        origin_lon: float,
        origin_time: datetime,
        max_radius_km: float,
        time_window_hours: float
    ) -> Optional[AttributionScore]:
        """Score a single vessel for attribution."""
        
        mmsi = vessel.get("mmsi", "")
        ship_name = vessel.get("ship_name", "Unknown")
        vessel_type = vessel.get("type", "Unknown")
        
        v_lat = vessel.get("latitude", 0)
        v_lon = vessel.get("longitude", 0)
        v_time = vessel.get("timestamp")
        
        if isinstance(v_time, str):
            try:
                v_time = datetime.fromisoformat(v_time.replace("Z", "+00:00"))
            except:
                v_time = None
        
        if v_time is None:
            return None
        
        # 1. Proximity score
        distance_km = self._haversine_distance(v_lat, v_lon, origin_lat, origin_lon)
        proximity_score = max(0, 1.0 - (distance_km / max_radius_km))
        
        # 2. Temporal score
        time_diff_hours = abs((v_time - origin_time).total_seconds()) / 3600
        temporal_score = max(0, 1.0 - (time_diff_hours / time_window_hours))
        
        # 3. Trajectory score (simplified - check if vessel was moving toward spill area)
        trajectory_score = self._compute_trajectory_score(vessel, origin_lat, origin_lon)
        
        # 4. Anomaly score
        anomaly_score = self._compute_anomaly_score(vessel)
        
        # 5. Vessel type risk
        vessel_type_score = VESSEL_TYPE_RISK.get(vessel_type, 0.5)
        
        # 6. Behavior score (based on speed, course patterns)
        behavior_score = self._compute_behavior_score(vessel)
        
        # Find nearby anomalies
        nearby_anomalies = vessel.get("anomalyReason", "")
        anomaly_types = [nearby_anomalies] if nearby_anomalies else []
        
        # Weighted combination
        attribution_score = (
            self.WEIGHTS["proximity"] * proximity_score +
            self.WEIGHTS["temporal"] * temporal_score +
            self.WEIGHTS["trajectory"] * trajectory_score +
            self.WEIGHTS["anomaly"] * anomaly_score +
            self.WEIGHTS["vessel_type"] * vessel_type_score +
            self.WEIGHTS["behavior"] * behavior_score
        )
        
        # Confidence based on score magnitude and data quality
        confidence_factors = [
            proximity_score > 0.5,  # Close enough
            temporal_score > 0.5,   # Right time
            anomaly_score > 0.3,    # Has anomalies
        ]
        confidence = attribution_score * (0.7 + 0.1 * sum(confidence_factors))
        
        return AttributionScore(
            mmsi=mmsi,
            ship_name=ship_name,
            vessel_type=vessel_type,
            proximity_score=round(proximity_score, 3),
            temporal_score=round(temporal_score, 3),
            trajectory_score=round(trajectory_score, 3),
            anomaly_score=round(anomaly_score, 3),
            vessel_type_score=round(vessel_type_score, 3),
            behavior_score=round(behavior_score, 3),
            attribution_score=round(attribution_score, 3),
            attribution_confidence=round(min(confidence * 100, 99.0), 1),
            distance_to_spill_km=round(distance_km, 2),
            time_diff_hours=round(time_diff_hours, 1),
            nearby_anomaly_types=anomaly_types,
        )
    
    def _compute_trajectory_score(self, vessel: dict, origin_lat: float, origin_lon: float) -> float:
        """
        Compute trajectory correlation score.
        
        Checks if vessel's course was directed toward the spill origin.
        """
        speed = vessel.get("speed", 0) or vessel.get("sog", 0) or 0
        course = vessel.get("course", 0) or vessel.get("cog", 0) or 0
        
        if speed < 0.5:  # Vessel is essentially stationary
            return 0.3
        
        # Calculate bearing from vessel to origin
        v_lat = vessel.get("latitude", 0)
        v_lon = vessel.get("longitude", 0)
        
        bearing = self._calculate_bearing(v_lat, v_lon, origin_lat, origin_lon)
        
        # Course deviation (how aligned is vessel's course with direction to origin)
        course_diff = abs(course - bearing)
        if course_diff > 180:
            course_diff = 360 - course_diff
        
        # Score: 1.0 if perfectly aligned, 0.0 if opposite
        trajectory_score = max(0, 1.0 - (course_diff / 180.0))
        
        return trajectory_score
    
    def _compute_anomaly_score(self, vessel: dict) -> float:
        """Compute anomaly-based score."""
        anomaly_score = vessel.get("anomaly_score", 0)
        
        if vessel.get("suspicious"):
            anomaly_score = max(anomaly_score, 0.7)
        
        if vessel.get("anomalySeverity") == "CRITICAL":
            anomaly_score = max(anomaly_score, 0.9)
        elif vessel.get("anomalySeverity") == "HIGH":
            anomaly_score = max(anomaly_score, 0.7)
        elif vessel.get("anomalySeverity") == "MEDIUM":
            anomaly_score = max(anomaly_score, 0.5)
        
        return min(anomaly_score, 1.0)
    
    def _compute_behavior_score(self, vessel: dict) -> float:
        """
        Compute behavior-based score.
        
        Factors:
        - Speed anomalies (very slow = possible discharge)
        - Course deviations
        - AIS gaps
        """
        speed = vessel.get("speed", 0) or vessel.get("sog", 0) or 0
        
        score = 0.5  # baseline
        
        # Very low speed in open water is suspicious
        if 0.5 < speed < 3.0:
            score += 0.2  # Possible slow steaming or discharge
        
        # Status indicators
        status = str(vessel.get("status", ""))
        if status in ["5", "6", "7", "8"]:  # Not under command, restricted, constrained
            score += 0.15
        
        # AIS gap detection
        if vessel.get("anomalyReason", "").lower().find("gap") >= 0:
            score += 0.2
        
        return min(score, 1.0)
    
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
        R = 6371.0
        
        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        
        a = math.sin(dlat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon/2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        
        return R * c
    
    def train_ml_model(self, training_data: list[dict]):
        """
        Train a gradient boosting model on historical attribution data.
        
        training_data: list of dicts with features and labels
        """
        if len(training_data) < 50:
            print("Need at least 50 samples to train ML model")
            return
        
        features = []
        labels = []
        
        for sample in training_data:
            feat = [
                sample.get("proximity_score", 0),
                sample.get("temporal_score", 0),
                sample.get("trajectory_score", 0),
                sample.get("anomaly_score", 0),
                sample.get("vessel_type_score", 0),
                sample.get("behavior_score", 0),
                sample.get("distance_to_spill_km", 0) / 100.0,
                sample.get("time_diff_hours", 0) / 24.0,
            ]
            features.append(feat)
            labels.append(sample.get("is_actual_culprit", 0))
        
        X = np.array(features)
        y = np.array(labels)
        
        self.scaler.fit(X)
        X_scaled = self.scaler.transform(X)
        
        self._ml_model = GradientBoostingClassifier(
            n_estimators=100,
            max_depth=4,
            learning_rate=0.1,
            random_state=42
        )
        self._ml_model.fit(X_scaled, y)
        self._ml_trained = True
        
        accuracy = self._ml_model.score(X_scaled, y)
        print(f"ML attribution model trained. Accuracy: {accuracy:.2%}")
    
    def predict_with_ml(self, vessel: dict) -> float:
        """Use trained ML model to predict attribution probability."""
        if not self._ml_trained or self._ml_model is None:
            return None
        
        feat = [
            vessel.get("proximity_score", 0),
            vessel.get("temporal_score", 0),
            vessel.get("trajectory_score", 0),
            vessel.get("anomaly_score", 0),
            vessel.get("vessel_type_score", 0),
            vessel.get("behavior_score", 0),
            vessel.get("distance_to_spill_km", 0) / 100.0,
            vessel.get("time_diff_hours", 0) / 24.0,
        ]
        
        X = self.scaler.transform([feat])
        prob = self._ml_model.predict_proba(X)[0][1]
        
        return round(prob, 3)


# Singleton instance
vessel_attribution_model = VesselAttributionModel()
