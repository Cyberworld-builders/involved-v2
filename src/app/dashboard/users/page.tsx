import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import DashboardLayout from '@/components/layout/dashboard-layout'
import UsersListClient from './users-list-client'

// Force dynamic rendering to prevent caching/redirect loops
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function UsersPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('access_level, role, client_id')
    .eq('auth_user_id', user.id)
    .single()

  const currentClientId = currentProfile?.client_id || null

  // Backwards-compatible fallback if access_level isn't set yet.
  const currentAccessLevel =
    currentProfile?.access_level ||
    (currentProfile?.role === 'admin'
      ? 'super_admin'
      : (currentProfile?.role === 'manager' || currentProfile?.role === 'client')
        ? 'client_admin'
        : 'member')

  const isSuperAdmin = currentAccessLevel === 'super_admin'
  const isClientAdmin = currentAccessLevel === 'client_admin'

  if (!isSuperAdmin && !isClientAdmin) {
    redirect('/dashboard')
  }
  if (isClientAdmin && !currentClientId) {
    redirect('/dashboard')
  }

  // Fetch users from database with client and industry information
  let query = supabase
    .from('profiles')
    .select(`
      *,
      clients!client_id(name),
      industries!industry_id(name),
      languages!language_id(name)
    `)

  if (isClientAdmin && currentClientId) {
    query = query.eq('client_id', currentClientId)
  }

  const { data: users, error } = await query.order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching users:', error)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Users</h1>
            <p className="text-sm md:text-base text-gray-600">Manage system users and their access.</p>
          </div>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            <Link href="/dashboard/users/create">
              <Button className="w-full sm:w-auto">
                <span className="mr-2">+</span>
                Add User
              </Button>
            </Link>
            <Link href="/dashboard/users/bulk-upload">
              <Button variant="outline" className="w-full sm:w-auto">
                <span className="mr-2">📁</span>
                Bulk Upload
              </Button>
            </Link>
          </div>
        </div>

        {/* Supabase Setup Notice */}
        {!process.env.NEXT_PUBLIC_SUPABASE_URL && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-blue-400">ℹ️</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  Supabase Not Configured
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>
                    To save users to the database, please set up Supabase by following the instructions in{' '}
                    <code className="bg-blue-100 px-1 rounded">SUPABASE_SETUP.md</code>.
                  </p>
                  <p className="mt-1">
                    The form will work in demo mode until Supabase is configured.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-red-400">⚠️</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Error Loading Users
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error.message}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Users List */}
        <Card>
          <CardHeader>
            <CardTitle>All Users</CardTitle>
            <CardDescription>
              Manage users and their client associations
              {users && users.length > 0 && (
                <span className="ml-2 text-sm text-gray-500">
                  ({users.length} user{users.length !== 1 ? 's' : ''})
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!users || users.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No users yet</h3>
                <p className="text-gray-500 mb-4">Get started by creating your first user or uploading a CSV file.</p>
                <div className="flex justify-center space-x-2">
                  <Link href="/dashboard/users/create">
                    <Button>Create User</Button>
                  </Link>
                  <Link href="/dashboard/users/bulk-upload">
                    <Button variant="outline">Bulk Upload</Button>
                  </Link>
                </div>
              </div>
            ) : (
              <UsersListClient users={users} />
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
