'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

const EMAIL_TYPES = ['assignment', 'reminder', 'invite', 'password_reset', 'magic_link'] as const
const COLUMN_IDS = ['sent_at', 'email_type', 'recipient_email', 'subject', 'status', 'related_display', 'provider_message_id'] as const

type ColumnId = (typeof COLUMN_IDS)[number]

interface EmailLogRow {
  id: string
  email_type: string
  recipient_email: string
  subject: string
  provider_message_id: string | null
  sent_at: string
  related_entity_type: string | null
  related_entity_id: string | null
  status: string
  created_at: string
  related_display: string | null
}

interface DashboardResponse {
  logs: EmailLogRow[]
  total: number
  page: number
  pageSize: number
  aggregate: { sent: number; bounces: number; complaints: number } | null
}

const COLUMN_LABELS: Record<ColumnId, string> = {
  sent_at: 'Sent at',
  email_type: 'Type',
  recipient_email: 'Recipient',
  subject: 'Subject',
  status: 'Status',
  related_display: 'Related',
  provider_message_id: 'Message ID',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

function copyToClipboard(text: string) {
  void navigator.clipboard.writeText(text)
}

export default function EmailDashboardClient() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [emailType, setEmailType] = useState('')
  const [recipient, setRecipient] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(0)
  const [visibleColumns, setVisibleColumns] = useState<ColumnId[]>([...COLUMN_IDS])
  const [data, setData] = useState<DashboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const pageSize = 50

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (from) params.set('from', from)
      if (to) params.set('to', to)
      if (emailType) params.set('emailType', emailType)
      if (recipient) params.set('recipient', recipient)
      if (status) params.set('status', status)
      params.set('page', String(page))
      params.set('pageSize', String(pageSize))

      const res = await fetch(`/api/admin/email-dashboard?${params.toString()}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `HTTP ${res.status}`)
      }
      const json: DashboardResponse = await res.json()
      setData(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [from, to, emailType, recipient, status, page])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0
  const canPrev = page > 0
  const canNext = page < totalPages - 1

  return (
    <div className="space-y-6">
      {/* Aggregate widget */}
      {data?.aggregate != null && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-medium text-gray-700">SES delivery attempts (last 14 days)</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{data.aggregate.sent.toLocaleString()}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-medium text-gray-700">SES bounces (last 14 days)</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{data.aggregate.bounces.toLocaleString()}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-medium text-gray-700">SES complaints (last 14 days)</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{data.aggregate.complaints.toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <div>
            <label className="block text-xs font-medium text-gray-700">From date</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">To date</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">Type</label>
            <select
              value={emailType}
              onChange={(e) => setEmailType(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-900"
            >
              <option value="">All</option>
              {EMAIL_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">Recipient (search)</label>
            <input
              type="text"
              placeholder="Email..."
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-900"
            >
              <option value="">All</option>
              <option value="sent">Sent</option>
              <option value="delivered">Delivered</option>
              <option value="bounced">Bounced</option>
              <option value="complained">Complained</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => { setPage(0); fetchData(); }}
              className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Apply
            </button>
          </div>
        </div>
      </div>

      {/* Column visibility */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium text-gray-700">Columns:</span>
        {COLUMN_IDS.map((col) => {
          const on = visibleColumns.includes(col)
          return (
            <label key={col} className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={on}
                onChange={() =>
                  setVisibleColumns((prev) =>
                    on ? prev.filter((c) => c !== col) : [...prev, col].sort((a, b) => COLUMN_IDS.indexOf(a) - COLUMN_IDS.indexOf(b))
                  )
                }
              />
              {COLUMN_LABELS[col]}
            </label>
          )
        })}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
        {error && (
          <div className="border-b border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {loading ? (
          <div className="px-4 py-8 text-center text-gray-700">Loading…</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {visibleColumns.map((col) => (
                      <th
                        key={col}
                        className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-700 sm:px-4"
                      >
                        {COLUMN_LABELS[col]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {data?.logs.length === 0 ? (
                    <tr>
                      <td colSpan={visibleColumns.length} className="px-4 py-8 text-center text-gray-700">
                        No email logs in this range.
                      </td>
                    </tr>
                  ) : (
                    data?.logs.map((row) => (
                      <tr key={row.id} className="hover:bg-gray-50">
                        {visibleColumns.includes('sent_at') && (
                          <td className="whitespace-nowrap px-3 py-2 text-sm text-gray-900 sm:px-4">
                            {formatDate(row.sent_at)}
                          </td>
                        )}
                        {visibleColumns.includes('email_type') && (
                          <td className="whitespace-nowrap px-3 py-2 text-sm text-gray-900 sm:px-4">
                            {row.email_type}
                          </td>
                        )}
                        {visibleColumns.includes('recipient_email') && (
                          <td className="whitespace-nowrap px-3 py-2 text-sm text-gray-900 sm:px-4">
                            {row.recipient_email}
                          </td>
                        )}
                        {visibleColumns.includes('subject') && (
                          <td className="max-w-[200px] truncate px-3 py-2 text-sm text-gray-900 sm:px-4" title={row.subject}>
                            {row.subject}
                          </td>
                        )}
                        {visibleColumns.includes('status') && (
                          <td className="whitespace-nowrap px-3 py-2 text-sm text-gray-900 sm:px-4">
                            {row.status}
                          </td>
                        )}
                        {visibleColumns.includes('related_display') && (
                          <td className="px-3 py-2 text-sm text-gray-900 sm:px-4">
                            {row.related_entity_type === 'assignment' && row.related_entity_id ? (
                              <Link
                                href={`/dashboard/assignments/${row.related_entity_id}`}
                                className="text-indigo-600 hover:underline"
                              >
                                {row.related_display || row.related_entity_id}
                              </Link>
                            ) : row.related_display ? (
                              row.related_display
                            ) : (
                              '—'
                            )}
                          </td>
                        )}
                        {visibleColumns.includes('provider_message_id') && (
                          <td className="px-3 py-2 text-sm text-gray-900 sm:px-4">
                            {row.provider_message_id ? (
                              <button
                                type="button"
                                onClick={() => copyToClipboard(row.provider_message_id!)}
                                className="max-w-[140px] truncate font-mono text-xs text-indigo-600 hover:underline"
                                title="Click to copy"
                              >
                                {row.provider_message_id}
                              </button>
                            ) : (
                              '—'
                            )}
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {data && data.total > pageSize && (
              <div className="flex items-center justify-between border-t border-gray-200 px-4 py-2 text-gray-900">
                <p className="text-sm text-gray-700">
                  Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, data.total)} of {data.total}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={!canPrev}
                    onClick={() => setPage((p) => p - 1)}
                    className="rounded border border-gray-300 px-2 py-1 text-sm text-gray-900 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={!canNext}
                    onClick={() => setPage((p) => p + 1)}
                    className="rounded border border-gray-300 px-2 py-1 text-sm text-gray-900 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
