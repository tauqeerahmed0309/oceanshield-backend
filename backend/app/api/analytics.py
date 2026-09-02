"""
GET /api/v1/analytics

Aggregated statistics for the OceanShield dashboard.
Works with live data — shows real vessel counts and anomaly types
even when there are zero historical incidents.
"""

from collections import defaultdict
from datetime import datetime, timezone

from fastapi import APIRouter, Depends

from app.db.session import get_db
from app.db.json_store import JSONStore
from app.models.incident import TABLE as INCIDENT_TABLE
from app.models.vessel_position import TABLE as VESSEL_TABLE
from app.models.ais_anomaly import TABLE as ANOMALY_TABLE
from app.models.spill_candidate import TABLE as SPILL_TABLE

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("")
@router.get("/", include_in_schema=False)
async def get_analytics(db: JSONStore = Depends(get_db)) -> dict:
    now = datetime.now(timezone.utc)

    incidents = await db.all(INCIDENT_TABLE)
    vessels = await db.all(VESSEL_TABLE)
    anomalies = await db.all(ANOMALY_TABLE)
    spills = await db.all(SPILL_TABLE)

    # ── Key metrics ───────────────────────────────────────────────────────────
    total_incidents = len(incidents)
    active_monitored_vessels = len({v["mmsi"] for v in vessels})
    confirmed_spills = [s for s in spills if s.get("verdict") == "confirmed"]
    total_spill_area_sq_km = round(len(confirmed_spills) * 0.5, 2)

    attributed = [i for i in incidents if i.get("attributed_mmsi")]
    attribution_success_rate = (
        round(len(attributed) / len(incidents) * 100, 1) if incidents else 0.0
    )

    # ── Monthly incidents (last 12 months) ────────────────────────────────────
    month_counts: dict[str, dict] = {}
    for i in incidents:
        ts = i.get("created_at")
        if not isinstance(ts, datetime):
            continue
        key = ts.strftime("%b %Y")
        if key not in month_counts:
            month_counts[key] = {"month": key, "incidents": 0, "areaSqKm": 0.0}
        month_counts[key]["incidents"] += 1
        month_counts[key]["areaSqKm"] = round(month_counts[key]["areaSqKm"] + 0.5, 2)

    monthly_incidents = sorted(
        month_counts.values(),
        key=lambda x: datetime.strptime(x["month"], "%b %Y"),
    )[-12:]

    # ── Vessel anomalies by type ───────────────────────────────────────────────
    type_counts: dict[str, int] = defaultdict(int)
    for a in anomalies:
        label = a.get("anomaly_type", "unknown").replace("_", " ").title()
        type_counts[label] += 1

    vessel_anomalies_by_type = [
        {"category": label, "count": count}
        for label, count in sorted(type_counts.items(), key=lambda x: -x[1])
    ]

    # ── Risk regions ──────────────────────────────────────────────────────────
    # Base on incidents; if none, base on live vessel positions
    region_map: dict[str, dict] = defaultdict(lambda: {"riskScore": 0.0, "incidents": 0, "_scores": []})

    sources = incidents if incidents else vessels
    for item in sources:
        lat = item.get("latitude", 0)
        lon = item.get("longitude", 0)
        region_key = f"{int(lat):.0f}°N {int(lon):.0f}°E"
        region_map[region_key]["incidents"] += 1
        region_map[region_key]["_scores"].append(item.get("risk_score", 0.3))

    risk_regions = []
    for region, data in region_map.items():
        scores = data.pop("_scores", [])
        avg = round(sum(scores) / len(scores) * 100, 1) if scores else 0.0
        risk_regions.append({"region": region, "riskScore": avg, "incidents": data["incidents"]})
    risk_regions.sort(key=lambda x: -x["riskScore"])

    return {
        "totalIncidents": total_incidents,
        "activeMonitoredVessels": active_monitored_vessels,
        "totalSpillAreaSqKm": total_spill_area_sq_km,
        "attributionSuccessRate": attribution_success_rate,
        "monthlyIncidents": monthly_incidents,
        "vesselAnomaliesByType": vessel_anomalies_by_type,
        "riskRegions": risk_regions[:10],
    }
