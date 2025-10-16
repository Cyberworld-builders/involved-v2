'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { createUserProfile } from '@/lib/auth-helpers'
import DashboardLayout from '@/components/layout/dashboard-layout'
import UserForm from '@/components/forms/user-form'

interface UserFormData {
  username: string
  name: string
  email: string
  client_id: string
  industry_id: string
}

export default function CreateUserPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingAuth, setIsLoadingAuth] = useState(true)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [message, setMessage] = useState('')
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([])
  const [industries, setIndustries] = useState<Array<{ id: string; name: string }>>([])
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  
  const clientId = searchParams.get('client_id')

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      setIsLoadingAuth(false)
    }
    checkAuth()
  }, [supabase, router])

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch clients and industries in parallel
        const [clientsResult, industriesResult] = await Promise.all([
          supabase.from('clients').select('id, name').order('name'),
          supabase.from('industries').select('id, name').order('name')
        ])

        if (clientsResult.error) throw clientsResult.error
        if (industriesResult.error) throw industriesResult.error

        setClients(clientsResult.data || [])
        setIndustries(industriesResult.data || [])
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

      // Create auth user first
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: data.email,
        password: 'temp123', // Default password - user should change on first login
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          full_name: data.name,
        }
      })

      if (authError) {
        throw new Error(`Failed to create auth user: ${authError.message}`)
      }

      if (!authData.user) {
        throw new Error('Failed to create auth user')
      }

      // Create user profile in our custom users table
      await createUserProfile(authData.user, {
        username: data.username,
        client_id: data.client_id || undefined,
        industry_id: data.industry_id || undefined,
      })

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

  if (isLoadingAuth) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Checking authentication...</p>
          </div>
        </div>
      </DashboardLayout>
    )
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
        />
      </div>
    </DashboardLayout>
  )
}
