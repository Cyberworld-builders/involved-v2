import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import DashboardLayout from '@/components/layout/dashboard-layout'

export default async function UsersPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Fetch users from database with client and industry information
  const { data: users, error } = await supabase
    .from('users')
    .select(`
      *,
      clients!client_id(name),
      industries!industry_id(name),
      languages!language_id(name)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching users:', error)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Users</h1>
            <p className="text-gray-600">Manage system users and their access.</p>
          </div>
          <div className="flex space-x-2">
            <Link href="/dashboard/users/create">
              <Button>
                <span className="mr-2">+</span>
                Add User
              </Button>
            </Link>
            <Link href="/dashboard/users/bulk-upload">
              <Button variant="outline">
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
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Client
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Industry
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Login
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Settings
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 flex-shrink-0">
                              <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                <span className="text-sm font-medium text-gray-700">
                                  {user.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                <Link
                                  href={`/dashboard/users/${user.id}`}
                                  className="hover:text-indigo-600"
                                >
                                  {user.name}
                                </Link>
                              </div>
                              <div className="text-sm text-gray-500">{user.email}</div>
                              <div className="text-xs text-gray-400">@{user.username}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {user.clients?.name || 'No client'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {user.industries?.name || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.last_login_at 
                            ? new Date(user.last_login_at).toLocaleDateString()
                            : 'Never'
                          }
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <Link
                              href={`/dashboard/users/${user.id}/edit`}
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              Edit
                            </Link>
                            <button className="text-red-600 hover:text-red-900">
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
