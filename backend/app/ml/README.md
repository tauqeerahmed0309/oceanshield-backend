# OceanShield AI - ML Models Documentation

Based on **Smart India Hackathon Problem Statement #26143**:
> Leveraging satellite imagery to determine oil spills at sea along with AIS data correlations to identify vessel responsible for the spill.

## Overview

The ML pipeline consists of three core components:

1. **SAR Oil Spill Detection (U-Net)** - Segmentation of dark patches in SAR imagery
2. **Drift Prediction (Lagrangian Tracking)** - Hindcast/forecast slick movement
3. **Vessel Attribution (Multi-factor Scoring)** - Rank suspect vessels

---

## 1. SAR Oil Spill Detection (U-Net)

### Architecture
- **Model**: U-Net with 3 encoder blocks + bottleneck + 3 decoder blocks
- **Input**: 1-channel SAR image (VV polarization preferred)
- **Output**: Binary oil spill probability mask
- **Training Data**: Zenodo Sentinel-1 SAR Oil Spill Dataset

### Dataset
**Zenodo Sentinel-1 SAR Oil Spill Dataset**
- URL: https://zenodo.org/record/5764984
- Contains: SAR image patches + binary oil spill masks
- Format: GeoTIFF or PNG

### Training
```bash
# Download and train on Zenodo dataset
python -m app.ml.train_unet --download --epochs 50

# Or train on custom dataset
python -m app.ml.train_unet --data_dir /path/to/dataset --epochs 100
```

### Inference
```python
from app.ml.unet_segmentation import UNetSegmenter

segmenter = UNetSegmenter()
segmenter.load()

# Predict oil spill mask
mask, prob_mask = segmenter.predict(sar_image)
```

---

## 2. Drift Prediction (Lagrangian Tracking)

### Physics Model
Oil slick drift is modeled using:
```
drift = 0.94 × ocean_current + 0.035 × wind_vector
```
(Nordhausen et al., 1996)

### Components
- **Ocean Currents**: Seasonal monsoon patterns for Indian Ocean
- **Wind Drift**: 3.5% of wind speed at 10m height
- **Diffusion**: Turbulent spreading model
- **Stokes Drift**: Surface wave contribution

### Usage
```python
from app.ml.drift_prediction import drift_predictor

# Hindcast: Find origin of observed spill
origin = drift_predictor.hindcast(
    spill_lat=18.89,
    spill_lon=72.84,
    spill_time=datetime.now(timezone.utc),
    hours_back=72
)
print(f"Origin: {origin.origin_lat}, {origin.origin_lon}")
print(f"Time: {origin.origin_time}")

# Forecast: Predict future movement
forecast = drift_predictor.forecast(
    spill_lat=origin.origin_lat,
    spill_lon=origin.origin_lon,
    spill_time=origin.origin_time,
    hours_forward=48
)
```

---

## 3. Vessel Attribution Model

### Scoring Components

| Component | Weight | Description |
|-----------|--------|-------------|
| Proximity | 30% | Distance from vessel to spill origin |
| Temporal | 20% | Time overlap with spill window |
| Trajectory | 20% | Course alignment with drift direction |
| Anomaly | 15% | AIS behavioral anomalies |
| Vessel Type | 10% | Risk based on ship type |
| Behavior | 5% | Historical patterns |

### Vessel Type Risk Weights

| Type | Risk Score |
|------|------------|
| Oil Tanker | 1.0 |
| Crude Oil Tanker | 1.0 |
| Chemical Tanker | 0.9 |
| Product Tanker | 0.95 |
| Bulk Carrier | 0.4 |
| Container Ship | 0.3 |
| Fishing Vessel | 0.1 |

### Usage
```python
from app.ml.vessel_attribution import vessel_attribution_model

# Score vessels for attribution
scores = vessel_attribution_model.score_vessels(
    spill_lat=18.89,
    spill_lon=72.84,
    spill_time=datetime.now(timezone.utc),
    vessels=nearby_vessels,
    drift_origin=hindcast_result
)

for score in scores[:5]:
    print(f"{score.ship_name}: {score.attribution_confidence}%")
```

---

## 4. AIS Anomaly Detection (Isolation Forest)

### Features
1. **Speed Deviation**: Difference from expected corridor speed
2. **Course Deviation**: Angle from shipping lane direction
3. **Ping Gap**: Time between AIS transmissions
4. **Route Distance**: Distance from established shipping corridor

### Usage
```python
from app.ml.anomaly_detector import AISAnomalyDetector, compute_features

detector = AISAnomalyDetector()
detector.fit(historical_features)

# Score new positions
scores = detector.score(vessel_features)
anomaly_type = detector.classify_anomaly_type(features)
```

---

## 5. Integration Pipeline

### Full Detection Pipeline
```
SAR Image → Preprocessing → U-Net → Dark Patch Candidates
                                         ↓
                              Wind Filter → Lookalike Classifier
                                         ↓
                              Spatial Context → AIS Cross-check
                                         ↓
                              Persistence Check → Final Score
                                         ↓
                              Confirmed Spill → Drift Hindcast
                                         ↓
                              Vessel Attribution → Incident Report
```

### API Endpoints
- `POST /api/v1/spills/analyze-image` - Upload SAR image for analysis
- `GET /api/v1/spills` - List detected spill candidates
- `GET /api/v1/anomalies` - List AIS anomalies
- `POST /api/v1/attribution/{incident_id}` - Run vessel attribution

---

## 6. Indian Ocean Configuration

### Monsoon Patterns
- **NE Monsoon (Nov-Mar)**: Currents flow SW, winds from NE
- **SW Monsoon (Jun-Sep)**: Currents flow NE, winds from SW
- **Inter-monsoon (Apr-May, Oct)**: Variable conditions

### Indian Maritime Zones
1. **Arabian Sea**: 5°N-23.5°N, 68°E-77.5°E
2. **Bay of Bengal**: 5°N-22°N, 77.5°E-92°E
3. **Indian Ocean**: 0°N-14°N, 68°E-95°E

---

## References

1. Nordhausen et al. (1996) - Oil spill drift modeling
2. Brekke & Solberg (2005) - Oil spill detection by SAR
3. Topouzelis et al. (2020) - ML for oil spill detection
4. Zenodo Sentinel-1 SAR Oil Spill Dataset
5. MarineCadastre.gov AIS Data
