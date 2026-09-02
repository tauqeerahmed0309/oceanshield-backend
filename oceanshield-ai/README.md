# OceanShield AI

### AI-Powered AIS Anomaly Detection and Satellite-Based Oil Spill Intelligence System

This is a high-fidelity frontend prototype built for **Smart India Hackathon Problem Statement AtriaSIH_055**:
> Detecting oil spills at marine environment using Automatic Identification System (AIS) and satellite datasets.

Designed specifically for **maritime monitoring authorities, coast guard/environmental agencies, and incident-response teams**, the application implements a professional navy GIS aesthetic mimicking an aerospace/government command-and-control platform.

---

## Key Features

1. **Interactive GIS Surveillance Map (Leaflet)**:
   - Displays real-time shipping corridors focused initially on the Gulf of Mexico.
   - Dynamic SVG ship chevrons color-coded by alert status and dynamically rotated to match their actual heading/course.
   - Pulsing emergency rings for anomalous targets.
   - Vector polygon overlays of confirmed oil spill slicks and acquisition bounding boxes.

2. **AIS Anomaly Assessment Engine**:
   - Compares real-time vessel telemetry (speed, course offset, trajectory stops, route divergence) against historical tracks.
   - Outputs mathematical percentage deviations and overall anomaly scores.
   - *Operator Directive:* Identifies anomalies requiring human investigation; does not establish emergency status automatically.

3. **Sentinel-1 SAR Radar Analysis**:
   - Synthetic C-band SAR backscatter visualizer.
   - Renders radar damping signatures (surface oil slick regions) and metallic returns (vessel reflections).
   - False-positive analysis panel (verifying surface darkness, slick geometry, wind condition compatibility, and proximity margins).

4. **Multi-Vector Vessel Association**:
   - Cross-references oil slick dimensions and drift timings with candidate vessel AIS pathways.
   - Renders association probability bars (proximity, temporal overlap, track intersection, telemetry offsets).
   - Generates and downloads official **Maritime Incident Intelligence Reports** (OS-2026-0104 text logs).

5. **Integrated Analytics Panel**:
   - Line graphs tracking AIS anomaly spikes over a 7-day window.
   - Grouped bar graphs comparing anomalous behaviors by vessel class (Tankers vs. Cargo vs. Tugboats).
   - Pie charts showing overall risk distribution profiles.

6. **Interactive Demo Simulation Modes**:
   - **Run Live Monitoring**: Initiates automated coordinate drifting to simulate realistic vessel movement in real-time.
   - **Run Incident Simulation**: Conducts a step-by-step end-to-end simulation showing the complete intelligence cycle:
     $$\text{Vessel Transit} \rightarrow \text{Sudden Stop} \rightarrow \text{AIS Anomaly (87\%)} \rightarrow \text{SAR Scan Box} \rightarrow \text{Slick Detected (94\%)} \rightarrow \text{Association} \rightarrow \text{Alert} \rightarrow \text{Report}$$

---

## Project Structure

```text
src/
├── components/
│   ├── VesselMap.jsx          # Leaflet map container & custom SVG markers
│   ├── SatelliteViewer.jsx    # Synthetic SAR radar imaging & look-alike metrics
│   ├── RiskGauge.jsx          # Circular environmental threat score gauge
│   ├── IncidentReportModal.jsx# PDF-style text report formatter & download trigger
│   └── AnalyticsCharts.jsx    # Recharts configurations for system trends
├── pages/
│   ├── Dashboard.jsx          # Command Center (KPI Cards, map view, alert timeline)
│   ├── Vessels.jsx            # Dynamic tracking directory with search/filters
│   ├── Anomalies.jsx          # AIS assessment cockpit & ASCII breakdown grids
│   ├── OilSpills.jsx          # Satellite investigation workspace
│   ├── Analytics.jsx          # Charts container
│   └── Settings.jsx           # Diagnostics log output & rule thresholds
├── data/
│   ├── vessels.js             # Initial 15 mock vessels database
│   ├── incidents.js           # Mock satellite incident logs
│   └── candidates.js          # Association matrix elements
├── services/
│   └── simulationService.js   # Simulation tick logic & step sequences
├── App.jsx                    # Primary app router & state machines
└── index.css                  # Tailwinds directives & Leaflet dark filters
```

---

## Installation & Running Locally

### Prerequisites
- Node.js (v16.0 or higher recommended)
- npm or yarn

### Steps

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Run the development server**:
   ```bash
   npm run dev
   ```

3. **Build for production**:
   ```bash
   npm run build
   ```

4. **Preview the production build locally**:
   ```bash
   npm run preview
   ```
