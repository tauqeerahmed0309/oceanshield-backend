import { apiFetch } from './client'
import { Vessel } from '../types/vessel'
import { ApiResponse } from '../types/api'

function normalizeVessel(raw: any): Vessel {
  return {
    mmsi: String(raw.mmsi ?? ''),
    imo: raw.imo ?? undefined,
    name: raw.name ?? raw.ship_name ?? 'Unknown Vessel',
    callsign: raw.callsign ?? undefined,
    flag: raw.flag ?? undefined,
    type: (raw.type as Vessel['type']) ?? 'Other',
    latitude: Number(raw.latitude ?? 0),
    longitude: Number(raw.longitude ?? 0),
    speed: raw.speed ?? raw.sog ?? undefined,
    course: raw.course ?? raw.cog ?? undefined,
    heading: raw.heading ?? raw.course ?? raw.cog ?? undefined,
    timestamp: raw.timestamp ?? new Date().toISOString(),
    status: raw.status ?? 'Underway',
    suspicious: Boolean(raw.suspicious),
    anomalyReason: raw.anomalyReason ?? raw.anomaly_reason ?? undefined,
    anomalySeverity: (raw.anomalySeverity as Vessel['anomalySeverity']) ?? undefined,
    destination: raw.destination ?? undefined,
    eta: raw.eta ?? undefined,
    routeHistory: raw.routeHistory ?? undefined,
    aisGaps: raw.aisGaps ?? undefined,
  }
}

export async function getVessels(): Promise<ApiResponse<Vessel[]>> {
  const res = await apiFetch<any[]>('/api/v1/vessels')
  return {
    ...res,
    data: res.data ? res.data.map(normalizeVessel) : null,
  }
}

export async function getVesselByMmsi(mmsi: string): Promise<ApiResponse<Vessel>> {
  const res = await apiFetch<any>(`/api/v1/vessels/${mmsi}`)
  return {
    ...res,
    data: res.data ? normalizeVessel(res.data) : null,
  }
}

export async function getSuspiciousVessels(): Promise<ApiResponse<Vessel[]>> {
  const res = await apiFetch<any[]>('/api/v1/vessels?suspicious=true')
  return {
    ...res,
    data: res.data ? res.data.map(normalizeVessel) : null,
  }
}
