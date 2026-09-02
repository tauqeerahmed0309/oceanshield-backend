import { apiFetch } from './client'
import { DriftAnalysis } from '../types/attribution'
import { ApiResponse } from '../types/api'

export async function getDriftAndAttribution(incidentId: string): Promise<ApiResponse<DriftAnalysis>> {
  return apiFetch<DriftAnalysis>(`/api/v1/attribution/${incidentId}`)
}
