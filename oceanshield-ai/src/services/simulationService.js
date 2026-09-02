export const simulationSteps = [
  {
    step: 1,
    title: "Vessel Detection",
    statusText: "Normal vessel detected",
    checklist: { ais: "current", anomaly: "pending", satellite: "pending", oil: "pending", correlation: "pending", risk: "pending", alert: "pending" },
    message: "MV Desh Rakshak transiting Mumbai Harbor at normal speed (14.5 kn). All AIS signals normal.",
    vesselUpdates: {
      "vessel-1": { speed: 14.5, anomalyScore: 12, risk: "LOW", status: "NORMAL" }
    },
    incidentUpdates: null,
    activeAlert: null
  },
  {
    step: 2,
    title: "Speed Anomaly",
    statusText: "AIS anomaly detected",
    checklist: { ais: "done", anomaly: "current", satellite: "pending", oil: "pending", correlation: "pending", risk: "pending", alert: "pending" },
    message: "MV Desh Rakshak speed suddenly drops from 14.5 kn to 2.1 kn. Course deviation observed.",
    vesselUpdates: {
      "vessel-1": { speed: 2.1, anomalyScore: 54, risk: "MEDIUM", status: "WARNING" }
    },
    incidentUpdates: null,
    activeAlert: {
      id: "alert-1",
      type: "WARNING",
      title: "Sudden Speed Drop",
      message: "MV Desh Rakshak reports speed 2.1 kn in open shipping lane.",
      vesselId: "vessel-1",
      time: "Just now"
    }
  },
  {
    step: 3,
    title: "Anomaly Escalation",
    statusText: "Anomaly score increases to 87%",
    checklist: { ais: "done", anomaly: "done", satellite: "pending", oil: "pending", correlation: "pending", risk: "pending", alert: "pending" },
    message: "AIS Anomaly Score climbs to 87/100. Potential disabled vessel or illegal operation.",
    vesselUpdates: {
      "vessel-1": { speed: 2.1, anomalyScore: 87, risk: "HIGH", status: "ANOMALOUS" }
    },
    incidentUpdates: null,
    activeAlert: {
      id: "alert-2",
      type: "HIGH",
      title: "High Anomaly Score",
      message: "MV Desh Rakshak AIS anomaly score has reached 87/100.",
      vesselId: "vessel-1",
      time: "Just now"
    }
  },
  {
    step: 4,
    title: "Satellite Tasking",
    statusText: "Satellite investigation zone created",
    checklist: { ais: "done", anomaly: "done", satellite: "current", oil: "pending", correlation: "pending", risk: "pending", alert: "pending" },
    message: "Targeting area 18.900° N, 72.800° E for Sentinel-1 radar imaging. Scanning scheduled.",
    vesselUpdates: {},
    incidentUpdates: {
      "OS-2026-0104": { status: "ACQUIRING", oilProbability: 0, area: 0 }
    },
    activeAlert: null
  },
  {
    step: 5,
    title: "SAR Image Acquired",
    statusText: "Sentinel-1 image acquired",
    checklist: { ais: "done", anomaly: "done", satellite: "done", oil: "pending", correlation: "pending", risk: "pending", alert: "pending" },
    message: "Sentinel-1 SAR radar imagery received. Initial backscatter analysis in progress.",
    vesselUpdates: {},
    incidentUpdates: {
      "OS-2026-0104": { status: "ANALYZING", oilProbability: 35, area: 1.2 }
    },
    activeAlert: null
  },
  {
    step: 6,
    title: "Oil Slick Detection",
    statusText: "Oil slick detected (94%)",
    checklist: { ais: "done", anomaly: "done", satellite: "done", oil: "done", correlation: "pending", risk: "pending", alert: "pending" },
    message: "SAR backscatter analysis identifies high-probability dark slick. Oil probability: 94%. Area: 3.8 km².",
    vesselUpdates: {},
    incidentUpdates: {
      "OS-2026-0104": { status: "ACTIVE", oilProbability: 94, area: 3.8 }
    },
    activeAlert: {
      id: "alert-3",
      type: "HIGH",
      title: "Oil Slick Detected",
      message: "Satellite SAR reports 3.8 km² dark slick with 94% probability.",
      vesselId: null,
      time: "Just now"
    }
  },
  {
    step: 7,
    title: "AIS Correlation",
    statusText: "Nearby AIS vessels analyzed",
    checklist: { ais: "done", anomaly: "done", satellite: "done", oil: "done", correlation: "current", risk: "pending", alert: "pending" },
    message: "Cross-referencing oil slick coordinates with historic AIS track database.",
    vesselUpdates: {},
    incidentUpdates: null,
    activeAlert: null
  },
  {
    step: 8,
    title: "Vessel Association",
    statusText: "MV Desh Rakshak primary candidate (91%)",
    checklist: { ais: "done", anomaly: "done", satellite: "done", oil: "done", correlation: "done", risk: "pending", alert: "pending" },
    message: "OceanShield AI maps 91% association probability to MVDeshRakshak based on drift and track intersection.",
    vesselUpdates: {},
    incidentUpdates: null,
    activeAlert: null
  },
  {
    step: 9,
    title: "Risk Assessment",
    statusText: "Environmental risk: 91/100 (HIGH)",
    checklist: { ais: "done", anomaly: "done", satellite: "done", oil: "done", correlation: "done", risk: "done", alert: "pending" },
    message: "Environmental threat analysis scores the spill 91/100 due to coastal proximity and marine sensitivity.",
    vesselUpdates: {},
    incidentUpdates: null,
    activeAlert: null
  },
  {
    step: 10,
    title: "Critical Alert",
    statusText: "Critical alert active",
    checklist: { ais: "done", anomaly: "done", satellite: "done", oil: "done", correlation: "done", risk: "done", alert: "done" },
    message: "CRITICAL ALERT: Potential active spill from MV Desh Rakshak. Local response units notified.",
    vesselUpdates: {},
    incidentUpdates: null,
    activeAlert: {
      id: "alert-4",
      type: "CRITICAL",
      title: "Potential Active Spill - Mumbai Region",
      message: "Vessel MV Desh Rakshak associated with 3.8 km² slick. Risk: HIGH.",
      vesselId: "vessel-1",
      time: "Just now"
    }
  },
  {
    step: 11,
    title: "Report Generation",
    statusText: "Incident report available",
    checklist: { ais: "done", anomaly: "done", satellite: "done", oil: "done", correlation: "done", risk: "done", alert: "done" },
    message: "End-to-End simulation complete. Full Incident Intelligence Report OS-2026-0104 compiled.",
    vesselUpdates: {},
    incidentUpdates: null,
    activeAlert: null
  }
];

// Helper to tick vessel coordinates forward during live simulation
export const simulateVesselMovement = (vessels) => {
  return vessels.map(v => {
    // Let normal ships wander a tiny bit or move along their course
    const headingRad = (v.course * Math.PI) / 180;
    const speedDeg = (v.speed * 0.0001); // scale speed down for coordinates update
    const dLat = Math.cos(headingRad) * speedDeg;
    const dLng = Math.sin(headingRad) * speedDeg;

    return {
      ...v,
      lat: parseFloat((v.lat + dLat).toFixed(5)),
      lng: parseFloat((v.lng + dLng).toFixed(5))
    };
  });
};
