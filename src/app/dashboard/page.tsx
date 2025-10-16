import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import DashboardLayout from '@/components/layout/dashboard-layout'
import SignOutButton from './sign-out-button'
import AuthStatus from '@/components/auth-status'
import Changelog from '@/components/changelog/changelog'
import { ensureUserProfile } from '@/lib/user-profile-utils'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Ensure user profile exists in our users table
  await ensureUserProfile(user.id, user.email, user.user_metadata)

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Welcome back!</h1>
              <p className="text-gray-600">Here&apos;s what&apos;s happening with your assessments today.</p>
              <AuthStatus />
            </div>
            <SignOutButton />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>My Assessments</CardTitle>
              <CardDescription>
                View and manage your assessments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-indigo-600">0</p>
              <p className="text-sm text-gray-600">Active assessments</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pending Reviews</CardTitle>
              <CardDescription>
                Assessments waiting for your input
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-orange-600">0</p>
              <p className="text-sm text-gray-600">Reviews pending</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Completed</CardTitle>
              <CardDescription>
                Assessments you&apos;ve completed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">0</p>
              <p className="text-sm text-gray-600">Total completed</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Your latest assessment activity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <p>No recent activity</p>
                <p className="text-sm">Start by creating or taking an assessment</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Development Changelog */}
        <div className="mt-8">
          <Changelog />
        </div>
      </div>
    </DashboardLayout>
  )
}
