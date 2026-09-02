"""
POST /api/v1/reports

Generates an incident report in the requested format (json, markdown, pdf).

PDF generation uses reportlab when available; falls back to markdown text
if reportlab is not installed (which is fine for the prototype).

ReportGenerationRequest  (from frontend types/api.ts):
  incidentId, format, includeSatelliteImagery, includeDriftTrajectory,
  includeCandidateVessels, notes

ReportGenerationResponse:
  reportId, downloadUrl, generatedAt, status, summaryText
"""

import json
import textwrap
import uuid
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel

from app.db.session import get_db
from app.db.json_store import JSONStore
from app.models.incident import TABLE as INCIDENT_TABLE
from app.models.spill_candidate import TABLE as SPILL_TABLE

router = APIRouter(prefix="/reports", tags=["reports"])

REPORTS_DIR = Path("data/reports")
REPORTS_DIR.mkdir(parents=True, exist_ok=True)


# ── Request / response models ──────────────────────────────────────────────────

class ReportRequest(BaseModel):
    incidentId: str
    format: str = "json"                   # "pdf" | "json" | "markdown"
    includeSatelliteImagery: bool = False
    includeDriftTrajectory: bool = False
    includeCandidateVessels: bool = True
    notes: str | None = None


# ── Helpers ────────────────────────────────────────────────────────────────────

def _severity_label(risk_score: float) -> str:
    if risk_score >= 0.85:
        return "CRITICAL"
    if risk_score >= 0.70:
        return "HIGH"
    if risk_score >= 0.50:
        return "MEDIUM"
    return "LOW"


def _build_summary(incident: dict, candidate: dict | None) -> str:
    lat = incident.get("latitude", 0)
    lon = incident.get("longitude", 0)
    score = incident.get("risk_score", 0)
    severity = _severity_label(score)
    created = incident.get("created_at", datetime.now(timezone.utc))
    if isinstance(created, datetime):
        created_str = created.strftime("%Y-%m-%d %H:%M UTC")
    else:
        created_str = str(created)

    mmsi = incident.get("attributed_mmsi", "Unknown")
    conf = incident.get("attribution_confidence")
    attr_str = (
        f"Attributed to MMSI {mmsi} (confidence {conf:.0f}%)"
        if mmsi and conf
        else "Attribution pending"
    )

    area_str = ""
    if candidate:
        area_px = candidate.get("filter_breakdown", {}).get("sentry_sar", {}).get("area_px")
        if area_px:
            area_str = f"  Estimated area (pixel proxy): {area_px} px"

    return textwrap.dedent(f"""
        OceanShield AI — Incident Report
        =================================
        Incident ID  : {incident.get('id')}
        Detected     : {created_str}
        Location     : {lat:.5f}°N, {lon:.5f}°E
        Severity     : {severity}
        Risk Score   : {score:.2f}
        Status       : {incident.get('status', 'unknown')}
        Attribution  : {attr_str}{area_str}
        ICG Notified : {incident.get('icg_notified_at') or 'No'}
        ICG Ack      : {incident.get('icg_acknowledged_at') or 'Pending'}
    """).strip()


def _write_markdown(incident: dict, candidate: dict | None, req: ReportRequest,
                     report_id: str) -> Path:
    summary = _build_summary(incident, candidate)
    lines = [summary, ""]

    if req.notes:
        lines += ["\n## Analyst Notes", req.notes, ""]

    if req.includeCandidateVessels and incident.get("attributed_mmsi"):
        lines += [
            "\n## Attribution",
            f"- Primary suspect MMSI: {incident['attributed_mmsi']}",
            f"- Confidence: {incident.get('attribution_confidence', '?')}%",
        ]

    if req.includeSatelliteImagery:
        lines += [
            "\n## Satellite Imagery",
            "_SAR scene imagery not yet available in this prototype build._",
        ]

    if req.includeDriftTrajectory:
        lines += [
            "\n## Drift Trajectory",
            "_Drift simulation results — see /api/v1/attribution/{incident_id} "
            "for the full DriftAnalysis JSON._",
        ]

    content = "\n".join(lines)
    out = REPORTS_DIR / f"{report_id}.md"
    out.write_text(content, encoding="utf-8")
    return out


