export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export type VerificationStatus = 'DETECTED' | 'VERIFYING' | 'VERIFIED' | 'ATTRIBUTION' | 'ATTRIBUTED' | 'REJECTED'

export interface Incident {
  id: string
  title: string
  latitude: number
  longitude: number
  timestamp: string
  severity: IncidentSeverity
  status: VerificationStatus
  spillConfidence: number // 0-100 percentage
  affectedAreaSqKm?: number
  estimatedVolumeBarrels?: number
  probableSourceVesselMmsi?: string
  probableSourceVesselName?: string
  attributionConfidence?: 'HIGH' | 'MEDIUM' | 'LOW'
  evidenceCount?: number
  sensorSource?: string // e.g. 'Sentinel-1A SAR', 'MODIS', 'RADARSAT-2'
  notes?: string
}
