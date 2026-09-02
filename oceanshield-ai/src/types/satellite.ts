export interface SpillPolygon {
  type: 'Polygon' | 'MultiPolygon'
  coordinates: number[][][]
}

export interface SatelliteAcquisition {
  id: string
  satelliteName: string // e.g. 'Sentinel-1B', 'RADARSAT-Constellation'
  sensorType: 'SAR' | 'Optical' | 'Infrared'
  passDirection: 'Ascending' | 'Descending'
  acquisitionTime: string
  resolutionMeters: number
  polarization?: string // e.g. 'VV+VH'
  imageUrl?: string
  thumbnailUrl?: string
  bounds?: {
    north: number
    south: number
    east: number
    west: number
  }
}

export interface SpillDetection {
  id: string
  acquisitionId: string
  imageUrl?: string
  maskUrl?: string
  polygon?: SpillPolygon
  confidence: number // 0 to 100 percentage
  acquisitionTime: string
  areaSqKm: number
  maxDarknessIndex?: number
  windSpeedKtsAtScan?: number
  windDirectionDegAtScan?: number
  windValidationScore?: number // 0-100 percentage
  shapeRatio?: number
  aisCorrelationScore?: number
}
