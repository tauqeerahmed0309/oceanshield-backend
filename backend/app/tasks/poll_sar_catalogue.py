"""
Scheduled job: daily check for new Sentinel-1 scenes over the AOI.
Since revisit is ~12 days, daily polling is sufficient — call
sar_fetcher.check_for_new_scene(triggered_by_anomaly=True) directly
(not via this scheduled job) when a severe AIS anomaly fires, to check
immediately rather than waiting for the next scheduled poll.
"""

import logging

from app.ingestion.sar_fetcher import check_for_new_scene

logger = logging.getLogger("poll_sar_catalogue")


async def run_daily_sar_poll():
    logger.info("Running scheduled SAR catalogue poll")
    await check_for_new_scene(triggered_by_anomaly=False)
