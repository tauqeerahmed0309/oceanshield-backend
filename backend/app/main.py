"""
FastAPI application entrypoint — OceanShield AI backend.

Startup sequence:
  1. Initialise JSON-file data store (mkdir).
  2. Launch AIS supervisor (live aisstream.io → auto-fallback to JSON replay).
  3. Schedule anomaly-detection job (every ANOMALY_WINDOW_MINUTES minutes).
  4. Schedule spill-pipeline job (anomaly → candidate → incident, offset 30 s).
  5. Schedule daily SAR catalogue poll (GEE SENTRY-SAR or Copernicus path).

Registered API routers  (all under /api/v1):
  /vessels       — AIS vessel positions + tracks
  /anomalies     — AIS anomaly events
  /spills        — SAR spill candidates + on-demand image analysis
  /incidents     — Confirmed oil-spill incidents
  /alerts        — ICG notification status + acknowledgement
  /analytics     — Dashboard aggregates
  /attribution   — Drift analysis + vessel attribution for one incident
  /reports       — Incident report generation (JSON / Markdown / PDF)
  /satellite     — SAR scene acquisitions + spill detections
  /health        — Service liveness probe
"""

import asyncio
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.db.session import init_db, prune_seeded_records
from app.ingestion.ais_supervisor import AISSupervisor
from app.tasks.run_anomaly_detection import run_anomaly_detection_job
from app.tasks.run_spill_pipeline import run_spill_pipeline_job
from app.tasks.poll_sar_catalogue import run_daily_sar_poll
from app.config import settings

from app.api import vessels, anomalies, spills, incidents, alerts
from app.api import analytics, attribution, reports, satellite, drift
from app.ingestion.aisstream_client import run_history_flush_task

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("main")

# ── App & middleware ───────────────────────────────────────────────────────────

app = FastAPI(
    title="OceanShield AI",
    version="0.2.0",
    description=(
        "Maritime pollution monitoring: live AIS tracking, "
        "Sentinel-1 SAR spill detection via Google Earth Engine (SENTRY-SAR), "
        "and ICG-first incident alerting."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ────────────────────────────────────────────────────────────────────

_prefix = "/api/v1"

app.include_router(vessels.router,     prefix=_prefix)
app.include_router(anomalies.router,   prefix=_prefix)
app.include_router(spills.router,      prefix=_prefix)
app.include_router(incidents.router,   prefix=_prefix)
app.include_router(alerts.router,      prefix=_prefix)
app.include_router(analytics.router,   prefix=_prefix)
app.include_router(attribution.router, prefix=_prefix)
app.include_router(reports.router,     prefix=_prefix)
app.include_router(satellite.router,   prefix=_prefix)
app.include_router(drift.router,       prefix=_prefix)

# ── Background services ────────────────────────────────────────────────────────

scheduler = AsyncIOScheduler()
ais_supervisor = AISSupervisor()


@app.on_event("startup")
async def on_startup():
    await init_db()

    # Prune any seed records from the live-pipeline tables now that the
    # process is starting up — if real data already exists from a previous
    # session the seeds will be removed immediately; if not, they stay as
    # placeholders until the first anomaly detection pass writes real data.
    await prune_seeded_records()

    # AIS supervisor: connects live → auto-falls back to JSON replay → auto-
    # reconnects live when reachable.  Runs indefinitely in the background.
    asyncio.create_task(ais_supervisor.run())

    # History flush task: drains the in-memory AIS history buffer to disk
    # every 30 s so the anomaly detector always has fresh data without
    # blocking the event loop on every incoming message.
    asyncio.create_task(run_history_flush_task())

    # Anomaly detection: re-scores a rolling window of vessel positions.
    # Run every 5 minutes (capped) so the dashboard stays fresh.
    _anomaly_interval = max(min(settings.anomaly_window_minutes, 5), 1)
    scheduler.add_job(
        run_anomaly_detection_job,
        "interval",
        minutes=_anomaly_interval,
        id="anomaly_detection",
        replace_existing=True,
    )

    # Spill pipeline: converts high-score AIS anomalies into spill candidates
    # and auto-promotes confirmed candidates to incidents with attribution.
    # Runs 30 s after anomaly detection so fresh anomalies are available.
    scheduler.add_job(
        run_spill_pipeline_job,
        "interval",
        minutes=_anomaly_interval,
        seconds=30,           # 30-second offset so anomalies are written first
        id="spill_pipeline",
        replace_existing=True,
    )

    # SAR catalogue poll: GEE SENTRY-SAR path when GEE_PROJECT_ID is set,
    # else falls back to Copernicus Data Space catalogue.
    scheduler.add_job(
        run_daily_sar_poll,
        "interval",
        hours=24,
        id="sar_poll",
        replace_existing=True,
    )

    scheduler.start()

    # Run anomaly detection once right away (after a short delay to let AIS
    # data accumulate) so the dashboard shows real results immediately.
    async def _run_startup_anomaly_pass():
        await asyncio.sleep(30)  # wait 30 s for AIS data to accumulate
        try:
            await run_anomaly_detection_job()
            logger.info("Startup anomaly detection pass completed.")
        except Exception:
            logger.exception("Startup anomaly detection pass failed.")

    asyncio.create_task(_run_startup_anomaly_pass())

    gee_status = "enabled" if settings.gee_project_id else "disabled (GEE_PROJECT_ID not set)"
    logger.info(
        "OceanShield AI v%s started — "
        "AIS supervisor running, jobs scheduled. "
        "GEE/SENTRY-SAR: %s",
        app.version,
        gee_status,
    )


@app.on_event("shutdown")
async def on_shutdown():
    if scheduler.running:
        scheduler.shutdown(wait=False)
    logger.info("OceanShield AI backend stopped.")


# ── Health ─────────────────────────────────────────────────────────────────────

@app.get("/health", include_in_schema=False)
@app.get("/api/v1/health")
async def health_check() -> dict:
    import datetime as _dt

    return {
        "status": "online",
        "version": app.version,
        "timestamp": _dt.datetime.utcnow().isoformat() + "Z",
        "ais_feed_mode": ais_supervisor.mode,
        "services": {
            "database": True,
            "aiModel": True,
            "aisFeed": ais_supervisor.mode in ("live", "replay"),
        },
        "gee_project": settings.gee_project_id or None,
        "aoi": settings.aoi_bbox,
    }
