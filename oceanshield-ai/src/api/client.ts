import { ApiResponse, BackendHealth } from '../types/api'

// Single Source of Truth for API base URL
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

interface FetchOptions extends RequestInit {
  timeoutMs?: number
}

/**
 * Centralized API Client that connects to Friend's Backend at VITE_API_BASE_URL (http://localhost:8000)
 */
export async function apiFetch<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<ApiResponse<T>> {
  const { timeoutMs = 8000, headers = {}, ...customConfig } = options

  // Clean path formatting
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  const fullUrl = API_BASE_URL.endsWith('/')
    ? `${API_BASE_URL.slice(0, -1)}${cleanEndpoint}`
    : `${API_BASE_URL}${cleanEndpoint}`

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(fullUrl, {
      ...customConfig,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      return {
        data: null,
        status: response.status,
        error: `HTTP Error ${response.status}: ${response.statusText}`,
        timestamp: new Date().toISOString(),
      }
    }

    const data = (await response.json()) as T
    return {
      data,
      status: response.status,
      timestamp: new Date().toISOString(),
    }
  } catch (err: unknown) {
    clearTimeout(timeoutId)
    const errorMessage =
      err instanceof Error
        ? err.name === 'AbortError'
          ? 'Backend request timed out'
          : err.message
        : 'Backend unavailable'

    return {
      data: null,
      status: 0,
      error: `Backend unavailable: ${errorMessage}`,
      timestamp: new Date().toISOString(),
    }
  }
}

/**
 * Health check endpoint to verify backend connectivity
 */
export async function checkBackendHealth(): Promise<BackendHealth> {
  const res = await apiFetch<BackendHealth>('/api/v1/health', { timeoutMs: 3000 })
  if (res.data && res.status === 200) {
    return {
      ...res.data,
      status: res.data.status === 'ok' ? 'online' : res.data.status,
    }
  }
  return {
    status: 'offline',
    timestamp: new Date().toISOString(),
  }
}
