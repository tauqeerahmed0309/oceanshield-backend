import { DriftAnalysis } from '../../types/attribution'

export const DEMO_DRIFT_ANALYSIS: DriftAnalysis = {
  incidentId: 'INC-2026-0891',
  spillLocation: { latitude: 18.89, longitude: 72.84 },
  detectionTime: '2026-08-31T20:15:00Z',
  simulationTimeWindowHours: 12,
  backwardDriftPath: [
    { timestamp: '2026-08-31T20:15:00Z', latitude: 18.89, longitude: 72.84, windSpeedKts: 8.5, windDirectionDeg: 210, currentSpeedKts: 0.8, currentDirectionDeg: 190 },
    { timestamp: '2026-08-31T19:15:00Z', latitude: 18.87, longitude: 72.86, windSpeedKts: 9.0, windDirectionDeg: 215, currentSpeedKts: 0.9, currentDirectionDeg: 195 },
    { timestamp: '2026-08-31T18:15:00Z', latitude: 18.85, longitude: 72.89, windSpeedKts: 9.2, windDirectionDeg: 220, currentSpeedKts: 1.0, currentDirectionDeg: 200 },
    { timestamp: '2026-08-31T17:15:00Z', latitude: 18.83, longitude: 72.92, windSpeedKts: 8.8, windDirectionDeg: 210, currentSpeedKts: 0.8, currentDirectionDeg: 190 },
  ],
  forwardDriftPath: [
    { timestamp: '2026-08-31T20:15:00Z', latitude: 18.89, longitude: 72.84, windSpeedKts: 8.5, windDirectionDeg: 210, currentSpeedKts: 0.8, currentDirectionDeg: 190 },
    { timestamp: '2026-08-31T21:15:00Z', latitude: 18.91, longitude: 72.82, windSpeedKts: 8.0, windDirectionDeg: 205, currentSpeedKts: 0.7, currentDirectionDeg: 185 },
    { timestamp: '2026-08-31T22:15:00Z', latitude: 18.93, longitude: 72.80, windSpeedKts: 7.5, windDirectionDeg: 200, currentSpeedKts: 0.6, currentDirectionDeg: 180 },
  ],
  probableSourceRegion: {
    centerLatitude: 18.85,
    centerLongitude: 72.89,
    radiusKm: 3.2,
  },
  candidates: [
    {
      vesselId: 'VESSEL-419001234',
      mmsi: '419001234',
      vesselName: 'OCEAN VOYAGER',
      vesselType: 'Tanker',
      flag: 'India',
      confidenceCategory: 'MATCH',
      overallScore: 94,
      closestDistanceKm: 0.4,
      closestTimeOffsetHours: 0.2,
      evidenceList: [
        { type: 'Spatial', description: 'Trajectory passed 400m from back-projected origin', score: 98, passed: true },
        { type: 'Temporal', description: 'Vessel present at estimated discharge timestamp (18:25 UTC)', score: 95, passed: true },
        { type: 'AIS Anomaly', description: '70-minute unannounced AIS transmission black-out during passage', score: 92, passed: true },
        { type: 'Speed Drop', description: 'Sudden speed reduction from 14.1 kts to 4.2 kts near origin', score: 89, passed: true },
      ],
    },
    {
      vesselId: 'VESSEL-352990123',
      mmsi: '352990123',
      vesselName: 'PACIFIC NEPTUNE',
      vesselType: 'Bulk Carrier',
      flag: 'Liberia',
      confidenceCategory: 'MEDIUM',
      overallScore: 48,
      closestDistanceKm: 3.8,
      closestTimeOffsetHours: 1.5,
      evidenceList: [
        { type: 'Spatial', description: 'Track within 3.8km of candidate origin envelope', score: 55, passed: true },
        { type: 'Temporal', description: 'Passed area 1.5 hours prior to calculated slick birth', score: 40, passed: false },
        { type: 'Drift Compatibility', description: 'Drift trajectory offset exceeds 2 sigma probability bounds', score: 45, passed: false },
      ],
    },
    {
      vesselId: 'VESSEL-413889012',
      mmsi: '413889012',
      vesselName: 'SEA PHOENIX',
      vesselType: 'Tanker',
      flag: 'Panama',
      confidenceCategory: 'LOW',
      overallScore: 22,
      closestDistanceKm: 8.2,
      closestTimeOffsetHours: 3.1,
      evidenceList: [
        { type: 'Spatial', description: 'Vessel track outside 5km confidence boundary', score: 20, passed: false },
        { type: 'Temporal', description: 'Passed 3.1 hours after estimated release window', score: 25, passed: false },
      ],
    },
  ],
}
