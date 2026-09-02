export const initialIncidents = [
  {
    id: "OS-2026-0104",
    name: "Incident #104",
    satellite: "Sentinel-1",
    detectedAt: "Aug 18, 14:32 UTC",
    lat: 25.781,
    lng: -90.421,
    oilProbability: 94,
    area: 3.8, // km²
    confidence: 91, // %
    risk: "HIGH",
    status: "HIGH RISK",
    lookalikeAnalysis: {
      surfaceDarkness: "HIGH",
      slickShape: "HIGH",
      textureSimilarity: "HIGH",
      windCompatibility: "HIGH",
      distanceFromVessel: "HIGH"
    },
    environmentalRisk: {
      score: 91,
      spillSize: 82,
      coastalProximity: 94,
      marineSensitivity: 88,
      oilProbability: 94,
      vesselAnomaly: 87
    }
  },
  {
    id: "OS-2026-0102",
    name: "Incident #102",
    satellite: "Sentinel-1",
    detectedAt: "Aug 18, 11:15 UTC",
    lat: 26.520,
    lng: -88.240,
    oilProbability: 76,
    area: 1.2, // km²
    confidence: 72, // %
    risk: "MEDIUM",
    status: "MEDIUM RISK",
    lookalikeAnalysis: {
      surfaceDarkness: "MEDIUM",
      slickShape: "HIGH",
      textureSimilarity: "MEDIUM",
      windCompatibility: "LOW",
      distanceFromVessel: "HIGH"
    },
    environmentalRisk: {
      score: 64,
      spillSize: 45,
      coastalProximity: 62,
      marineSensitivity: 70,
      oilProbability: 76,
      vesselAnomaly: 72
    }
  },
  {
    id: "OS-2026-0103",
    name: "Incident #103",
    satellite: "Sentinel-1",
    detectedAt: "Aug 18, 08:45 UTC",
    lat: 27.215,
    lng: -92.512,
    oilProbability: 98,
    area: 5.6, // km²
    confidence: 95, // %
    risk: "CRITICAL",
    status: "CRITICAL RISK",
    lookalikeAnalysis: {
      surfaceDarkness: "HIGH",
      slickShape: "HIGH",
      textureSimilarity: "HIGH",
      windCompatibility: "HIGH",
      distanceFromVessel: "HIGH"
    },
    environmentalRisk: {
      score: 95,
      spillSize: 94,
      coastalProximity: 88,
      marineSensitivity: 92,
      oilProbability: 98,
      vesselAnomaly: 91
    }
  }
];
