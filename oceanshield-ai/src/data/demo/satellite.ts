import { SatelliteAcquisition, SpillDetection } from '../../types/satellite'

export const DEMO_SATELLITE_ACQUISITIONS: SatelliteAcquisition[] = [
  {
    id: 'SAT-S1A-20260831-09412',
    satelliteName: 'Sentinel-1A',
    sensorType: 'SAR',
    passDirection: 'Descending',
    acquisitionTime: '2026-08-31T20:15:00Z',
    resolutionMeters: 10,
    polarization: 'VV + VH',
    imageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1200&auto=format&fit=crop',
    thumbnailUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=300&auto=format&fit=crop',
    bounds: {
      north: 19.5,
      south: 18.2,
      east: 73.5,
      west: 72.0,
    },
  },
  {
    id: 'SAT-RCM-20260830-18204',
    satelliteName: 'RADARSAT-Constellation',
    sensorType: 'SAR',
    passDirection: 'Ascending',
    acquisitionTime: '2026-08-30T14:40:00Z',
    resolutionMeters: 5,
    polarization: 'HH + HV',
    imageUrl: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=1200&auto=format&fit=crop',
    bounds: {
      north: 19.8,
      south: 19.0,
      east: 72.9,
      west: 72.1,
    },
  },
]

export const DEMO_SPILL_DETECTIONS: SpillDetection[] = [
  {
    id: 'DET-2026-0891',
    acquisitionId: 'SAT-S1A-20260831-09412',
    imageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1200&auto=format&fit=crop',
    confidence: 94,
    acquisitionTime: '2026-08-31T20:15:00Z',
    areaSqKm: 14.8,
    maxDarknessIndex: 0.88,
    windSpeedKtsAtScan: 8.5,
    windDirectionDegAtScan: 210,
    windValidationScore: 92,
    shapeRatio: 4.2,
    aisCorrelationScore: 96,
    polygon: {
      type: 'Polygon',
      coordinates: [
        [
          [72.81, 18.91],
          [72.84, 18.93],
          [72.87, 18.88],
          [72.83, 18.86],
          [72.81, 18.91],
        ],
      ],
    },
  },
]
