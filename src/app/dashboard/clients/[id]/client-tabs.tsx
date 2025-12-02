'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import ClientUsers from './client-users'
import ClientGroups from './client-groups'

interface ClientTabsProps {
  clientId: string
  activeTab: string
  client: {
    id: string
    name: string
    address?: string | null
    logo?: string | null
    background?: string | null
    primary_color?: string | null
    accent_color?: string | null
    require_profile: boolean
    require_research: boolean
    whitelabel: boolean
    created_at: string
    updated_at: string
  }
}

export default function ClientTabs({ clientId, activeTab: initialTab, client }: ClientTabsProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState(initialTab)

  useEffect(() => {
    setActiveTab(initialTab)
  }, [initialTab])

  const tabs = [
    { id: 'details', label: 'Details' },
    { id: 'users', label: 'Users' },
    { id: 'groups', label: 'Groups' },
  ]

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId)
    router.push(`/dashboard/clients/${clientId}?tab=${tabId}`, { scroll: false })
  }

  return (
    <div>
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'details' && (
          <div className="space-y-6">
            {/* Client Information */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                  <CardDescription>Client organization details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Name</label>
                    <p className="text-lg text-gray-900">{client.name}</p>
                  </div>
                  {client.address && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Address</label>
                      <p className="text-gray-900">{client.address}</p>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium text-gray-500">Created</label>
                    <p className="text-gray-900">{new Date(client.created_at).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Last Updated</label>
                    <p className="text-gray-900">{new Date(client.updated_at).toLocaleDateString()}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Branding */}
              <Card>
                <CardHeader>
                  <CardTitle>Branding</CardTitle>
                  <CardDescription>Visual identity and colors</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {client.logo && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Logo</label>
                      <div className="mt-2">
                        <Image
                          src={client.logo}
                          alt={`${client.name} logo`}
                          width={64}
                          height={64}
                          className="h-16 w-auto rounded"
                        />
                      </div>
                    </div>
                  )}
                  {client.background && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Background Image</label>
                      <div className="mt-2">
                        <Image
                          src={client.background}
                          alt={`${client.name} background`}
                          width={64}
                          height={64}
                          className="h-16 w-auto rounded"
                        />
                      </div>
                    </div>
                  )}
                  {client.primary_color && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Primary Color</label>
                      <div className="flex items-center space-x-2 mt-1">
                        <div
                          className="w-6 h-6 rounded border"
                          style={{ backgroundColor: client.primary_color }}
                        ></div>
                        <span className="text-gray-900">{client.primary_color}</span>
                      </div>
                    </div>
                  )}
                  {client.accent_color && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Accent Color</label>
                      <div className="flex items-center space-x-2 mt-1">
                        <div
                          className="w-6 h-6 rounded border"
                          style={{ backgroundColor: client.accent_color }}
                        ></div>
                        <span className="text-gray-900">{client.accent_color}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Client Settings</CardTitle>
                <CardDescription>Configuration and requirements</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Require Profile</label>
                    <p className="text-gray-900 mt-1">
                      {client.require_profile ? 'Yes' : 'No'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Users must complete their profile on first login
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Show Research Questions</label>
                    <p className="text-gray-900 mt-1">
                      {client.require_research ? 'Yes' : 'No'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Display optional research questions to users
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Whitelabel</label>
                    <p className="text-gray-900 mt-1">
                      {client.whitelabel ? 'Yes' : 'No'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Assessments are white-labeled with client branding
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'users' && <ClientUsers clientId={clientId} />}
        {activeTab === 'groups' && <ClientGroups clientId={clientId} />}
      </div>
    </div>
  )
}

