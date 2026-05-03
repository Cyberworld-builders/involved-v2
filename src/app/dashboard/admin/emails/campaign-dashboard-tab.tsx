'use client'

import { useState, useEffect, useCallback } from 'react'

interface SurveyListItem {
  id: string
  name: string | null
  created_at: string
  client: { id: string; name: string } | { id: string; name: string }[] | null
  assessment: { id: string; title: string } | { id: string; title: string }[] | null
}

interface SurveyDetail {
  survey: SurveyListItem
  window: { from: string; to: string }
  breakdown: {
    sent: number
    delivered: number
    bounced: number
    complained: number
    failed: number
    total: number
  }
  bounce_complaint_rows: Array<{
    recipient_email: string
    status: 'bounced' | 'complained'
    bounce_type: string | null
    bounce_subtype: string | null
    complaint_type: string | null
    feedback_received_at: string | null
    subject: string
  }>
  recent_deliveries: Array<{ recipient_email: string; delivered_at: string | null; subject: string }>
  avg_delivery_latency_ms: number | null
  health: {
    level: 'green' | 'yellow' | 'red'
    reasons: string[]
    bounce_rate: number
    complaint_rate: number
    failure_rate: number
  }
  assignments: { total: number; completed: number; pending: number; completion_rate: number }
  projected_upcoming_emails: number
  capacity: {
    level: 'green' | 'yellow' | 'red'
    ceiling: number
    utilization: number
    message: string
    last_verified: string
    ses_daily_quota: number
    reminder_sequential_per_run: number
  }
}

function flatRel<T extends { name?: string; title?: string }>(rel: T | T[] | null): T | null {
  if (!rel) return null
  return Array.isArray(rel) ? rel[0] ?? null : rel
}

function pct(n: number) {
  return `${(n * 100).toFixed(1)}%`
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
}

