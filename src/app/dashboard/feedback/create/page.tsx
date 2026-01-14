import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import CreateFeedbackClient from './create-feedback-client'

export default async function CreateFeedbackPage() {
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

  // Only admins can create feedback
  if (!profile || (profile.access_level !== 'client_admin' && profile.access_level !== 'super_admin')) {
    redirect('/dashboard')
  }

  // Get all assessments for selection
  const { data: assessments } = await supabase
    .from('assessments')
    .select('id, title')
    .order('title', { ascending: true })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create Feedback Entry</h1>
          <p className="text-gray-600">Add a new feedback entry to the library</p>
        </div>
        <Link href="/dashboard/feedback">
          <Button variant="outline">Back to Feedback Library</Button>
        </Link>
      </div>

      <CreateFeedbackClient assessments={assessments || []} />
    </div>
  )
}
