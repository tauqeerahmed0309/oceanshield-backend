export interface ApiResponse<T> {
  data: T | null
  error?: string
  status: number
  timestamp: string
}

export interface BackendHealth {
  status: 'online' | 'offline' | 'degraded' | 'ok'
  version?: string
  timestamp: string
  services?: {
    database?: boolean
    aiModel?: boolean
    aisFeed?: boolean
  }
}

export interface ReportGenerationRequest {
  incidentId: string
  format: 'pdf' | 'json' | 'markdown'
  includeSatelliteImagery?: boolean
  includeDriftTrajectory?: boolean
  includeCandidateVessels?: boolean
  notes?: string
}

export interface ReportGenerationResponse {
  reportId: string
  downloadUrl?: string
  generatedAt: string
  status: 'COMPLETED' | 'PROCESSING' | 'FAILED'
  summaryText: string
}
