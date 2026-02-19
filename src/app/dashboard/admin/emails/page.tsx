import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import EmailDashboardClient from './email-dashboard-client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AdminEmailsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('access_level')
    .eq('auth_user_id', user.id)
    .single()

  const accessLevel =
    profile?.access_level

  if (accessLevel !== 'super_admin') {
    redirect('/dashboard')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Email dashboard</h1>
        <p className="text-gray-600">
          View outbound email log and SES aggregate stats. Use provider message ID to investigate in AWS when needed.
        </p>
      </div>
      <EmailDashboardClient />
    </div>
  )
}
