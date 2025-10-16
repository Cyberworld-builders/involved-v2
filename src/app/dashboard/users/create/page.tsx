'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import DashboardLayout from '@/components/layout/dashboard-layout'
import UserForm from '@/components/forms/user-form'

interface UserFormData {
  username: string
  name: string
  email: string
  password: string
  client_id: string
  job_title: string
  job_family: string
  industry_id: string
  language_id: string
}

export default function CreateUserPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [message, setMessage] = useState('')
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([])
  const [industries, setIndustries] = useState<Array<{ id: string; name: string }>>([])
  const [languages, setLanguages] = useState<Array<{ id: string; name: string }>>([])
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  
  const clientId = searchParams.get('client_id')

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch clients, industries, and languages in parallel
        const [clientsResult, industriesResult, languagesResult] = await Promise.all([
          supabase.from('clients').select('id, name').order('name'),
          supabase.from('industries').select('id, name').order('name'),
          supabase.from('languages').select('id, name').order('name')
        ])

        if (clientsResult.error) throw clientsResult.error
        if (industriesResult.error) throw industriesResult.error
        if (languagesResult.error) throw languagesResult.error

        setClients(clientsResult.data || [])
        setIndustries(industriesResult.data || [])
        setLanguages(languagesResult.data || [])
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Failed to load form data')
      } finally {
        setIsLoadingData(false)
      }
    }

    fetchData()
  }, [supabase])

  const handleSubmit = async (data: UserFormData) => {
    setIsLoading(true)
    setMessage('')

    try {
      // Check if Supabase is configured
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (!supabaseUrl || !supabaseKey) {
        setMessage('Supabase not configured. Please set up your environment variables.')
        return
      }

      // Create user record
      const { error } = await supabase
        .from('users')
        .insert({
          username: data.username,
          name: data.name,
          email: data.email,
          password: data.password, // Note: In production, this should be hashed
          client_id: data.client_id || null,
          job_title: data.job_title || null,
          job_family: data.job_family || null,
          industry_id: data.industry_id || null,
          language_id: data.language_id || null,
          completed_profile: false,
        })

      if (error) {
        throw new Error(`Failed to create user: ${error.message}`)
      }

      setMessage('User created successfully!')
      setTimeout(() => {
        router.push('/dashboard/users')
      }, 2000)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoadingData) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading form data...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create User</h1>
          <p className="text-gray-600">Create a new user account.</p>
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

        {/* User Form */}
        <UserForm
          initialData={clientId ? { client_id: clientId } : undefined}
          onSubmit={handleSubmit}
          isLoading={isLoading}
          submitText="Create User"
          clients={clients}
          industries={industries}
          languages={languages}
        />
      </div>
    </DashboardLayout>
  )
}
