# 🌊 OceanShield AI

### AI-Powered Maritime Oil Spill Intelligence System

An end-to-end platform for detecting, attributing, and alerting on marine oil spills using **live AIS vessel tracking**, **Sentinel-1 SAR satellite imagery**, and **machine learning anomaly detection**.

Built for **Smart India Hackathon 2026 — Problem Statement SIH_055**:
> Detecting oil spills in the marine environment using AIS and satellite datasets.

---

## 📋 Table of Contents

- [Architecture Overview](#architecture-overview)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Quick Start (Local Development)](#quick-start-local-development)
- [Docker Deployment](#docker-deployment)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [How It Works](#how-it-works)
- [Limitations & Known Issues](#limitations--known-issues)
- [Contributing](#contributing)

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React + Vite)                   │
│   Dashboard │ Vessels │ Spills │ Anomalies │ Satellite │ Maps   │
│                              port 5173                          │
└────────────────────────────┬─────────────────────────────────────┘
                             │ REST API (JSON)
┌────────────────────────────▼─────────────────────────────────────┐
│                     BACKEND (FastAPI + Python)                    │
│                                                                  │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │ AIS Stream   │  │ SAR Pipeline │  │ Anomaly Detection      │  │
│  │ (WebSocket)  │  │ (U-Net +     │  │ (Isolation Forest)     │  │
│  │ aisstream.io │  │  5-Layer     │  │ Runs every 5 min       │  │
│  │ Live ingest  │  │  Filters)    │  │ Flags suspicious       │  │
│  └──────┬───────┘  └──────┬───────┘  │ vessels automatically  │  │
│         │                 │          └────────────┬───────────┘  │
│         ▼                 ▼                       ▼              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              JSON Data Store (data/db/*.json)             │   │
│  │  vessel_positions │ ais_history │ ais_anomalies │ spills  │   │
│  │  incidents │ sar_scenes │ alerts │ analytics              │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              port 8000                           │
└──────────────────────────────────────────────────────────────────┘
```

---

## Key Features

### 🔴 Live AIS Vessel Tracking
- Real-time WebSocket connection to **aisstream.io** feeding 4,000+ vessel positions
- Auto-reconnect with exponential backoff on connection drops
- Monitors 3 global bounding boxes (Atlantic, Pacific, Indian Ocean)

### 🛰️ Satellite SAR Image Analysis
- **User upload mode**: Upload your own SAR/optical images with coordinates → instant analysis
- U-Net segmentation model for oil slick pixel detection
- 5-layer filter pipeline reducing false positives:
  1. **Wind filter** — rules out low-wind dark patches
  2. **Lookalike classifier** — eliminates biogenic slicks, algal blooms
  3. **Spatial context** — penalizes near-shore detections
  4. **AIS cross-check** — boosts score if a vessel was nearby
  5. **Persistence check** — confirms slick isn't a transient artifact

### 🚨 AIS Anomaly Detection
- **Isolation Forest** model scoring every vessel on:
  - Speed deviation from expected corridor
  - Course deviation from shipping lanes
  - Dark gaps (AIS signal dropout)
  - Unscheduled loitering
  - Route deviation
- Runs every 5 minutes, flags vessels with severity levels (CRITICAL / HIGH / MEDIUM / LOW)

### 📊 Dashboard & Analytics
- Real-time overview with live vessel count, anomaly count, spill incidents
- Interactive Leaflet map with vessel positions, spill zones, anomaly markers
- Analytics charts: incidents over time, anomaly types, risk regions

### 📄 Incident Reports
- Auto-generated incident reports (JSON / Markdown / PDF)
- Drift-based vessel attribution (Lagrangian backtracking)
- ICG/MRCC alerting webhook integration (configurable)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, Vite 8, TypeScript, Tailwind CSS 4, Leaflet, Recharts, Zustand |
| **Backend** | Python 3.12, FastAPI, Uvicorn, APScheduler |
| **ML/AI** | PyTorch (U-Net), scikit-learn (Isolation Forest, Random Forest), OpenCV |
| **Geospatial** | rasterio, GDAL, shapely, geopandas |
| **Data Source** | aisstream.io (live AIS WebSocket) |
| **Storage** | JSON flat files (no database server needed) |
| **Containerization** | Docker, Docker Compose |

---

## Project Structure

```
oceanshield/
├── README.md                          # This file
├── DOCKER.md                          # Docker deployment guide
├── docker-compose.yml                 # One-command full stack
├── start_backend.ps1                  # PowerShell quick start
│
├── oceanshield-backend/               # Python FastAPI backend
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── .env.example                   # Copy to .env
│   ├── app/
│   │   ├── main.py                    # FastAPI app + startup scheduler
│   │   ├── config.py                  # Pydantic settings from .env
│   │   ├── api/                       # REST endpoint routers
│   │   │   ├── vessels.py             # GET /vessels (live AIS positions)
│   │   │   ├── anomalies.py           # GET /anomalies (flagged vessels)
│   │   │   ├── spills.py             # GET /spills + POST /spills/analyze-image
│   │   │   ├── incidents.py           # GET /incidents (confirmed spills)
│   │   │   ├── analytics.py           # GET /analytics (dashboard aggregates)
│   │   │   ├── attribution.py         # Drift analysis + vessel attribution
│   │   │   ├── reports.py             # Incident report generation
│   │   │   ├── satellite.py           # SAR scene management
│   │   │   └── alerts.py              # ICG notification status
│   │   ├── ingestion/
│   │   │   ├── aisstream_client.py    # WebSocket AIS client
│   │   │   ├── ais_supervisor.py      # Auto-reconnect + fallback logic
│   │   │   └── weather_client.py      # Open-Meteo wind data
│   │   ├── ml/
│   │   │   ├── anomaly_detector.py    # Isolation Forest anomaly scorer
│   │   │   └── unet_segmentation.py   # U-Net oil slick segmentation
│   │   ├── filters/                   # 5-layer false-positive filter pipeline
│   │   │   ├── wind_filter.py
│   │   │   ├── shape_texture.py       # Lookalike classifier
│   │   │   ├── spatial_context.py
│   │   │   ├── ais_crosscheck.py
│   │   │   └── persistence_check.py
│   │   ├── processing/
│   │   │   ├── correlation_engine.py  # Orchestrates the 5-layer pipeline
│   │   │   ├── sar_preprocessing.py   # SAR image preprocessing
│   │   │   ├── risk_scoring.py        # Incident severity scoring
│   │   │   └── sentry_sar.py          # Google Earth Engine integration
│   │   ├── tasks/
│   │   │   ├── run_anomaly_detection.py  # Scheduled anomaly scoring
│   │   │   ├── run_spill_pipeline.py     # Anomaly → spill → incident
│   │   │   └── poll_sar_catalogue.py     # Daily SAR scene acquisition
│   │   ├── db/
│   │   │   ├── json_store.py          # JSON flat-file database
│   │   │   └── session.py             # FastAPI dependency + init
│   │   └── models/                    # Table name constants
│   ├── data/                          # Runtime data (auto-created)
│   │   └── db/                        # JSON data files
│   ├── seed_live_data.py              # Seed demo data
│   └── tests/
│
└── oceanshield-ai/                    # React frontend
    ├── Dockerfile
    ├── nginx.conf
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── App.tsx                    # Root router
        ├── api/                       # API client functions
        │   ├── client.ts              # Centralized fetch wrapper
        │   ├── vessels.ts
        │   ├── spills.ts
        │   ├── anomalies.ts
        │   ├── incidents.ts
        │   └── analytics.ts
        ├── store/
        │   └── appStore.ts            # Zustand global state
        ├── pages/
        │   ├── Dashboard/             # Overview with KPI cards + map
        │   ├── Vessels/               # Live vessel tracking table + map
        │   ├── Spills/                # Oil spill candidate tracker
        │   ├── Anomalies/             # AIS anomaly engine
        │   ├── Satellite/             # SAR upload + analysis
        │   ├── Incidents/             # Confirmed incidents
        │   ├── Analytics/             # Charts and trends
        │   ├── Attribution/           # Drift + vessel attribution
        │   ├── Reports/               # Incident report viewer
        │   └── Settings/              # System configuration
        ├── components/
        │   ├── LiveTrackingMap.tsx     # Leaflet map with vessel markers
        │   └── dashboard/
        │       └── Sidebar.tsx        # Navigation sidebar
        ├── types/                     # TypeScript interfaces
        └── hooks/
```

---

## Quick Start (Local Development)

### Prerequisites
- **Python 3.12** with pip
- **Node.js 20+** with npm
- **aisstream.io API key** (free tier works — get one at https://aisstream.io)

### 1. Clone the repo
```bash
git clone <repo-url> oceanshield
cd oceanshield
```

### 2. Backend setup
```bash
cd oceanshield-backend

# Create virtual environment
python -m venv .venv
source .venv/Scripts/activate      # Windows PowerShell
# source .venv/bin/activate        # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and set your AISSTREAM_API_KEY

# Seed demo data (optional)
python seed_live_data.py

# Start the server
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend is now running at **http://localhost:8000**  
API docs at **http://localhost:8000/docs**

### 3. Frontend setup
```bash
# In a new terminal
cd oceanshield-ai

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend is now running at **http://localhost:5173**

### 4. Verify everything works

Open **http://localhost:5173** in your browser. You should see:
- **Dashboard** with live vessel count from AIS feed (4,000+ vessels)
- **Map** with vessel positions updating in real-time
- After ~30 seconds, the anomaly detector runs and may flag suspicious vessels

### Quick Windows Start
```powershell
# From the project root
.\start_backend.ps1
```
Then in another terminal: `cd oceanshield-ai && npm run dev`

---

## Docker Deployment

For detailed Docker instructions, see **[DOCKER.md](./DOCKER.md)**.

### TL;DR
```bash
# One command to build and run everything
docker-compose up --build

# Or run in background
docker-compose up --build -d

# Stop everything
docker-compose down

# Stop and wipe all data
docker-compose down -v
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |

---

## Environment Variables

### Backend (`oceanshield-backend/.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AISSTREAM_API_KEY` | **Yes** | — | Your aisstream.io API key |
| `AISSTREAM_URL` | No | `wss://stream.aisstream.io/v0/stream` | WebSocket endpoint |
| `ANOMALY_WINDOW_MINUTES` | No | `5` | Anomaly detection interval |
| `CONFIRM_SCORE_THRESHOLD` | No | `0.7` | Score threshold for confirmed spills |
| `AIS_CORRELATION_RADIUS_KM` | No | `5.0` | Radius to correlate vessels with slicks |
| `GEE_PROJECT_ID` | No | — | Google Earth Engine project (for SENTRY-SAR) |
| `DATA_DIR` | No | `data/db` | Path for JSON data store |
| `ICG_ALERT_WEBHOOK_URL` | No | — | ICG/MRCC notification webhook |
| `AOI_BBOX_*` | No | Global | Area of Interest bounding boxes |

### Frontend (`oceanshield-ai/.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_BASE_URL` | No | `http://localhost:8000` | Backend API URL |

---

## API Reference

All endpoints are prefixed with `/api/v1`.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Backend health check |
| GET | `/vessels` | Latest position per unique vessel (deduplicated by MMSI) |
| GET | `/vessels/{mmsi}` | Position history for one vessel |
| GET | `/anomalies` | All detected AIS anomalies |
| GET | `/spills` | All SAR spill candidates with region + confidence |
| POST | `/spills/analyze-image` | **Upload a SAR image** + coordinates for on-demand analysis |
| GET | `/incidents` | Confirmed oil spill incidents |
| GET | `/analytics` | Dashboard aggregates (totals, trends, risk regions) |
| POST | `/attribution/{incident_id}` | Run drift-based vessel attribution for an incident |
| GET | `/reports/{incident_id}` | Generate incident report (JSON/Markdown/PDF) |
| GET | `/alerts` | ICG notification status |
| GET | `/satellite/scenes` | SAR scene acquisitions |

### Upload a SAR Image (User Analysis)

```bash
curl -X POST http://localhost:8000/api/v1/spills/analyze-image \
  -F "file=@your_sar_image.tiff" \
  -F "latitude=18.89" \
  -F "longitude=72.84"
```

Returns: full pipeline breakdown including U-Net confidence, wind check, lookalike probability, spatial context, AIS correlation, persistence check, and final verdict.

---

## How It Works

### Real-Time AIS Pipeline
1. **AIS Supervisor** connects to aisstream.io via WebSocket
2. Receives ~100-200 vessel position messages per minute
3. Positions stored in `vessel_positions` (latest per vessel) and `ais_history` (append-only log)
4. History buffer flushed to disk every 30 seconds

### Anomaly Detection Pipeline (every 5 minutes)
1. Pull recent AIS history (rolling window of vessel positions)
2. Group by MMSI, compute features per vessel:
   - Speed deviation, course deviation, ping-gap duration, route distance
3. **Isolation Forest** scores each vessel's feature row
4. Vessels scoring > 0.6 flagged as anomalies with severity (CRITICAL/HIGH/MEDIUM/LOW)
5. Flagged vessels updated in `vessel_positions` with `suspicious=True`
6. Immediately triggers the spill pipeline

### SAR Spill Detection Pipeline
1. **U-Net segmentation** identifies dark patches in SAR imagery
2. **5-layer filter pipeline** eliminates false positives:
   - Wind filter → Lookalike classifier → Spatial context → AIS cross-check → Persistence
3. Composite score computed; verdict = "confirmed" or "unverified"
4. Confirmed spills auto-promoted to incidents with attribution

### Satellite Image Upload (User-Initiated)
1. User selects monitoring area from dropdown and uploads a SAR/optical image
2. Backend receives via `POST /api/v1/spills/analyze-image`
3. Same U-Net + 5-layer pipeline runs on the uploaded image
4. Full breakdown returned: confidence, all filter scores, verdict

---

## Limitations & Known Issues

- **JSON file storage** is not safe for concurrent multi-process writes. Run one backend instance at a time.
- **U-Net weights** (`app/ml/models/unet_weights.pt`) and **look-alike classifier** (`app/ml/models/lookalike_rf.joblib`) are not included — train on labeled SAR datasets before real inference. Placeholder models will produce random results.
- **AIS feed** can drop connections periodically (free-tier keepalive timeout). Auto-reconnect handles this transparently.
- **No spatial index** on JSON store — spatial lookups scan the entire table. Fine for pilot/demo volumes; replace with PostGIS for production.
- **GEE/SENTRY-SAR** integration is disabled when `GEE_PROJECT_ID` is not set (falls back to local analysis only).

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests: `cd oceanshield-backend && python -m pytest`
5. Submit a pull request

---

## License

This project was developed for Smart India Hackathon 2026.

---

> **OceanShield AI** — Protecting our oceans through intelligent maritime surveillance.
