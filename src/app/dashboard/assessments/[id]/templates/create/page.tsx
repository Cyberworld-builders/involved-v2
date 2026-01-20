import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import CreateTemplateClient from './create-template-client'
import { createAdminClient } from '@/lib/supabase/admin'

export default async function CreateTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: assessmentId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Get user profile to check permissions
  const { data: profile } = await supabase
    .from('profiles')
    .select('access_level')
    .eq('auth_user_id', user.id)
    .single()

  // Only admins can access template management
  if (!profile || (profile.access_level !== 'client_admin' && profile.access_level !== 'super_admin')) {
    redirect('/dashboard')
  }

  // Get assessment
  const adminClient = createAdminClient()
  const { data: assessment } = await adminClient
    .from('assessments')
    .select('id, title, created_by')
    .eq('id', assessmentId)
    .single()

  if (!assessment || assessment.created_by !== user.id) {
    redirect('/dashboard/assessments')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create Report Template</h1>
          <p className="text-gray-600">
            Create a new template for {assessment.title}
          </p>
        </div>
        <Link href={`/dashboard/assessments/${assessmentId}/templates`}>
          <Button variant="outline">Back to Templates</Button>
        </Link>
      </div>

      <CreateTemplateClient assessmentId={assessmentId} />
    </div>
  )
}
