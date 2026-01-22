import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import FeedbackManageClient from './feedback-manage-client'

export default async function FeedbackPage() {
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

  // Only admins can access feedback management
  if (!profile || (profile.access_level !== 'client_admin' && profile.access_level !== 'super_admin')) {
    redirect('/dashboard')
  }

  // Get all assessments for filtering
  const { data: assessments } = await supabase
    .from('assessments')
    .select('id, title')
    .order('title', { ascending: true })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Feedback Library</h1>
          <p className="text-gray-600">Manage feedback entries for assessments</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/feedback/bulk-upload">
            <Button variant="outline">Bulk Upload</Button>
          </Link>
        </div>
      </div>

      <FeedbackManageClient assessments={assessments || []} />
    </div>
  )
}
