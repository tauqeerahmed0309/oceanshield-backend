import { apiFetch } from './client'
import { ApiResponse } from '../types/api'

export interface AnalyticsData {
  totalIncidents: number
  activeMonitoredVessels: number
  totalSpillAreaSqKm: number
  attributionSuccessRate: number
  monthlyIncidents: { month: string; incidents: number; areaSqKm: number }[]
  vesselAnomaliesByType: { category: string; count: number }[]
  riskRegions: { region: string; riskScore: number; incidents: number }[]
}

export async function getAnalytics(): Promise<ApiResponse<AnalyticsData>> {
  return apiFetch<AnalyticsData>('/api/v1/analytics')
}
