"""
FastAPI dependency + startup hook for the JSON-file store.

Kept the same function names (get_db, init_db) that the old SQLAlchemy
version used, so app/main.py and the API routers didn't need to change
their structure — only what "db" actually is changed underneath.
"""

from app.db.json_store import store, DATA_DIR, JSONStore  # noqa: F401 — re-exported


async def get_db() -> JSONStore:
    """FastAPI dependency — yields the shared JSON store (one process-wide
    instance; see app/db/json_store.py)."""
    yield store


async def init_db():
    """No schema to create — each table's JSON file is created lazily on
    first insert. This just makes sure the data directory exists."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
