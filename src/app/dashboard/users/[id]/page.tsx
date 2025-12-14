import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import DashboardLayout from '@/components/layout/dashboard-layout'
import SendInviteButton from './send-invite-button'

interface UserPageProps {
  params: Promise<{
    id: string
  }>
}

// Force dynamic rendering to prevent caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function UserPage({ params }: UserPageProps) {
  const { id } = await params
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

  const currentAccessLevel =
    currentProfile?.access_level ||
    (currentProfile?.role === 'admin'
      ? 'super_admin'
      : (currentProfile?.role === 'manager' || currentProfile?.role === 'client')
        ? 'client_admin'
        : 'member')
  const currentClientId = currentProfile?.client_id || null

  const isSuperAdmin = currentAccessLevel === 'super_admin'
  const isClientAdmin = currentAccessLevel === 'client_admin'

  if (!isSuperAdmin && !isClientAdmin) {
    redirect('/dashboard')
  }

  // Fetch user profile with related data
  const { data: profile, error } = await supabase
    .from('profiles')
    .select(`
      *,
      clients!client_id(name),
      industries!industry_id(name),
      languages!language_id(name)
    `)
    .eq('id', id)
    .single()

  if (error || !profile) {
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

  // Client admins can only view users under their own client
  if (isClientAdmin && currentClientId && profile.client_id !== currentClientId) {
    redirect('/dashboard/users')
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{profile.name}</h1>
            <p className="text-gray-600">User details and information</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <SendInviteButton
              userId={profile.id}
              userName={profile.name}
              userEmail={profile.email}
            />
            <Link href={`/dashboard/users/${profile.id}/edit`}>
              <Button variant="outline" className="w-full sm:w-auto">Edit User</Button>
            </Link>
            <Link href="/dashboard/users">
              <Button variant="outline" className="w-full sm:w-auto">Back to Users</Button>
            </Link>
          </div>
        </div>

        {/* User Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>User Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Name</label>
                <p className="text-gray-900">{profile.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Username</label>
                <p className="text-gray-900">@{profile.username}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Email</label>
                <p className="text-gray-900">{profile.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Access Level</label>
                <p className="text-gray-900">
                  {profile.access_level || (profile.role === 'admin' ? 'super_admin' : (profile.role === 'manager' || profile.role === 'client') ? 'client_admin' : 'member')}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Client</label>
                <p className="text-gray-900">{profile.clients?.name || 'No client assigned'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Industry</label>
                <p className="text-gray-900">{profile.industries?.name || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Language</label>
                <p className="text-gray-900">{profile.languages?.name || '-'}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Account Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Profile Status</label>
                <span className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  profile.completed_profile 
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {profile.completed_profile ? 'Completed' : 'Incomplete'}
                </span>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Terms Accepted</label>
                <span className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  profile.accepted_terms 
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {profile.accepted_terms ? 'Yes' : 'No'}
                </span>
              </div>
              {profile.accepted_at && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Terms Accepted At</label>
                  <p className="text-gray-900">{new Date(profile.accepted_at).toLocaleString()}</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-500">Last Login</label>
                <p className="text-gray-900">
                  {profile.last_login_at 
                    ? new Date(profile.last_login_at).toLocaleString()
                    : 'Never'
                  }
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Created</label>
                <p className="text-gray-900">{new Date(profile.created_at).toLocaleDateString()}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}

