import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AssessmentPreviewClient from './preview-client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AssessmentPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  return <AssessmentPreviewClient assessmentId={id} />
}
