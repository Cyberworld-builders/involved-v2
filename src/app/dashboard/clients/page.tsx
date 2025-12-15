import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import DashboardLayout from '@/components/layout/dashboard-layout'
import ClientsTable from './clients-table'

export default async function ClientsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Load current user's profile to determine access level and client scoping
  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('access_level, role, client_id')
    .eq('auth_user_id', user.id)
    .single()

  const currentClientId = currentProfile?.client_id || null

  const currentAccessLevel =
    currentProfile?.access_level ||
    (currentProfile?.role === 'admin'
      ? 'super_admin'
      : (currentProfile?.role === 'manager' || currentProfile?.role === 'client')
        ? 'client_admin'
        : 'member')

  const isSuperAdmin = currentAccessLevel === 'super_admin'
  const isClientAdmin = currentAccessLevel === 'client_admin'

  // Only super admins and client admins can access the Clients page
  if (!isSuperAdmin && !isClientAdmin) {
    redirect('/dashboard')
  }
  // Client admins must be associated with a client
  if (isClientAdmin && !currentClientId) {
    redirect('/dashboard')
  }

  // Fetch clients from database, scoped by client for client_admins
  let clientsQuery = supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false })

  if (isClientAdmin && currentClientId) {
    clientsQuery = clientsQuery.eq('id', currentClientId)
  }

  const { data: clients, error } = await clientsQuery

  // Fetch user counts per client (only for scoped clients)
  const { data: userCounts } = await supabase
    .from('profiles')
    .select('client_id')
    .not('client_id', 'is', null)

  // Count users per client
  const userCountMap = new Map<string, number>()
  userCounts?.forEach((profile) => {
    if (profile.client_id) {
      userCountMap.set(
        profile.client_id,
        (userCountMap.get(profile.client_id) || 0) + 1
      )
    }
  })

  // Add user counts to clients
  const clientsWithCounts = clients?.map((client) => ({
    ...client,
    userCount: userCountMap.get(client.id) || 0,
  })) || []

  if (error) {
    console.error('Error fetching clients:', error)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Clients</h1>
            <p className="text-sm md:text-base text-gray-600">Add or manage clients.</p>
          </div>
          {/* Only super admins can create new clients */}
          {isSuperAdmin && (
            <Link href="/dashboard/clients/create">
              <Button>
                <span className="mr-2">+</span>
                Add Client
              </Button>
            </Link>
          )}
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
                    To save clients to the database, please set up Supabase by following the instructions in{' '}
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
                  Error Loading Clients
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error.message}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Clients List */}
        <Card>
          <CardHeader>
            <CardTitle>All Clients</CardTitle>
            <CardDescription>
              Manage your organization&apos;s clients and their settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!clients || clients.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No clients found</h3>
                <p className="text-gray-500 mb-4">
                  {isSuperAdmin
                    ? 'Get started by creating your first client.'
                    : 'You do not have access to any clients.'}
                </p>
                {isSuperAdmin && (
                  <Link href="/dashboard/clients/create">
                    <Button>Create Client</Button>
                  </Link>
                )}
              </div>
            ) : (
              <ClientsTable initialClients={clientsWithCounts} />
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
