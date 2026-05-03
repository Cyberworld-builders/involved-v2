'use client'

import { useState, useCallback, useEffect, useRef } from 'react'

type EventType =
  | 'sent' | 'delivered' | 'bounced' | 'complained' | 'failed'
  | 'login' | 'logout' | 'magic_link_or_recovery' | 'signup' | 'auth_other'
  | 'started_assignment' | 'completed_assignment' | 'last_answer'

interface TimelineEvent {
  id: string
  event_type: EventType
  source: 'email' | 'auth' | 'assignment' | 'answers'
  email_type?: string
  subject?: string
  assignment_title?: string
  timestamp: string
  detail?: string
  related_entity_type?: string | null
  related_entity_id?: string | null
  provider_message_id?: string | null
}

interface TraceResponse {
  recipient: string
  profile: { id: string; name: string | null; client_name: string | null } | null
  events: TimelineEvent[]
  totals: {
    sends: number; deliveries: number; bounces: number; complaints: number; failures: number
    logins: number; magic_links_or_recoveries: number; signups: number
    started_assignments: number; completed_assignments: number; total_answers: number
  }
  earliest: string | null
  latest: string | null
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'medium' })
}

function eventStyle(t: EventType) {
  switch (t) {
    case 'sent':                  return { dot: 'bg-gray-400',   label: 'Email sent',         text: 'text-gray-700' }
    case 'delivered':             return { dot: 'bg-green-500',  label: 'Delivered',          text: 'text-green-700' }
    case 'bounced':               return { dot: 'bg-amber-500',  label: 'Bounced',            text: 'text-amber-700' }
    case 'complained':            return { dot: 'bg-red-500',    label: 'Complained',         text: 'text-red-700' }
    case 'failed':                return { dot: 'bg-red-300',    label: 'Failed at send',     text: 'text-red-700' }
    case 'login':                 return { dot: 'bg-blue-500',   label: 'Logged in',          text: 'text-blue-700' }
    case 'logout':                return { dot: 'bg-blue-300',   label: 'Logged out',         text: 'text-blue-600' }
    case 'magic_link_or_recovery': return { dot: 'bg-blue-400',  label: 'Magic link / recovery requested', text: 'text-blue-700' }
    case 'signup':                return { dot: 'bg-blue-600',   label: 'Account created',    text: 'text-blue-700' }
    case 'auth_other':            return { dot: 'bg-blue-200',   label: 'Auth event',         text: 'text-blue-600' }
    case 'started_assignment':    return { dot: 'bg-indigo-500', label: 'Started assessment', text: 'text-indigo-700' }
    case 'completed_assignment':  return { dot: 'bg-indigo-700', label: 'Completed assessment', text: 'text-indigo-800' }
    case 'last_answer':           return { dot: 'bg-indigo-300', label: 'Last activity',      text: 'text-indigo-600' }
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
          Unified timeline: emails sent + SES feedback, login/recovery events, and assessment activity (started, answered, completed).
          Useful for &quot;they say they didn&apos;t get the email / couldn&apos;t log in / didn&apos;t take the assessment&quot; questions.
        </p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-800 text-sm p-3 rounded">{error}</div>}

      {trace && trace.events.length === 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded p-6 text-sm text-gray-600 text-center">
          No activity found for <span className="font-mono">{trace.recipient}</span>.
        </div>
      )}

      {trace && trace.events.length > 0 && (
        <>
          {/* Summary header */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
            <div>
              <p className="text-xs text-gray-500">Recipient</p>
              <p className="font-mono text-sm text-gray-900">{trace.recipient}</p>
              {trace.profile && (
                <p className="text-xs text-gray-500 mt-1">
                  {trace.profile.name ? `${trace.profile.name} · ` : ''}
                  {trace.profile.client_name ?? 'No client'}
                </p>
              )}
              {trace.earliest && trace.latest && (
                <p className="text-xs text-gray-500 mt-1">
                  {fmtDate(trace.earliest)} → {fmtDate(trace.latest)}
                </p>
              )}
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-700 mb-1">Email</p>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <Mini label="Sent" value={trace.totals.sends} />
                <Mini label="Delivered" value={trace.totals.deliveries} positive />
                <Mini label="Bounced" value={trace.totals.bounces} warn={trace.totals.bounces > 0} />
                <Mini label="Complaints" value={trace.totals.complaints} danger={trace.totals.complaints > 0} />
                <Mini label="Failures" value={trace.totals.failures} warn={trace.totals.failures > 0} />
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-700 mb-1">Auth</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <Mini label="Logins" value={trace.totals.logins} positive={trace.totals.logins > 0} />
                <Mini label="Magic link / recovery" value={trace.totals.magic_links_or_recoveries} />
                <Mini label="Signups" value={trace.totals.signups} />
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-700 mb-1">Assessment</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <Mini label="Started" value={trace.totals.started_assignments} />
                <Mini label="Completed" value={trace.totals.completed_assignments} positive={trace.totals.completed_assignments > 0} />
                <Mini label="Total answers" value={trace.totals.total_answers} />
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Timeline (most recent first)</h3>
            <ol className="space-y-3">
              {trace.events.map((ev) => {
                const s = eventStyle(ev.event_type)
                const sourceTag = `${ev.source}`
                return (
                  <li key={`${ev.source}-${ev.id}-${ev.event_type}-${ev.timestamp}`} className="flex gap-3">
                    <div className={`mt-1 h-2.5 w-2.5 rounded-full flex-shrink-0 ${s.dot}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className={`text-sm font-medium ${s.text}`}>
                          {s.label}
                          {ev.email_type && <span className="text-gray-500 font-normal"> — {ev.email_type}</span>}
                          {ev.assignment_title && <span className="text-gray-500 font-normal"> — {ev.assignment_title}</span>}
                        </p>
                        <p className="text-xs text-gray-500 whitespace-nowrap">
                          {fmtDate(ev.timestamp)}
                          <span className="ml-2 text-gray-400 uppercase tracking-wider text-[10px]">{sourceTag}</span>
                        </p>
                      </div>
                      {ev.subject && <p className="text-xs text-gray-600 truncate">{ev.subject}</p>}
                      {ev.detail && <p className="text-xs text-gray-500 mt-0.5">{ev.detail}</p>}
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
              Sources: <span className="font-mono">email_logs</span> + SNS feedback,
              {' '}<span className="font-mono">auth.audit_log_entries</span> via SECURITY DEFINER RPC,
              {' '}<span className="font-mono">assignments</span> (started_at / completed_at), and
              {' '}<span className="font-mono">answers</span> rollups (last activity per incomplete assignment).
              Token refresh events are filtered out to keep the timeline readable.
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
