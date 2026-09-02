export interface DriftVector {
  timestamp: string
  latitude: number
  longitude: number
  windSpeedKts: number
  windDirectionDeg: number
  currentSpeedKts: number
  currentDirectionDeg: number
}

export interface CandidateEvidence {
  type: 'Spatial' | 'Temporal' | 'Trajectory' | 'Drift Compatibility' | 'AIS Anomaly' | 'Speed Drop'
  description: string
  score: number // 0-100
  passed: boolean
}

export interface AttributionCandidate {
  vesselId: string
  mmsi: string
  vesselName: string
  vesselType: string
  flag?: string
  confidenceCategory: 'MATCH' | 'HIGH' | 'MEDIUM' | 'LOW'
  overallScore: number // 0 to 100
  closestDistanceKm: number
  closestTimeOffsetHours: number
  evidenceList: CandidateEvidence[]
  trajectoryPath?: { latitude: number; longitude: number; timestamp: string }[]
}

export interface DriftAnalysis {
  incidentId: string
  spillLocation: { latitude: number; longitude: number }
  detectionTime: string
  simulationTimeWindowHours: number
  backwardDriftPath: DriftVector[]
  forwardDriftPath: DriftVector[]
  probableSourceRegion: {
    centerLatitude: number
    centerLongitude: number
    radiusKm: number
  }
  candidates: AttributionCandidate[]
}
