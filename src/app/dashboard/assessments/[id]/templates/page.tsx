import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import TemplatesListClient from './templates-list-client'

export default async function TemplatesPage({
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
  const { data: assessment } = await supabase
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
          <h1 className="text-2xl font-bold text-gray-900">Report Templates</h1>
          <p className="text-gray-600">
            Manage report templates for {assessment.title}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/assessments/${assessmentId}`}>
            <Button variant="outline">Back to Assessment</Button>
          </Link>
          <Link href={`/dashboard/assessments/${assessmentId}/templates/create`}>
            <Button>Create Template</Button>
          </Link>
        </div>
      </div>

      <TemplatesListClient assessmentId={assessmentId} />
    </div>
  )
}
