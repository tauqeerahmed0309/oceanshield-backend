import { apiFetch } from './client'
import { ApiResponse } from '../types/api'

export interface SpillCandidate {
  id: number
  centroid_lat: number
  centroid_lon: number
  unet_confidence: number
  wind_speed_ms?: number
  lookalike_prob?: number
  spatial_weight: number
  ais_boost: number
  persistence_penalty: number
  final_score?: number
  verdict?: string
  filter_breakdown?: Record<string, unknown>
  detected_at: string
  // Enriched fields from backend
  regionName?: string
  confidencePct?: number
  areaSqKm?: number
  windSpeedKts?: number
}

export interface ImageAnalysisResult {
  id: number
  centroid_lat: number
  centroid_lon: number
  unet_confidence: number
  final_score: number
  verdict: string
  filter_breakdown?: Record<string, unknown>
  detected_at: string
}

export async function getSpillCandidates(): Promise<ApiResponse<SpillCandidate[]>> {
  return apiFetch<SpillCandidate[]>('/api/v1/spills')
}

export async function analyzeSatelliteImage(
  file: File,
  latitude: number,
  longitude: number,
  timestamp?: string,
): Promise<ApiResponse<ImageAnalysisResult>> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('latitude', String(latitude))
  formData.append('longitude', String(longitude))
  if (timestamp) formData.append('capture_time', timestamp)

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
  const url = `${API_BASE_URL}/api/v1/spills/analyze-image`

  try {
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      // No Content-Type header — browser sets multipart boundary automatically
    })

    if (!response.ok) {
      return {
        data: null,
        status: response.status,
        error: `Analysis failed: ${response.statusText}`,
        timestamp: new Date().toISOString(),
      }
    }

    const data = (await response.json()) as ImageAnalysisResult
    return {
      data,
      status: response.status,
      timestamp: new Date().toISOString(),
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Backend unavailable'
    return {
      data: null,
      status: 0,
      error: `Backend unavailable: ${errorMessage}`,
      timestamp: new Date().toISOString(),
    }
  }
}
