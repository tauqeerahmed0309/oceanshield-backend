import { apiFetch } from './client'
import { SatelliteAcquisition, SpillDetection } from '../types/satellite'
import { ApiResponse } from '../types/api'

export async function getSatelliteAcquisitions(): Promise<ApiResponse<SatelliteAcquisition[]>> {
  return apiFetch<SatelliteAcquisition[]>('/api/v1/satellite/acquisitions')
}

export async function getSatelliteAnalysis(id: string): Promise<ApiResponse<SpillDetection>> {
  return apiFetch<SpillDetection>(`/api/v1/satellite/${id}`)
}
