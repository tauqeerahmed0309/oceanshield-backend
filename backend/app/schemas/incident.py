"""
Incident response schema — matches frontend types/incident.ts exactly.

Frontend expects:
  id (string), title, latitude, longitude, timestamp (ISO string),
  severity (LOW|MEDIUM|HIGH|CRITICAL), status (DETECTED|VERIFYING|VERIFIED|ATTRIBUTION|ATTRIBUTED|REJECTED),
  spillConfidence (0-100), affectedAreaSqKm?, estimatedVolumeBarrels?,
  probableSourceVesselMmsi?, probableSourceVesselName?,
  attributionConfidence (HIGH|MEDIUM|LOW)?, evidenceCount?,
  sensorSource?, notes?
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, field_validator, model_validator
import math


class IncidentOut(BaseModel):
    id: str
    title: str
    latitude: float
    longitude: float
    timestamp: str                         # ISO string
    severity: str = "MEDIUM"              # LOW|MEDIUM|HIGH|CRITICAL
    status: str = "DETECTED"             # frontend VerificationStatus enum
    spillConfidence: float = 0            # 0-100
    affectedAreaSqKm: Optional[float] = None
    estimatedVolumeBarrels: Optional[float] = None
    probableSourceVesselMmsi: Optional[str] = None
    probableSourceVesselName: Optional[str] = None
    attributionConfidence: Optional[str] = None   # HIGH|MEDIUM|LOW
    evidenceCount: Optional[int] = None
    sensorSource: Optional[str] = None
    notes: Optional[str] = None

    class Config:
        from_attributes = True
        extra = "allow"


def db_record_to_incident(r: dict) -> dict:
    """
    Convert a raw DB incident record (old internal schema) to the
    frontend-facing IncidentOut shape.
    """
    risk_score = float(r.get("risk_score", 0.5))
    spill_confidence = round(risk_score * 100, 1)

    # Severity from risk score
    if risk_score >= 0.85:
        severity = "CRITICAL"
    elif risk_score >= 0.70:
        severity = "HIGH"
    elif risk_score >= 0.50:
        severity = "MEDIUM"
    else:
        severity = "LOW"

    # Status mapping: internal status → frontend VerificationStatus
    internal_status = r.get("status", "confirmed_pending_notification")
    status_map = {
        "confirmed_public": "ATTRIBUTED",
        "confirmed_pending_notification": "VERIFIED",
        "verifying": "VERIFYING",
        "detected": "DETECTED",
        "rejected": "REJECTED",
    }
    status = status_map.get(internal_status, "VERIFIED")

    # Attribution confidence bucket
    attr_conf_raw = r.get("attribution_confidence")
    if attr_conf_raw is not None:
        attr_conf_raw = float(attr_conf_raw)
        if attr_conf_raw >= 70:
            attr_conf = "HIGH"
        elif attr_conf_raw >= 40:
            attr_conf = "MEDIUM"
        else:
            attr_conf = "LOW"
    else:
        attr_conf = None

    # Timestamp
    ts = r.get("created_at", r.get("detected_at"))
    if isinstance(ts, datetime):
        ts_str = ts.isoformat()
    else:
        ts_str = str(ts) if ts else datetime.utcnow().isoformat()

    # ID as string (frontend expects "INC-YYYY-NNNN" style)
    raw_id = r.get("id", 0)
    inc_id = f"INC-{ts_str[:4]}-{str(raw_id).zfill(4)}"

    lat = float(r.get("latitude", 0))
    lon = float(r.get("longitude", 0))

    # Rough area from spill candidate if linked
    area = r.get("_area_sq_km")
    if area is None and risk_score > 0:
        # proxy: higher score → bigger estimated area
        area = round(risk_score * 20, 2)

    return {
        "id": inc_id,
        "title": r.get("_title") or f"Oil Spill Detection — {lat:.2f}°N {lon:.2f}°E",
        "latitude": lat,
        "longitude": lon,
        "timestamp": ts_str,
        "severity": severity,
        "status": status,
        "spillConfidence": spill_confidence,
        "affectedAreaSqKm": area,
        "estimatedVolumeBarrels": round(area * 22, 0) if area else None,
        "probableSourceVesselMmsi": r.get("attributed_mmsi"),
        "probableSourceVesselName": r.get("attributed_vessel_name"),
        "attributionConfidence": attr_conf,
        "evidenceCount": r.get("_evidence_count", 3 if r.get("attributed_mmsi") else 1),
        "sensorSource": r.get("_sensor_source", "Sentinel-1A SAR (C-band VV)"),
        "notes": r.get("notes"),
    }