function HealthBadge({ level }: { level: 'green' | 'yellow' | 'red' }) {
  const cls = {
    green: 'bg-green-100 text-green-800 border-green-200',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    red: 'bg-red-100 text-red-800 border-red-200',
  }[level]
  const label = { green: 'Healthy', yellow: 'Watch', red: 'Action needed' }[level]
  return <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded border ${cls}`}>{label}</span>
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10)
}

export default function CampaignDashboardTab({ onTraceRecipient }: { onTraceRecipient?: (recipient: string) => void }) {
  const [surveys, setSurveys] = useState<SurveyListItem[]>([])
  const [selectedSurvey, setSelectedSurvey] = useState<string>('')
  const [clientFilter, setClientFilter] = useState<string>('')

  const today = new Date()
  const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
  const [fromDate, setFromDate] = useState<string>(isoDate(sevenDaysAgo))
  const [toDate, setToDate] = useState<string>(isoDate(today))

  const [detail, setDetail] = useState<SurveyDetail | null>(null)
  const [listLoading, setListLoading] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCapacity, setShowCapacity] = useState(false)

  const loadSurveys = useCallback(async () => {
    setListLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (clientFilter) params.set('clientId', clientFilter)
      const res = await fetch(`/api/admin/email-campaign?${params.toString()}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setSurveys(json.surveys ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load surveys')
    } finally {
      setListLoading(false)
    }
  }, [clientFilter])

  const loadDetail = useCallback(async () => {
    if (!selectedSurvey) {
      setDetail(null)
      return
    }
    setDetailLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ survey: selectedSurvey })
      // Treat the picked dates as UTC day boundaries. Naive `new Date(yyyy-mm-dd)`
      // parses as UTC midnight, but `setHours(...)` mutates local components,
      // which produces a `to` that's wrong by the user's UTC offset (e.g. CDT
      // users would lose ~5h of "today"). Constructing the UTC ISO string
      // directly avoids the mixed-mode bug.
      if (fromDate) params.set('from', `${fromDate}T00:00:00.000Z`)
      if (toDate) params.set('to', `${toDate}T23:59:59.999Z`)
      const res = await fetch(`/api/admin/email-campaign?${params.toString()}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json: SurveyDetail = await res.json()
      setDetail(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load survey detail')
    } finally {
      setDetailLoading(false)
    }
  }, [selectedSurvey, fromDate, toDate])

  useEffect(() => { void loadSurveys() }, [loadSurveys])
  useEffect(() => { void loadDetail() }, [loadDetail])

  const selectedSurveyMeta = surveys.find(s => s.id === selectedSurvey)

  // Build a unique client list from the surveys we got back, for the client filter selector.
  const clientOptions = (() => {
    const seen = new Map<string, string>()
    for (const s of surveys) {
      const c = flatRel(s.client)
      if (c?.id && !seen.has(c.id)) seen.set(c.id, c.name)
    }
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }))
  })()

  return (
    <div className="space-y-6">
      {/* Selectors */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700">Client</label>
            <select
              value={clientFilter}
              onChange={(e) => { setClientFilter(e.target.value); setSelectedSurvey('') }}
              className="mt-1 block w-full rounded border-gray-300 text-sm"
            >
              <option value="">All clients</option>
              {clientOptions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">Survey</label>
            <select
              value={selectedSurvey}
              onChange={(e) => setSelectedSurvey(e.target.value)}
              className="mt-1 block w-full rounded border-gray-300 text-sm"
              disabled={listLoading || surveys.length === 0}
            >
              <option value="">{listLoading ? 'Loading…' : surveys.length === 0 ? 'No surveys' : 'Select a survey'}</option>
              {surveys
                .filter(s => !clientFilter || flatRel(s.client)?.id === clientFilter)
                .map(s => {
                  const c = flatRel(s.client)
                  const a = flatRel(s.assessment)
                  const label = `${a?.title ?? 'Assessment'} — ${c?.name ?? 'Client'} ${s.name ? `(${s.name})` : ''}`
                  return <option key={s.id} value={s.id}>{label}</option>
                })}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">From</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="mt-1 block w-full rounded border-gray-300 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">To</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="mt-1 block w-full rounded border-gray-300 text-sm"
            />
          </div>
        </div>
        <p className="mt-3 text-xs text-gray-500">Default window is the last 7 days. Date range applies to retrospective stats; projection uses the same window.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 text-sm p-3 rounded">{error}</div>
      )}

      {!selectedSurvey && !listLoading && (
        <div className="bg-gray-50 border border-gray-200 rounded p-6 text-sm text-gray-600 text-center">
          Pick a survey above to see its email observability summary.
        </div>
      )}

      {selectedSurvey && detailLoading && !detail && (
        <div className="bg-gray-50 border border-gray-200 rounded p-6 text-sm text-gray-600 text-center">
          Loading survey detail…
        </div>
      )}

      {detail && (
        <>
          {/* Overview header */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {flatRel(detail.survey.assessment)?.title ?? 'Assessment'}
                </h2>
                <p className="text-sm text-gray-600">
                  {flatRel(detail.survey.client)?.name ?? 'Client'}
                  {selectedSurveyMeta?.name ? ` · ${selectedSurveyMeta.name}` : ''}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Created {fmtDate(detail.survey.created_at)} · Window {detail.window.from.slice(0,10)} → {detail.window.to.slice(0,10)}
                </p>
              </div>
              <HealthBadge level={detail.health.level} />
            </div>
          </div>

          {/* Status breakdown widgets */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <StatCard label="Sent (in flight)" value={detail.breakdown.sent} />
            <StatCard label="Delivered" value={detail.breakdown.delivered} subtle={detail.breakdown.total > 0 ? pct(detail.breakdown.delivered / detail.breakdown.total) : ''} />
            <StatCard label="Bounced" value={detail.breakdown.bounced} subtle={pct(detail.health.bounce_rate)} variant={detail.breakdown.bounced > 0 ? 'warn' : undefined} />
            <StatCard label="Complaints" value={detail.breakdown.complained} subtle={pct(detail.health.complaint_rate)} variant={detail.breakdown.complained > 0 ? 'danger' : undefined} />
            <StatCard label="Send failures" value={detail.breakdown.failed} subtle={pct(detail.health.failure_rate)} variant={detail.breakdown.failed > 0 ? 'warn' : undefined} />
          </div>

          {/* Health rollup */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Health</h3>
            <div className="flex items-start gap-3">
              <HealthBadge level={detail.health.level} />
              <ul className="text-sm text-gray-700 list-disc pl-4">
                {detail.health.reasons.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>
            {detail.avg_delivery_latency_ms !== null && (
              <p className="mt-3 text-xs text-gray-500">
                Average delivery latency: {(detail.avg_delivery_latency_ms / 1000).toFixed(2)}s — informational, not a health signal.
              </p>
            )}
          </div>

          {/* Assignments + projection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Assignments</h3>
              <div className="grid grid-cols-3 gap-2 text-center">
                <Mini label="Total" value={detail.assignments.total} />
                <Mini label="Completed" value={detail.assignments.completed} />
                <Mini label="Pending" value={detail.assignments.pending} />
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Completion rate: {pct(detail.assignments.completion_rate)}
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Upcoming email activity (proxy)</h3>
              <p className="text-2xl font-semibold text-gray-900">{detail.projected_upcoming_emails}</p>
              <p className="text-xs text-gray-500 mt-1">
                Pending assignments under this survey. Each could trigger a reminder when the cron runs (exact count depends on the reminder schedule we don&apos;t parse here).
              </p>
            </div>
          </div>

          {/* Bounce + complaint detail rows */}
          {detail.bounce_complaint_rows.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">
                Failed deliveries ({detail.bounce_complaint_rows.length})
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-left text-xs text-gray-500 border-b">
                    <tr>
                      <th className="py-2 pr-3">Recipient</th>
                      <th className="py-2 pr-3">Status</th>
                      <th className="py-2 pr-3">Type</th>
                      <th className="py-2 pr-3">When</th>
                      <th className="py-2 pr-3">Subject</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.bounce_complaint_rows.map((r, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-2 pr-3 font-mono text-xs">
                          {onTraceRecipient ? (
                            <button
                              onClick={() => onTraceRecipient(r.recipient_email)}
                              className="text-indigo-600 hover:text-indigo-800 underline decoration-dotted"
                              title="View this recipient's timeline"
                            >
                              {r.recipient_email}
                            </button>
                          ) : (
                            r.recipient_email
                          )}
                        </td>
                        <td className="py-2 pr-3">
                          <span className={r.status === 'complained' ? 'text-red-700 font-semibold' : 'text-amber-700 font-semibold'}>
                            {r.status}
                          </span>
                        </td>
                        <td className="py-2 pr-3 text-xs text-gray-600">
                          {r.status === 'bounced'
                            ? `${r.bounce_type ?? '?'}${r.bounce_subtype ? ` / ${r.bounce_subtype}` : ''}`
                            : r.complaint_type ?? '?'}
                        </td>
                        <td className="py-2 pr-3 text-xs text-gray-600">
                          {r.feedback_received_at ? fmtDate(r.feedback_received_at) : '—'}
                        </td>
                        <td className="py-2 pr-3 text-xs text-gray-600 truncate max-w-md">{r.subject}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Capacity panel — collapsible */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <button
              onClick={() => setShowCapacity(s => !s)}
              className="flex items-center gap-2 text-sm font-semibold text-gray-900"
            >
              <span>{showCapacity ? '▼' : '▶'}</span>
              Capacity reference
            </button>
            {showCapacity && (
              <div className="mt-3 space-y-2 text-sm text-gray-700">
                <p className={
                  detail.capacity.level === 'red'
                    ? 'text-red-700'
                    : detail.capacity.level === 'yellow'
                      ? 'text-amber-700'
                      : 'text-gray-600'
                }>
                  {detail.capacity.message}
                </p>
                <ul className="list-disc pl-5 text-xs text-gray-600 space-y-1">
                  <li>Tested batch ceiling (one send-batch-email call): <strong>{detail.capacity.ceiling}</strong> parallel sends</li>
                  <li>Tested reminder ceiling (one cron run): <strong>{detail.capacity.reminder_sequential_per_run}</strong> sequential sends</li>
                  <li>SES account daily quota: <strong>{detail.capacity.ses_daily_quota.toLocaleString()}</strong> emails/day</li>
                  <li>Last verified: <strong>{detail.capacity.last_verified}</strong></li>
                </ul>
                <p className="text-xs text-gray-500 mt-2">
                  These are tested limits, not theoretical. When the AWS auth path, Vercel plan, or Supabase compute changes,
                  re-run <code className="font-mono">scripts/canary.ts</code> end-to-end and update
                  <code className="font-mono"> src/lib/email/capacity-limits.ts</code> + <code className="font-mono">docs/EMAIL_OBSERVABILITY.md</code>.
                </p>
              </div>
            )}
          </div>

          {/* Recent successful deliveries — light footer */}
          {detail.recent_deliveries.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Recent successful deliveries</h3>
              <ul className="text-xs text-gray-600 space-y-1">
                {detail.recent_deliveries.map((r, i) => (
                  <li key={i} className="flex justify-between gap-2">
                    {onTraceRecipient ? (
                      <button
                        onClick={() => onTraceRecipient(r.recipient_email)}
                        className="font-mono truncate text-indigo-600 hover:text-indigo-800 underline decoration-dotted text-left"
                        title="View this recipient's timeline"
                      >
                        {r.recipient_email}
                      </button>
                    ) : (
                      <span className="font-mono truncate">{r.recipient_email}</span>
                    )}
                    <span className="text-gray-500">{r.delivered_at ? fmtDate(r.delivered_at) : '—'}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function StatCard({ label, value, subtle, variant }: { label: string; value: number; subtle?: string; variant?: 'warn' | 'danger' }) {
  const tint =
    variant === 'danger'
      ? 'border-red-200 bg-red-50'
      : variant === 'warn'
        ? 'border-amber-200 bg-amber-50'
        : 'border-gray-200 bg-white'
  return (
    <div className={`border rounded-lg p-3 ${tint}`}>
      <p className="text-xs text-gray-600">{label}</p>
      <p className="text-2xl font-semibold text-gray-900">{value}</p>
      {subtle && <p className="text-xs text-gray-500 mt-0.5">{subtle}</p>}
    </div>
  )
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-xl font-semibold text-gray-900">{value}</p>
    </div>
  )
}
