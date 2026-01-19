'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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

export default function CreateClientPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()

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
      const response = await fetch('/api/clients', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create client')
      }

      setMessage('Client created successfully!')
      setTimeout(() => {
        router.push('/dashboard/clients')
      }, 2000)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create Client</h1>
          <p className="text-gray-600">Create a new client organization.</p>
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
          onSubmit={handleSubmit}
          isLoading={isLoading}
          submitText="Create Client"
        />
      </div>
  )
}
