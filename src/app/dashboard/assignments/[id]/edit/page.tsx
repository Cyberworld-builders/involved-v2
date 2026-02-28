import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getUserProfile } from '@/lib/utils/get-user-profile'
import EditAssignmentClient from './edit-assignment-client'
import { Database } from '@/types/database'

type Profile = Database['public']['Tables']['profiles']['Row']

interface EditAssignmentPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function EditAssignmentPage({ params }: EditAssignmentPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const profile = await getUserProfile(supabase, user.id)
  if (!profile) {
    redirect('/auth/login')
  }

  // Only admins can edit assignments
  const isSuperAdmin = profile.access_level === 'super_admin'
  const isClientAdmin = profile.access_level === 'client_admin'

  if (!isSuperAdmin && !isClientAdmin) {
    redirect('/dashboard/assignments')
  }

  // Fetch assignment with related data
  const { data: assignment, error: assignmentError } = await supabase
    .from('assignments')
    .select(`
      *,
      user:profiles!assignments_user_id_fkey(id, name, email, username, client_id),
      assessment:assessments!assignments_assessment_id_fkey(
        id,
        title,
        description
      )
    `)
    .eq('id', id)
    .single()

  if (assignmentError || !assignment) {
    redirect('/dashboard/assignments')
  }

  // Check client permissions for client admins
  if (isClientAdmin && profile.client_id) {
    const assignmentUser = assignment.user as Profile
    if (assignmentUser?.client_id !== profile.client_id) {
      redirect('/dashboard/assignments')
    }
  }

  return <EditAssignmentClient assignment={assignment} />
}
