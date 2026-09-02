import { apiFetch } from './client'
import { Incident } from '../types/incident'
import { ApiResponse } from '../types/api'

export async function getIncidents(): Promise<ApiResponse<Incident[]>> {
  return apiFetch<Incident[]>('/api/v1/incidents')
}

export async function getIncidentById(id: string): Promise<ApiResponse<Incident>> {
  return apiFetch<Incident>(`/api/v1/incidents/${id}`)
}
