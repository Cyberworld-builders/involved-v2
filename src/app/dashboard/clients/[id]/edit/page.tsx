'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import ClientForm from '@/components/forms/client-form'

interface ClientFormData {
  name: string
  address: string
  logo: File | null
  background: File | null
  primary_color: string
  accent_color: string
  require_profile: boolean
  require_research: boolean
  whitelabel: boolean
}

export default function EditClientPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingClient, setIsLoadingClient] = useState(true)
  const [message, setMessage] = useState('')
  const [client, setClient] = useState<{
    id: string
    name: string
    address: string | null
    logo: string | null
    background: string | null
    primary_color: string | null
    accent_color: string | null
    require_profile: boolean
    require_research: boolean
    whitelabel: boolean
  } | null>(null)
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()

  const clientId = params.id as string

  useEffect(() => {
    const fetchClient = async () => {
      try {
        const { data: clientData, error } = await supabase
          .from('clients')
          .select('*')
          .eq('id', clientId)
          .single()

        if (error) {
          throw new Error(`Failed to fetch client: ${error.message}`)
        }

        setClient(clientData)
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Failed to load client')
      } finally {
        setIsLoadingClient(false)
      }
    }

    if (clientId) {
      fetchClient()
    }
  }, [clientId, supabase])

  const handleSubmit = async (data: ClientFormData) => {
    setIsLoading(true)
    setMessage('')

    try {
      // Prepare FormData for file upload
      const formData = new FormData()
      formData.append('name', data.name)
      formData.append('address', data.address || '')
      if (data.logo) {
        formData.append('logo', data.logo)
      }
      if (data.background) {
        formData.append('background', data.background)
      }
      formData.append('primary_color', data.primary_color)
      formData.append('accent_color', data.accent_color)
      formData.append('require_profile', data.require_profile.toString())
      formData.append('require_research', data.require_research.toString())
      formData.append('whitelabel', data.whitelabel.toString())

      // Send request to API
      const response = await fetch(`/api/clients/${clientId}`, {
        method: 'PATCH',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update client')
      }

      setMessage('Client updated successfully!')
      setTimeout(() => {
        router.push('/dashboard/clients')
      }, 2000)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoadingClient) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading client...</p>
        </div>
      </div>
    )
  }

  if (!client) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Client Not Found</h1>
        <p className="text-gray-600 mb-4">The client you&apos;re looking for doesn&apos;t exist.</p>
        <button
          onClick={() => router.push('/dashboard/clients')}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
        >
          Back to Clients
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{client.name}: Edit</h1>
          <p className="text-gray-600">Manage this client&apos;s general information and assessment settings.</p>
        </div>

        {/* Message */}
        {message && (
          <div className={`p-4 rounded-md ${
            message.includes('successfully') 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message}
          </div>
        )}

        {/* Client Form */}
        <ClientForm
          initialData={{
            name: client.name,
            address: client.address || '',
            primary_color: client.primary_color || '#2D2E30',
            accent_color: client.accent_color || '#FFBA00',
            require_profile: client.require_profile || false,
            require_research: client.require_research || false,
            whitelabel: client.whitelabel || false,
          }}
          onSubmit={handleSubmit}
          isLoading={isLoading}
          submitText="Save Changes"
        />
      </div>
  )
}
