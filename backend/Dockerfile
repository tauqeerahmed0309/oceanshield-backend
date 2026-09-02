# ─────────────────────────────────────────────────────────────────
# OceanShield AI — Backend
# Python 3.12 slim + GDAL/rasterio system libs + pip packages
# ─────────────────────────────────────────────────────────────────
FROM python:3.12-slim

# System packages needed by rasterio / GDAL / shapely / opencv
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        gcc \
        g++ \
        gdal-bin \
        libgdal-dev \
        libgeos-dev \
        libproj-dev \
        libspatialindex-dev \
        libgl1 \
        libglib2.0-0 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Tell rasterio / GDAL where headers live
ENV GDAL_VERSION=3 \
    CPLUS_INCLUDE_PATH=/usr/include/gdal \
    C_INCLUDE_PATH=/usr/include/gdal

WORKDIR /app

# Copy and install Python dependencies first (layer-cache friendly)
COPY requirements.txt .

# PyTorch CPU-only wheel to keep image size reasonable.
# Comment the --index-url line and change torch version if you need GPU.
RUN pip install --no-cache-dir --upgrade pip \
 && pip install --no-cache-dir \
        torch==2.3.1 torchvision==0.18.1 \
        --index-url https://download.pytorch.org/whl/cpu \
 && pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Create data directories so the JSON store can write on first boot
RUN mkdir -p data/db data/reports data/sar_scenes data/sentry_sar data/uploads

# Seed the database with initial data so the dashboard isn't empty
RUN python seed_live_data.py

EXPOSE 8000

# Run without --reload in production (use RELOAD=true env var for dev)
CMD ["python", "-m", "uvicorn", "app.main:app", \
     "--host", "0.0.0.0", "--port", "8000"]
