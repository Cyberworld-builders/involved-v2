import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import GroupsTable from './groups-table'

export default async function GroupsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Fetch groups from database with client information
  const { data: groups, error } = await supabase
    .from('groups')
    .select(`
      *,
      clients!client_id(name)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching groups:', error)
  }

  return (
    <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Groups</h1>
            <p className="text-sm md:text-base text-gray-600">Manage groups and their members.</p>
          </div>
          <Link href="/dashboard/groups/create">
            <Button>
              <span className="mr-2">+</span>
              Add Group
            </Button>
          </Link>
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
                    To save groups to the database, please set up Supabase by following the instructions in{' '}
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
                  Error Loading Groups
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error.message}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Groups List */}
        <Card>
          <CardHeader>
            <CardTitle>All Groups</CardTitle>
            <CardDescription>
              Manage groups and their client associations
              {groups && groups.length > 0 && (
                <span className="ml-2 text-sm text-gray-500">
                  ({groups.length} group{groups.length !== 1 ? 's' : ''})
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!groups || groups.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No groups yet</h3>
                <p className="text-gray-500 mb-4">Get started by creating your first group.</p>
                <Link href="/dashboard/groups/create">
                  <Button>Create Group</Button>
                </Link>
              </div>
            ) : (
              <GroupsTable initialGroups={groups} />
            )}
          </CardContent>
        </Card>
      </div>
  )
}
