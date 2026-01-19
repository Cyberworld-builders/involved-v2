import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import BulkUploadFeedbackClient from './bulk-upload-feedback-client'

export default async function BulkUploadFeedbackPage() {
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

  // Only admins can bulk upload feedback
  if (!profile || (profile.access_level !== 'client_admin' && profile.access_level !== 'super_admin')) {
    redirect('/dashboard')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bulk Upload Feedback</h1>
          <p className="text-gray-600">Upload multiple feedback entries from a CSV file</p>
        </div>
        <Link href="/dashboard/feedback">
          <Button variant="outline">Back to Feedback Library</Button>
        </Link>
      </div>

      <BulkUploadFeedbackClient />
    </div>
  )
}
