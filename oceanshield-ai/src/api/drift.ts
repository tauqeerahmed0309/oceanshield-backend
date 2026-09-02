import { apiFetch } from './client'

export interface DriftPoint {
  lat: number
  lon: number
  time: string
}

export interface DriftResult {
  spill_lat: number
  spill_lon: number
  spill_time: string
  
  origin_lat: number
  origin_lon: number
  origin_time: string
  hindcast_confidence: number
  hindcast_trajectory: DriftPoint[]
  
  forecast_lat: number
  forecast_lon: number
  forecast_time: string
  forecast_confidence: number
  forecast_trajectory: DriftPoint[]
  
  drift_direction_deg: number
  drift_speed_knots: number
  total_drift_km: number
  spread_area_km2: number
  
  direction_from: string
  direction_to: string
}

export interface DriftRequest {
  latitude: number
  longitude: number
  timestamp?: string
  hindcast_hours?: number
  forecast_hours?: number
}

export interface VesselNearSpill {
  mmsi: string
  ship_name: string
  vessel_type: string
  latitude: number
  longitude: number
  speed: number
  course: number
  distance_km: number
  timestamp: string
  suspicious: boolean
  anomaly_score: number
}

export async function predictDrift(request: DriftRequest) {
  return apiFetch<DriftResult>('/api/v1/drift/predict', {
    method: 'POST',
    body: JSON.stringify(request),
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function getVesselsNearSpill(
  lat: number,
  lon: number,
  radiusKm: number = 50,
  hours: number = 24,
) {
  return apiFetch<VesselNearSpill[]>(
    `/api/v1/drift/vessels-near-spill?lat=${lat}&lon=${lon}&radius_km=${radiusKm}&hours=${hours}`
  )
}
