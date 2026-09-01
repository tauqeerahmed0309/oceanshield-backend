"""
FastAPI app entrypoint.

Startup:
  - creates DB tables (or run alembic migrations instead, in production)
  - launches the aisstream.io WebSocket client as a background task
  - schedules the AIS anomaly detection job (every N minutes)
  - schedules the daily SAR catalogue poll
"""

import asyncio
import logging

from fastapi import FastAPI
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.db.session import init_db
from app.ingestion.ais_supervisor import AISSupervisor
from app.tasks.run_anomaly_detection import run_anomaly_detection_job
from app.tasks.poll_sar_catalogue import run_daily_sar_poll
from app.config import settings

from app.api import vessels, anomalies, spills, incidents, alerts

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("main")

app = FastAPI(title="OceanShield AI", version="0.1.0")

app.include_router(vessels.router)
app.include_router(anomalies.router)
app.include_router(spills.router)
app.include_router(incidents.router)
app.include_router(alerts.router)

scheduler = AsyncIOScheduler()
ais_supervisor = AISSupervisor()


@app.on_event("startup")
async def on_startup():
    await init_db()

    # Continuous AIS ingestion supervisor: starts on live if reachable,
    # auto-switches to JSON replay if live drops, and auto-switches back
    # to live as soon as it's reachable again — runs forever, no manual
    # intervention needed.
    asyncio.create_task(ais_supervisor.run())

    # Scheduled jobs
    scheduler.add_job(run_anomaly_detection_job, "interval",
                       minutes=settings.anomaly_window_minutes)
    scheduler.add_job(run_daily_sar_poll, "interval", hours=24)
    scheduler.start()

    logger.info("OceanShield AI backend started — AIS supervisor running, jobs scheduled.")


@app.get("/health")
async def health_check():
    return {"status": "ok", "ais_feed_mode": ais_supervisor.mode}
