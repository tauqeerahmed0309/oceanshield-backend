# 🐳 OceanShield AI — Docker Deployment Guide

Complete guide to running OceanShield AI using Docker and Docker Compose.

---

## Prerequisites

- **Docker** (v20.10+) — [Install Docker](https://docs.docker.com/get-docker/)
- **Docker Compose** (v2.0+) — included with Docker Desktop
- **aisstream.io API key** — [Get free key](https://aisstream.io)

Verify installation:
```bash
docker --version          # Docker version 24.x or higher
docker compose version    # Docker Compose version 2.x or higher
```

---

## Quick Start (3 steps)

### Step 1: Configure your API key

```bash
# Set your aisstream.io API key as an environment variable
# Windows (PowerShell):
$env:AISSTREAM_API_KEY="your_api_key_here"

# macOS / Linux:
export AISSTREAM_API_KEY="your_api_key_here"
```

Or edit `docker-compose.yml` directly — the API key is set in the `environment` section of the backend service.

### Step 2: Build and run

```bash
# From the project root (where docker-compose.yml is located)
docker compose up --build
```

This will:
1. Build the backend image (Python 3.12 + ML dependencies + GDAL)
2. Build the frontend image (Node 20 build → nginx production server)
3. Start both containers
4. Frontend waits for backend health check to pass before starting

### Step 3: Open in browser

| Service | URL |
|---------|-----|
| **Frontend Dashboard** | http://localhost:5173 |
| **Backend API** | http://localhost:8000 |
| **Swagger API Docs** | http://localhost:8000/docs |
| **Health Check** | http://localhost:8000/api/v1/health |

---

## What Each Container Does

### Backend (`oceanshield-backend`)
- FastAPI server on port **8000**
- Connects to aisstream.io for live AIS vessel tracking
- Runs anomaly detection every 5 minutes
- Runs spill detection pipeline automatically
- Stores data in JSON files (persisted via Docker volume)
- Health check: `GET /api/v1/health` every 15 seconds

### Frontend (`oceanshield-ai`)
- Production build served by **nginx** on port **80** (mapped to host **5173**)
- React SPA with Leaflet maps, Recharts analytics, live data polling
- React Router support via nginx config (SPA fallback)

---

## Docker Commands Reference

### Basic operations

```bash
# Start (first time — builds images)
docker compose up --build

# Start (subsequent — uses cached images)
docker compose up

# Start in background (detached mode)
docker compose up -d

# View logs (all services)
docker compose logs -f

# View logs (backend only)
docker compose logs -f backend

# View logs (frontend only)
docker compose logs -f frontend

# Stop all containers
docker compose down

# Stop and remove all data (reset to fresh state)
docker compose down -v
```

### Rebuilding

```bash
# Rebuild only the backend (after code changes)
docker compose build backend
docker compose up backend

# Rebuild only the frontend
docker compose build frontend
docker compose up frontend

# Force no-cache rebuild
docker compose build --no-cache
```

### Inspecting

```bash
# List running containers
docker compose ps

# Enter backend container shell
docker compose exec backend bash

# Enter frontend container shell
docker compose exec frontend sh

# Check backend data files
docker compose exec backend ls -la /app/data/db/

# View backend data (JSON)
docker compose exec backend cat /app/data/db/vessel_positions.json | python -m json.tool | head -50

# Check anomaly detection logs
docker compose logs backend | grep "Anomaly"

# Check AIS feed status
docker compose logs backend | grep "AIS"
```

### Database operations

```bash
# Seed demo data (inside running container)
docker compose exec backend python seed_live_data.py

# Clear all data and restart fresh
docker compose down -v
docker compose up --build

# Backup data
docker compose exec backend tar czf /tmp/backup.tar.gz /app/data/db/
docker cp $(docker compose ps -q backend):/tmp/backup.tar.gz ./backup.tar.gz
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Docker Network                           │
│                                                             │
│  ┌──────────────────┐      ┌──────────────────────────┐    │
│  │   frontend        │      │   backend                 │    │
│  │                   │      │                           │    │
│  │   nginx:1.27      │      │   python:3.12-slim       │    │
│  │   port 80 → 5173  │─────▶│   uvicorn port 8000      │    │
│  │                   │ REST │                           │    │
│  │   React + Vite    │      │   FastAPI + ML pipeline   │    │
│  │   build output    │      │   AIS ingestion           │    │
│  └──────────────────┘      │   Anomaly detection       │    │
│                             │   SAR image analysis      │    │
│                             └───────────┬──────────────┘    │
│                                         │                    │
│                             ┌───────────▼──────────────┐    │
│                             │   volumes:                │    │
│                             │   oceanshield_data →      │    │
│                             │     /app/data/db/         │    │
│                             │   (JSON data persists     │    │
│                             │    across restarts)       │    │
│                             └──────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                         │
                         │ WebSocket
                         ▼
                  aisstream.io (live AIS feed)
```

---

## Environment Variables

### Backend (set in `docker-compose.yml` → `backend.environment`)

| Variable | Default | Description |
|----------|---------|-------------|
| `AISSTREAM_API_KEY` | (from host env) | **Required.** Your aisstream.io API key |
| `AISSTREAM_URL` | `wss://stream.aisstream.io/v0/stream` | AIS WebSocket endpoint |
| `ANOMALY_WINDOW_MINUTES` | `5` | How often anomaly detection runs |
| `CONFIRM_SCORE_THRESHOLD` | `0.7` | Score needed for confirmed spill |
| `AIS_CORRELATION_RADIUS_KM` | `5.0` | Radius for vessel-slick correlation |
| `DATA_DIR` | `data/db` | JSON data store path (inside container) |
| `ICG_ALERT_WEBHOOK_URL` | (empty) | ICG notification webhook |

### Frontend (set as build args)

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_BASE_URL` | `http://localhost:8000` | Backend URL the browser connects to |

---

## Customization

### Change exposed ports

Edit `docker-compose.yml`:
```yaml
services:
  backend:
    ports:
      - "9000:8000"    # Change host port to 9000

  frontend:
    ports:
      - "3000:80"      # Change host port to 3000
```

### Use your own AIS API key permanently

Edit `docker-compose.yml` or create a `.env` file in the project root:
```bash
# .env (project root)
AISSTREAM_API_KEY=your_actual_key_here
```

Docker Compose automatically reads this file.

### Enable Google Earth Engine (SENTRY-SAR)

Add to `docker-compose.yml` backend environment:
```yaml
environment:
  GEE_PROJECT_ID: your-gee-project-id
```

You'll also need to mount GEE credentials into the container.

### Persistent data across `docker compose down`

The data volume `oceanshield_data` persists automatically. Only `docker compose down -v` wipes it.

---

## Troubleshooting

### Backend won't start

```bash
# Check logs
docker compose logs backend

# Common issues:
# 1. Missing AISSTREAM_API_KEY → set it in environment
# 2. Port 8000 already in use → stop other processes or change port
# 3. GDAL compilation error → ensure Docker has enough memory (8GB+)
```

### Frontend shows "Backend unavailable"

```bash
# Check backend is healthy
docker compose ps
# Look for "healthy" status on backend

# Check backend logs
docker compose logs backend | tail -20

# Verify backend responds
curl http://localhost:8000/api/v1/health
```

### AIS connection keeps dropping

This is normal behavior with the free aisstream.io tier. The backend auto-reconnects. Check:
```bash
docker compose logs backend | grep -i "reconnect"
```

### Container out of memory

The ML models (PyTorch, scikit-learn) need ~2GB RAM. Ensure Docker Desktop has at least **4GB memory** allocated:
- Docker Desktop → Settings → Resources → Memory → set to 4GB+

### Reset everything

```bash
docker compose down -v    # Stop and wipe all data
docker compose up --build  # Fresh start
```

---

## Development vs Production

| Aspect | Development | Docker (Production) |
|--------|------------|-------------------|
| Frontend | `npm run dev` (Vite HMR) | nginx serves built assets |
| Backend | `--reload` flag | No reload (stable process) |
| CORS | localhost:5173 only | Configured in FastAPI |
| Data | Local `data/db/` | Docker volume |
| Port | 5173 (frontend), 8000 (backend) | Same (mapped) |

For development, use the [local setup instructions](./README.md#quick-start-local-development) instead of Docker.

---

> **Tip:** Run `docker compose up --build -d` once, and the system runs continuously with live AIS data. Check `docker compose logs -f backend` to watch anomaly detections in real-time.
