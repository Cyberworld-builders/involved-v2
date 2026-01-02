import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getUserProfile } from '@/lib/utils/get-user-profile'
import DashboardLayout from '@/components/layout/dashboard-layout'

export default async function DashboardLayoutWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Fetch user profile once at layout level (shared across all dashboard pages)
  // This eliminates duplicate fetches on every page navigation
  const profile = await getUserProfile(supabase, user.id)
  if (!profile) {
    redirect('/auth/login')
  }

  // Pass profile data to DashboardLayout, which passes it to Sidebar
  // This way profile is fetched once per session, not on every page
  return (
    <DashboardLayout
      userProfile={{
        access_level: profile.access_level,
        name: profile.name || user.email || '',
        email: user.email || '',
      }}
    >
      {children}
    </DashboardLayout>
  )
}

