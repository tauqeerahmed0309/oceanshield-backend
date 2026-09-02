"""
No longer used — the old SQLAlchemy declarative Base for ORM models.
Storage is now JSON files (see app/db/json_store.py); kept as an empty
module only so any stray `from app.db.base import Base` doesn't hard-crash
in an old branch/import path.
"""
