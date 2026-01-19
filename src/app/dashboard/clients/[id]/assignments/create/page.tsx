import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CreateAssignmentClient from './create-assignment-client'

interface CreateAssignmentPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function CreateAssignmentPage({ params }: CreateAssignmentPageProps) {
  const { id: clientId } = await params
  const supabase = await createClient()

  // Verify user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Get user profile to check permissions
  const { data: profile } = await supabase
    .from('profiles')
    .select('access_level, client_id')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile) {
    redirect('/auth/login')
  }

  // Only allow client_admin and super_admin to create assignments
  // Client admins can only create assignments for their own client
  if (profile.access_level === 'member') {
    redirect(`/dashboard/clients/${clientId}?tab=assignments`)
  }

  // Verify client exists and user has access
  if (profile.access_level === 'client_admin' && profile.client_id !== clientId) {
    redirect('/dashboard/clients')
  }

  return (
    <CreateAssignmentClient clientId={clientId} />
  )
}
