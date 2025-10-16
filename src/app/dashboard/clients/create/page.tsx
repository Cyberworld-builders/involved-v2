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

      // TODO: Upload images to Supabase storage if provided
      let logoUrl = null
      let backgroundUrl = null

      if (data.logo) {
        // Upload logo
        const logoExt = data.logo.name.split('.').pop()
        const logoFileName = `logo-${Date.now()}.${logoExt}`
        const { data: logoData, error: logoError } = await supabase.storage
          .from('client-assets')
          .upload(logoFileName, data.logo)

        if (logoError) {
          throw new Error(`Failed to upload logo: ${logoError.message}`)
        }

        const { data: logoUrlData } = supabase.storage
          .from('client-assets')
          .getPublicUrl(logoFileName)
        logoUrl = logoUrlData.publicUrl
      }

      if (data.background) {
        // Upload background
        const backgroundExt = data.background.name.split('.').pop()
        const backgroundFileName = `background-${Date.now()}.${backgroundExt}`
        const { data: backgroundData, error: backgroundError } = await supabase.storage
          .from('client-assets')
          .upload(backgroundFileName, data.background)

        if (backgroundError) {
          throw new Error(`Failed to upload background: ${backgroundError.message}`)
        }

        const { data: backgroundUrlData } = supabase.storage
          .from('client-assets')
          .getPublicUrl(backgroundFileName)
        backgroundUrl = backgroundUrlData.publicUrl
      }

      // Create client record
      const { data: client, error } = await supabase
        .from('clients')
        .insert({
          name: data.name,
          address: data.address || null,
          logo: logoUrl,
          background: backgroundUrl,
          primary_color: data.primary_color,
          accent_color: data.accent_color,
          require_profile: data.require_profile,
          require_research: data.require_research,
          whitelabel: data.whitelabel,
        })
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create client: ${error.message}`)
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