def _write_json_report(incident: dict, candidate: dict | None, req: ReportRequest,
                        report_id: str) -> Path:
    payload = {
        "reportId": report_id,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "incidentId": req.incidentId,
        "incident": dict(incident),
        "spillCandidate": dict(candidate) if candidate else None,
        "notes": req.notes,
    }
    out = REPORTS_DIR / f"{report_id}.json"
    out.write_text(json.dumps(payload, indent=2, default=str), encoding="utf-8")
    return out


def _write_pdf(incident: dict, candidate: dict | None, req: ReportRequest,
                report_id: str) -> Path | None:
    """Attempt PDF generation via reportlab; return None on ImportError."""
    try:
        from reportlab.lib.pagesizes import A4                          # noqa: PLC0415
        from reportlab.platypus import SimpleDocTemplate, Paragraph     # noqa: PLC0415
        from reportlab.lib.styles import getSampleStyleSheet            # noqa: PLC0415
    except ImportError:
        return None

    out = REPORTS_DIR / f"{report_id}.pdf"
    doc = SimpleDocTemplate(str(out), pagesize=A4)
    styles = getSampleStyleSheet()
    summary = _build_summary(incident, candidate)
    story = [Paragraph(line or "&nbsp;", styles["Normal"]) for line in summary.splitlines()]
    if req.notes:
        story.append(Paragraph(f"<b>Analyst Notes:</b> {req.notes}", styles["Normal"]))
    doc.build(story)
    return out


# ── Endpoint ───────────────────────────────────────────────────────────────────

@router.post("")
async def generate_report(
    req: ReportRequest,
    db: JSONStore = Depends(get_db),
) -> dict:
    # Resolve incident — accept bare integers ("42") or prefixed strings
    # like "INC-2026-42" or "INC-42" by extracting the trailing integer part.
    raw_id = req.incidentId.strip()
    try:
        incident_int_id = int(raw_id)
    except ValueError:
        # Try stripping any non-digit prefix (e.g. "INC-2026-42" → "42")
        import re as _re
        m = _re.search(r"(\d+)$", raw_id)
        if not m:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot parse incidentId '{raw_id}' — expected a number or 'INC-...-<number>'",
            )
        incident_int_id = int(m.group(1))

    incident = await db.get(INCIDENT_TABLE, incident_int_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    # Fetch linked spill candidate (if any)
    candidate = None
    if incident.get("spill_candidate_id"):
        candidate = await db.get(SPILL_TABLE, incident["spill_candidate_id"])

    report_id = f"RPT-{incident_int_id}-{uuid.uuid4().hex[:8].upper()}"
    generated_at = datetime.now(timezone.utc).isoformat()
    fmt = req.format.lower()

    if fmt == "pdf":
        path = _write_pdf(incident, candidate, req, report_id)
        if path is None:
            # reportlab not installed — fall back to markdown
            fmt = "markdown"
            path = _write_markdown(incident, candidate, req, report_id)
    elif fmt == "markdown":
        path = _write_markdown(incident, candidate, req, report_id)
    else:
        # default: json
        fmt = "json"
        path = _write_json_report(incident, candidate, req, report_id)

    summary = _build_summary(incident, candidate)
    download_url = f"/api/v1/reports/{report_id}/download"

    return {
        "reportId": report_id,
        "downloadUrl": download_url,
        "generatedAt": generated_at,
        "status": "COMPLETED",
        "summaryText": summary,
    }


@router.get("/{report_id}/download")
async def download_report(report_id: str) -> FileResponse:
    # Try all supported extensions
    for ext in (".json", ".md", ".pdf"):
        path = REPORTS_DIR / f"{report_id}{ext}"
        if path.exists():
            media_types = {
                ".json": "application/json",
                ".md": "text/markdown",
                ".pdf": "application/pdf",
            }
            return FileResponse(
                path=str(path),
                media_type=media_types[ext],
                filename=f"{report_id}{ext}",
            )
    raise HTTPException(status_code=404, detail="Report file not found")
