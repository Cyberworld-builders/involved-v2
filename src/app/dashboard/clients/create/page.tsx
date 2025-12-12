'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import DashboardLayout from '@/components/layout/dashboard-layout'
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
  const supabase = createClient()

  const handleSubmit = async (data: ClientFormData) => {
    setIsLoading(true)
    setMessage('')

    try {
      // Check if Supabase is configured
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (!supabaseUrl || !supabaseKey) {
        // Supabase not configured - show demo mode
        console.log('Demo mode - Client data:', data)
        setMessage('Demo mode: Client data logged to console. Set up Supabase to save to database.')
        
        // Simulate success after a delay
        setTimeout(() => {
          setMessage('Demo mode: Client would be created successfully!')
          setTimeout(() => {
            router.push('/dashboard/clients')
          }, 2000)
        }, 1000)
        return
      }

      // First, create client record without images to get the client ID
      const { data: newClient, error: createError } = await supabase
        .from('clients')
        .insert({
          name: data.name,
          address: data.address || null,
          logo: null,
          background: null,
          primary_color: data.primary_color,
          accent_color: data.accent_color,
          require_profile: data.require_profile,
          require_research: data.require_research,
          whitelabel: data.whitelabel,
        })
        .select()
        .single()

      if (createError || !newClient) {
        throw new Error(`Failed to create client: ${createError?.message || 'Unknown error'}`)
      }

      // Upload images if provided
      let logoUrl = null
      let backgroundUrl = null

      if (data.logo) {
        const logoFormData = new FormData()
        logoFormData.append('file', data.logo)
        logoFormData.append('fileType', 'logo')
        logoFormData.append('clientId', newClient.id)

        const logoResponse = await fetch('/api/clients/upload', {
          method: 'POST',
          body: logoFormData,
        })

        if (!logoResponse.ok) {
          const errorData = await logoResponse.json()
          throw new Error(`Failed to upload logo: ${errorData.error}`)
        }

        const logoData = await logoResponse.json()
        logoUrl = logoData.url
      }

      if (data.background) {
        const backgroundFormData = new FormData()
        backgroundFormData.append('file', data.background)
        backgroundFormData.append('fileType', 'background')
        backgroundFormData.append('clientId', newClient.id)

        const backgroundResponse = await fetch('/api/clients/upload', {
          method: 'POST',
          body: backgroundFormData,
        })

        if (!backgroundResponse.ok) {
          const errorData = await backgroundResponse.json()
          throw new Error(`Failed to upload background: ${errorData.error}`)
        }

        const backgroundData = await backgroundResponse.json()
        backgroundUrl = backgroundData.url
      }

      // Update client with image URLs if any were uploaded
      if (logoUrl || backgroundUrl) {
        const updateData: { logo?: string | null; background?: string | null } = {}
        if (logoUrl) updateData.logo = logoUrl
        if (backgroundUrl) updateData.background = backgroundUrl

        const { error: updateError } = await supabase
          .from('clients')
          .update(updateData)
          .eq('id', newClient.id)

        if (updateError) {
          throw new Error(`Failed to update client with image URLs: ${updateError.message}`)
        }
      }

      setMessage('Client created successfully!')
      router.push('/dashboard/clients')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <DashboardLayout>
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
    </DashboardLayout>
  )
}
