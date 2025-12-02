'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import DashboardLayout from '@/components/layout/dashboard-layout'
import UserForm from '@/components/forms/user-form'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface UserFormData {
  username: string
  name: string
  email: string
  client_id: string
  industry_id: string
}

interface EditUserPageProps {
  params: Promise<{
    id: string
  }>
}

export default function EditUserPage({ params }: EditUserPageProps) {
  const { id } = use(params)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [isLoadingAuth, setIsLoadingAuth] = useState(true)
  const [message, setMessage] = useState('')
  const [initialData, setInitialData] = useState<Partial<UserFormData> | null>(null)
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([])
  const [industries, setIndustries] = useState<Array<{ id: string; name: string }>>([])
  const router = useRouter()
  const supabase = createClient()

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
    const loadUser = async () => {
      try {
        // Load user profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', id)
          .single()

        if (profileError || !profile) {
          throw new Error(`Failed to load user: ${profileError?.message || 'User not found'}`)
        }

        // Fetch clients and industries in parallel
        const [clientsResult, industriesResult] = await Promise.all([
          supabase.from('clients').select('id, name').order('name'),
          supabase.from('industries').select('id, name').order('name')
        ])

        if (clientsResult.error) throw clientsResult.error
        if (industriesResult.error) throw industriesResult.error

        setClients(clientsResult.data || [])
        setIndustries(industriesResult.data || [])

        // Convert to form data format
        setInitialData({
          username: profile.username,
          name: profile.name,
          email: profile.email,
          client_id: profile.client_id || '',
          industry_id: profile.industry_id || '',
        })
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Failed to load user')
      } finally {
        setIsLoadingData(false)
      }
    }

    if (!isLoadingAuth) {
      loadUser()
    }
  }, [id, supabase, isLoadingAuth])

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

      // Update user profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          username: data.username,
          name: data.name,
          email: data.email,
          client_id: data.client_id || null,
          industry_id: data.industry_id || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (profileError) {
        throw new Error(`Failed to update user profile: ${profileError.message}`)
      }

      // Note: Auth user email updates require server-side admin access
      // For now, we only update the profile email. To update auth email,
      // create an API route that uses the admin client.
      if (initialData?.email !== data.email) {
        console.warn('Email change detected. Auth email update requires server-side API route.')
      }

      setMessage('User updated successfully!')
      setTimeout(() => {
        router.push('/dashboard/users')
      }, 1500)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoadingAuth || isLoadingData) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">
            {isLoadingAuth ? 'Checking authentication...' : 'Loading user...'}
          </p>
        </div>
      </DashboardLayout>
    )
  }

  if (!initialData) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">User Not Found</h1>
          <p className="text-gray-600 mb-4">The user you&apos;re looking for doesn&apos;t exist.</p>
          <Link href="/dashboard/users">
            <Button>Back to Users</Button>
          </Link>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit User</h1>
            <p className="text-gray-600">Update user details and settings.</p>
          </div>
          <Link href="/dashboard/users">
            <Button variant="outline">Back to Users</Button>
          </Link>
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
          initialData={initialData}
          onSubmit={handleSubmit}
          isLoading={isLoading}
          submitText="Update User"
          clients={clients}
          industries={industries}
        />
      </div>
    </DashboardLayout>
  )
}

