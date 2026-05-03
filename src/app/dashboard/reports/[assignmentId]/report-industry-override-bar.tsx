'use client'

import { useState, useEffect, useCallback } from 'react'

interface Industry {
  id: string
  name: string
}

interface ReportIndustryFields {
  industry_id?: string | null
  target_industry_id?: string | null
  industry_id_override?: string | null
  industry_name?: string | null
  dimensions?: Array<{ industry_benchmark?: number | null }>
}

/**
 * Compact admin bar that surfaces which industry's benchmarks the report is
 * currently using, and lets privileged callers override it for this report
 * specifically. The override is persisted on report_data via the regenerate
 * endpoint, so it sticks across viewers and across automatic re-cache cycles.
 *
 * Only renders for 360 reports (the only flavor that consumes industry
 * benchmarks at the report level today).
 */
export default function ReportIndustryOverrideBar({
  assignmentId,
  reportData,
  onApplied,
}: {
  assignmentId: string
  reportData: ReportIndustryFields
  onApplied?: () => void
}) {
  const [industries, setIndustries] = useState<Industry[]>([])
  const [picking, setPicking] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/industries')
      if (!res.ok) return
      const json = await res.json()
      setIndustries((json.industries ?? json.data ?? json) as Industry[])
    } catch {
      // Silent — picker still works without the list, just shows fewer options.
    }
  }, [])

  useEffect(() => { void load() }, [load])

  // What industry value is the report currently rendering against?
  const usedId = reportData.industry_id ?? null
  const targetId = reportData.target_industry_id ?? null
  const overrideId = reportData.industry_id_override ?? null
  const isOverridden = overrideId !== null && overrideId !== undefined
  // If we resolved an industry but no dimension carries an industry_benchmark,
  // that industry has no benchmark rows for this assessment's dimensions —
  // surface that explicitly so the user knows why bars look empty.
  const hasAnyBenchmark = (reportData.dimensions ?? []).some(d => d.industry_benchmark != null)
  const industryHasNoBenchmarks = usedId !== null && !hasAnyBenchmark

  const apply = useCallback(async (next: string | null | 'use-target') => {
    setSaving(true)
    setError(null)
    try {
      const body =
        next === 'use-target'
          ? { industry_id_override: null } // null clears override; defaults back to target.industry_id
          : { industry_id_override: next }
      const res = await fetch(`/api/reports/generate/${assignmentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        throw new Error(errBody.error || `HTTP ${res.status}`)
      }
      setPicking(false)
      onApplied?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to apply override')
    } finally {
      setSaving(false)
    }
  }, [assignmentId, onApplied])

  return (
    <div className="mb-4 rounded border border-gray-200 bg-gray-50 px-4 py-2 text-sm">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-gray-600">Industry benchmark:</span>
        <span className="font-medium text-gray-900">
          {reportData.industry_name ?? <span className="text-gray-500 italic">(no industry — no benchmarks rendered)</span>}
        </span>
        {isOverridden && (
          <span className="rounded bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 text-xs font-medium">
            Override active
          </span>
        )}
        {!isOverridden && targetId && usedId === targetId && (
          <span className="text-xs text-gray-500">(from target&apos;s profile)</span>
        )}
        {industryHasNoBenchmarks && (
          <span className="text-xs text-amber-700">
            (no benchmarks loaded for this industry on this assessment)
          </span>
        )}
        <div className="ml-auto">
          <button
            onClick={() => setPicking(p => !p)}
            className="text-indigo-600 hover:text-indigo-800 underline decoration-dotted text-xs"
          >
            {picking ? 'Close' : 'Change'}
          </button>
        </div>
      </div>

      {picking && (
        <div className="mt-3 space-y-2 border-t border-gray-200 pt-3">
          <p className="text-xs text-gray-600">
            Pick an industry whose benchmarks should drive this report. Changing this triggers a regenerate
            and persists for everyone who views this report.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => apply('use-target')}
              disabled={saving}
              className="px-2 py-1 text-xs rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-50"
              title={targetId ? 'Defer to target.industry_id' : 'Target has no industry on profile'}
            >
              {saving ? '…' : 'Use target\'s industry'}
            </button>
            <select
              defaultValue=""
              onChange={(e) => { if (e.target.value) void apply(e.target.value) }}
              disabled={saving || industries.length === 0}
              className="rounded border-gray-300 text-xs"
            >
              <option value="" disabled>Pick an industry to override…</option>
              {industries
                .filter(i => i.id !== overrideId)
                .map(i => (
                  <option key={i.id} value={i.id}>{i.name}</option>
                ))}
            </select>
          </div>
          {error && <div className="text-xs text-red-700">{error}</div>}
          {!targetId && (
            <p className="text-xs text-gray-500 italic">
              Note: the target user has no industry on their profile. Without an override, no benchmarks render.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
