import { apiFetch } from './client'
import { API_BASE_URL } from './client'
import { ReportGenerationRequest, ReportGenerationResponse, ApiResponse } from '../types/api'

export async function generateReport(
  req: ReportGenerationRequest
): Promise<ApiResponse<ReportGenerationResponse>> {
  return apiFetch<ReportGenerationResponse>('/api/v1/reports', {
    method: 'POST',
    body: JSON.stringify(req),
  })
}

/**
 * Fetches a generated report file from the backend and triggers a browser
 * download. Works for JSON, Markdown, and PDF formats.
 *
 * @param downloadUrl  The relative URL returned by generateReport()
 *                     e.g. "/api/v1/reports/RPT-1-ABCD1234/download"
 * @param filename     Suggested filename for the saved file
 */
export async function downloadReport(downloadUrl: string, filename: string): Promise<void> {
  const fullUrl = API_BASE_URL.endsWith('/')
    ? `${API_BASE_URL.slice(0, -1)}${downloadUrl}`
    : `${API_BASE_URL}${downloadUrl}`

  const response = await fetch(fullUrl, { method: 'GET' })

  if (!response.ok) {
    throw new Error(`Download failed: ${response.status} ${response.statusText}`)
  }

  const blob = await response.blob()
  const objectUrl = URL.createObjectURL(blob)

  // Create a temporary anchor, click it, then clean up
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(objectUrl)
}
