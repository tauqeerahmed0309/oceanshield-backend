"""
FastAPI dependency + startup hook for the JSON-file store.

Kept the same function names (get_db, init_db) that the old SQLAlchemy
version used, so app/main.py and the API routers didn't need to change
their structure — only what "db" actually is changed underneath.
"""

import logging

from app.db.json_store import store, DATA_DIR, JSONStore  # noqa: F401 — re-exported

logger = logging.getLogger("db.session")

# Tables where seed records should be pruned once real data arrives.
# vessel_positions and ais_history are intentionally excluded — seeds
# there provide map coverage and model training data that's useful even
# after the live pipeline starts producing results.
_LIVE_PIPELINE_TABLES = ["ais_anomalies", "spill_candidates", "incidents"]


async def get_db() -> JSONStore:
    """FastAPI dependency — yields the shared JSON store (one process-wide
    instance; see app/db/json_store.py)."""
    yield store


async def init_db():
    """No schema to create — each table's JSON file is created lazily on
    first insert. This just makes sure the data directory exists."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)


async def prune_seeded_records():
    """
    Remove records tagged with ``_seeded: true`` from the three live-pipeline
    tables, but only once each table has at least one real (non-seeded) record.

    Logic per table:
      - Count real records (those without ``_seeded: true``).
      - If real_count >= 1: strip all seeded records and save.
      - If real_count == 0: leave seeds in place (dashboard would be empty).

    This runs once at startup so the stale fixed seeds don't crowd the feed
    after the anomaly → spill → incident pipeline has produced live data.
    """
    from app.db.json_store import _lock_for, _load, _save

    for table in _LIVE_PIPELINE_TABLES:
        async with _lock_for(table):
            data = _load(table)
            records = data.get("records", [])

            seeded   = [r for r in records if r.get("_seeded")]
            real     = [r for r in records if not r.get("_seeded")]

            if not seeded:
                continue  # nothing to prune

            if len(real) >= 1:
                data["records"] = real
                _save(table, data)
                logger.info(
                    "Pruned %d seeded record(s) from '%s' "
                    "(%d live record(s) remain).",
                    len(seeded), table, len(real),
                )
            else:
                logger.debug(
                    "Keeping %d seed record(s) in '%s' — "
                    "no live data yet.",
                    len(seeded), table,
                )
