# OceanShield AI — Backend

AIS + SAR fusion pipeline for marine oil-spill detection, attribution, and
ICG-first alerting.

## Setup

Storage is flat JSON files under `data/db/` — no database server to install.

1. Copy `.env.example` to `.env` and fill in values (aisstream.io API key,
   AOI bounding box, thresholds).
2. Install dependencies:
   ```bash
   pip install -r requirements.txt --break-system-packages
   ```
3. Run the server:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

That's it — `data/db/*.json` files are created automatically on first write.
Delete them any time to reset all state.

## Folder layout

```
app/
  api/          FastAPI routers (vessels, anomalies, spills, incidents, alerts)
  ingestion/    aisstream.io WebSocket client, SAR scene fetcher, wind client
  models/       Table-name constants for the JSON store (see app/db/json_store.py)
  schemas/      Pydantic request/response schemas
  ml/           Isolation Forest, U-Net, look-alike Random Forest
  filters/      The 5-layer look-alike filter pipeline
  processing/   SAR preprocessing, correlation engine, risk scoring
  alerting/     ICG/MRCC priority notification logic
  db/           JSON-file store (app/db/json_store.py) + FastAPI dependency
  tasks/        Scheduled background jobs
```

## Notes

- No LLM is used anywhere in this pipeline — detection is classical CV
  (U-Net, OpenCV/scikit-image) + tabular ML (Isolation Forest, Random Forest)
  + geospatial matching (plain haversine, computed in Python — see
  `app/db/json_store.py`).
- **Storage caveat:** each table is one JSON file, rewritten whole on every
  write, with an in-process lock. Fine for one backend instance / two devs
  sharing a repo. It is **not** safe to run two backend processes against
  the same `data/db/` folder at once (e.g. two `uvicorn` instances, or you
  and your teammate both running the server against a synced folder
  simultaneously) — concurrent writes from separate processes can clobber
  each other. Run one instance at a time.
- Spatial lookups (finding nearby vessels/anomalies) scan the whole table
  per query rather than using a spatial index, so this is fine at
  pilot/demo data volumes but will get slow well before Postgres+PostGIS
  would.
- The U-Net weights (`app/ml/models/unet_weights.pt`) and look-alike
  classifier (`app/ml/models/lookalike_rf.joblib`) are NOT included — train
  these on a labeled SAR oil-spill dataset before running real inference.
  Placeholder loading code will raise a clear error until you add them.
