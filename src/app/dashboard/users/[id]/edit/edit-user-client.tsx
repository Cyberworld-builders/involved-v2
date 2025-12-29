'use client'

import { useState, useEffect } from 'react'
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
  access_level?: string
}

interface EditUserClientProps {
  id: string
}

export default function EditUserClient({ id }: EditUserClientProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [isLoadingAuth, setIsLoadingAuth] = useState(true)
  const [message, setMessage] = useState('')
  const [initialData, setInitialData] = useState<Partial<UserFormData> | null>(null)
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([])
  const [industries, setIndustries] = useState<Array<{ id: string; name: string }>>([])
  const [currentUserAccessLevel, setCurrentUserAccessLevel] = useState<string | null>(null)
  const [currentUserClientId, setCurrentUserClientId] = useState<string | null>(null)
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

      // Load current user's profile role for RBAC-aware UI
      const { data: currentProfile, error: currentProfileError } = await supabase
        .from('profiles')
        .select('access_level, role, client_id')
        .eq('auth_user_id', user.id)
        .single()

      if (currentProfileError || !currentProfile) {
        // If we can't determine role, be conservative and hide role management UI.
        setCurrentUserAccessLevel(null)
        setCurrentUserClientId(null)
      } else {
        // Backwards-compatible fallback if access_level isn't set yet.
        const derived =
          currentProfile.access_level ||
          (currentProfile.role === 'admin'
            ? 'super_admin'
            : (currentProfile.role === 'manager' || currentProfile.role === 'client')
              ? 'client_admin'
              : 'member')
        setCurrentUserAccessLevel(derived)
        setCurrentUserClientId(currentProfile.client_id || null)
      }
      setIsLoadingAuth(false)
    }
    checkAuth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  useEffect(() => {
    const loadUser = async () => {
      try {
        // RBAC: only admins/managers can edit users.
        const isSuperAdmin = currentUserAccessLevel === 'super_admin'
        const isClientAdmin = currentUserAccessLevel === 'client_admin'

        if (!isSuperAdmin && !isClientAdmin) {
          router.push('/dashboard')
          return
        }
        if (isClientAdmin && !currentUserClientId) {
          router.push('/dashboard')
          return
        }

        // Load user profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', id)
          .single()

        if (profileError || !profile) {
          throw new Error(`Failed to load user: ${profileError?.message || 'User not found'}`)
        }

        // Client admins can only edit users under their own client.
        if (isClientAdmin && currentUserClientId && profile.client_id !== currentUserClientId) {
          router.push('/dashboard/users')
          return
        }

        // Fetch clients and industries in parallel
        const [clientsResult, industriesResult] = await Promise.all([
          supabase.from('clients').select('id, name').order('name'),
          supabase.from('industries').select('id, name').order('name')
        ])

        if (clientsResult.error) throw clientsResult.error
        if (industriesResult.error) throw industriesResult.error

        // Client admins should only see their own client in the selector.
        if (isClientAdmin && currentUserClientId) {
          setClients((clientsResult.data || []).filter(c => c.id === currentUserClientId))
        } else {
          setClients(clientsResult.data || [])
        }
        setIndustries(industriesResult.data || [])

        // Convert to form data format
        setInitialData({
          username: profile.username,
          name: profile.name,
          email: profile.email,
          client_id: profile.client_id || '',
          industry_id: profile.industry_id || '',
          access_level:
            profile.access_level ||
            (profile.role === 'admin'
              ? 'super_admin'
              : (profile.role === 'manager' || profile.role === 'client')
                ? 'client_admin'
                : 'member'),
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
  }, [id, isLoadingAuth, currentUserAccessLevel, currentUserClientId, router, supabase])

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

      const body: Record<string, unknown> = {
        // Username is auto-generated by the API from the name, so we don't send it
        // The API will regenerate it if the name changes
        name: data.name,
        email: data.email,
        client_id: data.client_id || null,
        industry_id: data.industry_id || null,
      }

      if (data.access_level !== undefined && data.access_level !== '') {
        body.access_level = data.access_level
      }

      const response = await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        let message = 'Failed to update user'
        try {
          const errorData = await response.json()
          message = errorData.error || message
        } catch {
          // ignore JSON parse errors
        }
        throw new Error(message)
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
          showAccessLevelField={
            currentUserAccessLevel === 'super_admin' ||
            currentUserAccessLevel === 'client_admin'
          }
          disableAccessLevelField={
            currentUserAccessLevel === 'client_admin' &&
            initialData.access_level === 'super_admin'
          }
          accessLevelOptions={
            currentUserAccessLevel === 'super_admin'
              ? [
                  { value: 'member', label: 'Member' },
                  { value: 'client_admin', label: 'Client Admin' },
                  { value: 'super_admin', label: 'Super Admin' },
                ]
              : [
                  { value: 'member', label: 'Member' },
                  { value: 'client_admin', label: 'Client Admin' },
                ]
          }
        />
      </div>
    </DashboardLayout>
  )
}

