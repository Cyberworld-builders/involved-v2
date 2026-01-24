import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import ReportViewFullscreenClient from './report-view-fullscreen-client'

export default async function ReportViewFullscreenPage({
  params,
  searchParams,
}: {
  params: Promise<{ assignmentId: string }>
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { assignmentId } = await params
  const resolvedSearchParams = searchParams ? await searchParams : {}
  const supabase = await createClient()
  
  // Check for service role authentication via query parameter (for PDF generation from Edge Function)
  // Handle both string and string[] cases
  const serviceRoleTokenRaw = resolvedSearchParams?.service_role_token
  const serviceRoleToken = Array.isArray(serviceRoleTokenRaw) 
    ? serviceRoleTokenRaw[0] 
    : (serviceRoleTokenRaw as string | undefined)
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  // #region agent log
  console.log('[DEBUG] View page - searchParams keys:', Object.keys(resolvedSearchParams || {}))
  console.log('[DEBUG] View page - serviceRoleToken present:', !!serviceRoleToken)
  console.log('[DEBUG] View page - serviceRoleKey present:', !!serviceRoleKey)
  if (serviceRoleToken && serviceRoleKey) {
    console.log('[DEBUG] View page - tokens match:', serviceRoleToken === serviceRoleKey)
  }
  // #endregion
  
  const isServiceRole = serviceRoleToken && 
                       serviceRoleKey && 
                       serviceRoleToken === serviceRoleKey
  
  // #region agent log
  console.log('[DEBUG] View page - isServiceRole:', isServiceRole)
  // #endregion

  // Get assignment to verify access (needed for both service role and user auth paths)
  const { createAdminClient } = await import('@/lib/supabase/admin')
  const adminClient = createAdminClient()

  const { data: assignment, error: assignmentError } = await adminClient
    .from('assignments')
    .select(`
      id,
      user_id,
      assessment_id,
      completed,
      assessment:assessments!assignments_assessment_id_fkey(
        id,
        title,
        is_360
      )
    `)
    .eq('id', assignmentId)
    .single()

  if (assignmentError || !assignment) {
    notFound()
  }

  // If service role, skip user authentication check
  if (!isServiceRole) {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      redirect('/auth/login')
    }

    // Get user profile to check permissions
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, access_level, client_id')
      .eq('auth_user_id', user.id)
      .single()

    if (!profile) {
      redirect('/auth/login')
    }

    // Check permissions
    const isOwner = assignment.user_id === profile.id
    const isAdmin = profile.access_level === 'client_admin' || profile.access_level === 'super_admin'

    if (!isOwner && !isAdmin) {
      redirect('/dashboard')
    }

    if (!assignment.completed) {
      redirect(`/dashboard/reports/${assignmentId}`)
    }
  } else {
    // Service role: verify assignment exists and is completed
    if (!assignment.completed) {
      redirect(`/dashboard/reports/${assignmentId}`)
    }
  }

  // Type assertion for nested object (Supabase returns arrays for relations, but .single() should return objects)
  const assessment = (assignment.assessment as unknown) as { id: string; title: string; is_360: boolean } | null

  // Fetch report data (for service role access, we need to provide it server-side)
  // For regular users, the client component will fetch it via API
  let reportData: unknown = null
  if (isServiceRole) {
    try {
      // #region agent log
      console.log('[DEBUG] View page - Fetching report data for service role')
      // #endregion
      
      // Check if report data exists
      const { data: existingReportData } = await adminClient
        .from('report_data')
        .select('dimension_scores, calculated_at')
        .eq('assignment_id', assignmentId)
        .single()

      if (existingReportData?.dimension_scores) {
        // #region agent log
        console.log('[DEBUG] View page - Using existing report data')
        // #endregion
        reportData = existingReportData.dimension_scores
      } else {
        // #region agent log
        console.log('[DEBUG] View page - Generating new report data')
        // #endregion
        // Generate report if it doesn't exist
        const { generate360Report } = await import('@/lib/reports/generate-360-report')
        const { generateLeaderBlockerReport } = await import('@/lib/reports/generate-leader-blocker-report')
        
        if (assessment?.is_360) {
          reportData = await generate360Report(assignmentId)
        } else {
          reportData = await generateLeaderBlockerReport(assignmentId)
        }
        
        // #region agent log
        console.log('[DEBUG] View page - Report data generated:', {
          hasData: !!reportData,
          dataType: reportData ? typeof reportData : 'null'
        })
        // #endregion
      }
    } catch (error) {
      // #region agent log
      console.error('[DEBUG] View page - Error fetching report data:', error)
      // #endregion
      // Continue without report data - client component will handle error
    }
  }

  return (
    <ReportViewFullscreenClient 
      assignmentId={assignmentId} 
      is360={assessment?.is_360 || false}
      initialReportData={reportData}
    />
  )
}
