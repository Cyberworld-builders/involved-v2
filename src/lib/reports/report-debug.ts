/**
 * Report debug flag: when true, log at every step and set window.__REPORT_DEBUG__.
 * Enable via NEXT_PUBLIC_REPORT_DEBUG=true or ?report_debug=1 on the report URL.
 */

export function getReportDebug(): boolean {
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_REPORT_DEBUG === 'true'
  }
  return (
    process.env.NEXT_PUBLIC_REPORT_DEBUG === 'true' ||
    window.location.search.includes('report_debug=1')
  )
}

export function useReportDebug(): boolean {
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_REPORT_DEBUG === 'true'
  }
  return (
    process.env.NEXT_PUBLIC_REPORT_DEBUG === 'true' ||
    window.location.search.includes('report_debug=1')
  )
}

export type ReportDebugPayload = {
  assignmentId: string
  is360: boolean
  source: 'dashboard' | 'fullscreen'
  apiResponse?: { report?: unknown; cached?: boolean; _debug?: unknown }
  reportData: unknown
  timestamp: string
}

declare global {
  interface Window {
    __REPORT_DEBUG__?: ReportDebugPayload
  }
}

export function setReportDebugGlobal(payload: ReportDebugPayload): void {
  if (typeof window !== 'undefined') {
    window.__REPORT_DEBUG__ = payload
  }
}

export function reportDataSummary(report: unknown): Record<string, unknown> {
  if (report == null || typeof report !== 'object') {
    return { reportIs: report == null ? 'null' : typeof report }
  }
  const r = report as Record<string, unknown>
  return {
    keys: Object.keys(r),
    dimensionsLength: Array.isArray(r.dimensions) ? r.dimensions.length : undefined,
    partial: r.partial,
    overall_score: r.overall_score,
    assessment_title: r.assessment_title,
  }
}
