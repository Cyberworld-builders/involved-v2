'use client'

import { useState, useCallback, useEffect, useRef } from 'react'

interface TimelineEvent {
  id: string
  event_type: 'sent' | 'delivered' | 'bounced' | 'complained' | 'failed'
  email_type: string
  subject: string
  timestamp: string
  detail?: string
  related_entity_type: string | null
  related_entity_id: string | null
  provider_message_id: string | null
}

interface TraceResponse {
  recipient: string
  events: TimelineEvent[]
  totals: { sends: number; deliveries: number; bounces: number; complaints: number; failures: number }
  earliest: string | null
  latest: string | null
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'medium' })
}

function eventStyle(t: TimelineEvent['event_type']) {
  switch (t) {
    case 'sent': return { dot: 'bg-gray-400', label: 'Sent', text: 'text-gray-700' }
    case 'delivered': return { dot: 'bg-green-500', label: 'Delivered', text: 'text-green-700' }
    case 'bounced': return { dot: 'bg-amber-500', label: 'Bounced', text: 'text-amber-700' }
    case 'complained': return { dot: 'bg-red-500', label: 'Complained', text: 'text-red-700' }
    case 'failed': return { dot: 'bg-red-300', label: 'Failed at send', text: 'text-red-700' }
  }
}

export default function UserTraceTab({ initialRecipient = '' }: { initialRecipient?: string }) {
  const [recipient, setRecipient] = useState(initialRecipient)
  const [trace, setTrace] = useState<TraceResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const lastAutoSearched = useRef<string>('')

  const performSearch = useCallback(async (r: string) => {
    if (!r) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/email-trace?recipient=${encodeURIComponent(r)}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `HTTP ${res.status}`)
      }
      const json: TraceResponse = await res.json()
      setTrace(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
      setTrace(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const search = useCallback(() => {
    void performSearch(recipient.trim())
  }, [recipient, performSearch])

  // Auto-fire when the parent hands us a recipient (e.g. user clicked a row in
  // the campaign tab). Tracks the last value we auto-searched so re-mounts
  // with the same value don't loop, and so changing the input + clicking
  // Search still works normally.
  useEffect(() => {
    if (initialRecipient && initialRecipient !== lastAutoSearched.current) {
      setRecipient(initialRecipient)
      lastAutoSearched.current = initialRecipient
      void performSearch(initialRecipient)
    }
  }, [initialRecipient, performSearch])

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') search()
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <label className="block text-xs font-medium text-gray-700">Recipient email</label>
        <div className="mt-1 flex gap-2">
          <input
            type="email"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            onKeyDown={onKey}
            placeholder="user@example.com"
            className="flex-1 rounded border-gray-300 text-sm"
            autoFocus
          />
          <button
            onClick={() => void search()}
            disabled={loading || !recipient.trim()}
            className="px-3 py-2 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? 'Searching…' : 'Search'}
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Returns every email_logs row for this recipient with its status and any SNS feedback (bounce/complaint/delivery).
          Useful for &quot;they say they didn&apos;t get it&quot; support questions.
        </p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-800 text-sm p-3 rounded">{error}</div>}

      {trace && trace.events.length === 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded p-6 text-sm text-gray-600 text-center">
          No email activity found for <span className="font-mono">{trace.recipient}</span>.
        </div>
      )}

      {trace && trace.events.length > 0 && (
        <>
          {/* Summary header */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs text-gray-500">Recipient</p>
                <p className="font-mono text-sm text-gray-900">{trace.recipient}</p>
                {trace.earliest && trace.latest && (
                  <p className="text-xs text-gray-500 mt-1">
                    {fmtDate(trace.earliest)} → {fmtDate(trace.latest)}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-5 gap-3 text-center">
                <Mini label="Sent" value={trace.totals.sends} />
                <Mini label="Delivered" value={trace.totals.deliveries} positive />
                <Mini label="Bounced" value={trace.totals.bounces} warn={trace.totals.bounces > 0} />
                <Mini label="Complaints" value={trace.totals.complaints} danger={trace.totals.complaints > 0} />
                <Mini label="Failures" value={trace.totals.failures} warn={trace.totals.failures > 0} />
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Timeline (most recent first)</h3>
            <ol className="space-y-3">
              {trace.events.map((ev) => {
                const s = eventStyle(ev.event_type)
                return (
                  <li key={ev.id + ev.event_type + ev.timestamp} className="flex gap-3">
                    <div className={`mt-1 h-2.5 w-2.5 rounded-full flex-shrink-0 ${s.dot}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className={`text-sm font-medium ${s.text}`}>
                          {s.label} <span className="text-gray-500 font-normal">— {ev.email_type}</span>
                        </p>
                        <p className="text-xs text-gray-500 whitespace-nowrap">{fmtDate(ev.timestamp)}</p>
                      </div>
                      <p className="text-xs text-gray-600 truncate">{ev.subject}</p>
                      {ev.detail && (
                        <p className="text-xs text-gray-500 mt-0.5">{ev.detail}</p>
                      )}
                      {ev.provider_message_id && (
                        <p className="text-xs text-gray-400 font-mono mt-0.5 truncate">
                          msg={ev.provider_message_id}
                        </p>
                      )}
                    </div>
                  </li>
                )
              })}
            </ol>
            <p className="mt-4 text-xs text-gray-500">
              Each row reflects an <span className="font-mono">email_logs</span> entry plus any SNS feedback events that updated it
              (delivered_at, feedback_received_at). Login/auth events from Supabase aren&apos;t included yet — the trace shows
              what we sent and how SES reported it.
            </p>
          </div>
        </>
      )}
    </div>
  )
}

function Mini({ label, value, positive, warn, danger }: { label: string; value: number; positive?: boolean; warn?: boolean; danger?: boolean }) {
  const cls = danger
    ? 'text-red-700'
    : warn
      ? 'text-amber-700'
      : positive
        ? 'text-green-700'
        : 'text-gray-900'
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-xl font-semibold ${cls}`}>{value}</p>
    </div>
  )
}
