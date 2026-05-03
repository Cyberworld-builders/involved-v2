'use client'

import { useState, useEffect } from 'react'
import EmailDashboardClient from './email-dashboard-client'
import CampaignDashboardTab from './campaign-dashboard-tab'
import UserTraceTab from './user-trace-tab'

type TabId = 'audit-log' | 'campaign' | 'user-trace'

const TABS: Array<{ id: TabId; label: string; description: string }> = [
  {
    id: 'audit-log',
    label: 'Audit Log',
    description: 'Searchable log of every outbound email — for support triage and provider-side investigation.',
  },
  {
    id: 'campaign',
    label: 'Campaign Dashboard',
    description: 'Survey-scoped health, deliverability, and capacity. Pick a survey + date window.',
  },
  {
    id: 'user-trace',
    label: 'User Trace',
    description: 'Timeline of email activity for a single recipient — for "did they actually get it?" questions.',
  },
]

function getInitialTab(): TabId {
  if (typeof window === 'undefined') return 'audit-log'
  const t = new URLSearchParams(window.location.search).get('tab')
  if (t === 'campaign' || t === 'user-trace' || t === 'audit-log') return t
  return 'audit-log'
}

export default function EmailTabsClient() {
  const [activeTab, setActiveTab] = useState<TabId>('audit-log')

  // Hydrate from URL after mount to keep SSR happy.
  useEffect(() => {
    setActiveTab(getInitialTab())
  }, [])

  // Reflect tab choice in the URL so the page is shareable + survives refresh.
  const onTabChange = (id: TabId) => {
    setActiveTab(id)
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.set('tab', id)
      window.history.replaceState({}, '', url.toString())
    }
  }

  const active = TABS.find((t) => t.id === activeTab) ?? TABS[0]

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6" aria-label="Email management tabs">
          {TABS.map((t) => {
            const isActive = t.id === activeTab
            return (
              <button
                key={t.id}
                onClick={() => onTabChange(t.id)}
                className={
                  isActive
                    ? 'border-b-2 border-indigo-600 px-1 py-3 text-sm font-medium text-indigo-700'
                    : 'border-b-2 border-transparent px-1 py-3 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }
                aria-current={isActive ? 'page' : undefined}
              >
                {t.label}
              </button>
            )
          })}
        </nav>
      </div>

      <p className="text-sm text-gray-600">{active.description}</p>

      {activeTab === 'audit-log' && <EmailDashboardClient />}
      {activeTab === 'campaign' && <CampaignDashboardTab />}
      {activeTab === 'user-trace' && <UserTraceTab />}
    </div>
  )
}
