import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import EditTemplateClient from '../edit-template-client'
import { createAdminClient } from '@/lib/supabase/admin'

export default async function EditTemplatePage({
  params,
}: {
  params: Promise<{ id: string; templateId: string }>
}) {
  const { id: assessmentId, templateId } = await params
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

  // Get template
  const { data: template, error: templateError } = await adminClient
    .from('report_templates')
    .select('*')
    .eq('id', templateId)
    .single()

  if (templateError || !template || template.assessment_id !== assessmentId) {
    redirect(`/dashboard/assessments/${assessmentId}/templates`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Report Template</h1>
          <p className="text-gray-600">
            Edit template: {template.name}
          </p>
        </div>
        <Link href={`/dashboard/assessments/${assessmentId}/templates`}>
          <Button variant="outline">Back to Templates</Button>
        </Link>
      </div>

      <EditTemplateClient
        assessmentId={assessmentId}
        templateId={templateId}
        initialData={{
          name: template.name,
          is_default: template.is_default,
          components: (template.components as Record<string, boolean>) || {},
          labels: (template.labels as Record<string, string>) || {},
          styling: (template.styling as Record<string, unknown>) || {},
        }}
      />
    </div>
  )
}
