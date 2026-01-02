import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getUserProfile } from '@/lib/utils/get-user-profile'
import CreateAssignmentClient from './create-assignment-client'

export default async function CreateAssignmentPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Get user profile to verify access level
  const profile = await getUserProfile(supabase, user.id)
  if (!profile) {
    redirect('/auth/login')
  }

  // Only admins can create assignments
  if (profile.access_level === 'member') {
    redirect('/dashboard/assignments')
  }

  return (
    <CreateAssignmentClient />
  )
}

