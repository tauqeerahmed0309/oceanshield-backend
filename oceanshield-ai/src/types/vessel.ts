export type VesselType = 'Tanker' | 'Cargo' | 'Container' | 'Bulk Carrier' | 'Tug' | 'Fishing' | 'Passenger' | 'Other'

export type AnomalySeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export interface AISPosition {
  latitude: number
  longitude: number
  timestamp: string
  speed?: number
  course?: number
  heading?: number
}

export interface Vessel {
  mmsi: string
  imo?: string
  name: string
  callsign?: string
  flag?: string
  type: VesselType
  length?: number
  beam?: number
  draft?: number
  latitude: number
  longitude: number
  speed?: number
  course?: number
  heading?: number
  timestamp: string
  status?: string
  suspicious: boolean
  anomalyReason?: string
  anomalySeverity?: AnomalySeverity
  destination?: string
  eta?: string
  routeHistory?: AISPosition[]
  aisGaps?: { startTime: string; endTime: string; durationMinutes: number }[]
}
