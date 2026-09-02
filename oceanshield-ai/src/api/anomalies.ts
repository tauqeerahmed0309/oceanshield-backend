import { apiFetch } from './client'
import { ApiResponse } from '../types/api'

export interface AISAnomaly {
  id: number
  mmsi: string
  latitude: number
  longitude: number
  anomaly_type: string
  anomaly_score: number
  detected_at: string
}

export async function getAnomalies(): Promise<ApiResponse<AISAnomaly[]>> {
  return apiFetch<AISAnomaly[]>('/api/v1/anomalies')
}
