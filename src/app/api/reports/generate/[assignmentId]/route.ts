import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generate360Report } from '@/lib/reports/generate-360-report'
import { generateLeaderBlockerReport } from '@/lib/reports/generate-leader-blocker-report'
import { assignFeedbackToReport } from '@/lib/reports/assign-feedback'
import { applyTemplateToReport } from '@/lib/reports/apply-template'
import { getAppUrl } from '@/lib/config'

/**
 * POST /api/reports/generate/:assignmentId
 * Generate report data for an assignment
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
    const { assignmentId } = await params
    const supabase = await createClient()
    const adminClient = createAdminClient()

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get assignment to verify it's completed
    const { data: assignment, error: assignmentError } = await adminClient
      .from('assignments')
      .select('id, assessment_id, completed, assessment:assessments!assignments_assessment_id_fkey(is_360)')
      .eq('id', assignmentId)
      .single()

    if (assignmentError || !assignment) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      )
    }

    // Type assertion for nested object
    const assessment = (assignment.assessment as unknown) as { is_360: boolean } | null

    // For 360 assessments, allow generation even when not fully completed (partial reports)
    if (!assignment.completed && !assessment?.is_360) {
      return NextResponse.json(
        { error: 'Assignment must be completed before generating report' },
        { status: 400 }
      )
    }

    // Assign feedback first (if not already assigned)
    const { data: existingReportData } = await adminClient
      .from('report_data')
      .select('feedback_assigned')
      .eq('assignment_id', assignmentId)
      .single()

    if (!existingReportData || !existingReportData.feedback_assigned ||
        (Array.isArray(existingReportData.feedback_assigned) && existingReportData.feedback_assigned.length === 0)) {
      // Assign feedback for non-360 assessments
      if (!assessment?.is_360) {
        const assignedFeedback = await assignFeedbackToReport(assignmentId, assignment.assessment_id)
        
        // Store assigned feedback
        await adminClient
          .from('report_data')
          .upsert({
            assignment_id: assignmentId,
            feedback_assigned: assignedFeedback,
          }, {
            onConflict: 'assignment_id',
          })
      }
    }

    // Industry override resolution. Three inputs, precedence in order:
    //   1. Body-supplied industry_id_override (explicit user action — set or clear)
    //   2. Existing report_data.industry_id_override (sticky across regens)
    //   3. undefined → generator falls back to target.industry_id (the default)
    //
    // The body has explicit semantics: `null` clears the override (forces "no
    // industry"); omitting the key preserves the existing stored override.
    //
    // Setting an override is a privileged operation — it changes the data that
    // gets cached and shown to everyone who views this report. Restrict to
    // admin / client_admin / super_admin. Non-privileged callers can still
    // regenerate, but their body's industry_id_override (if any) is ignored.
    let bodyIndustryOverride: string | null | undefined = undefined
    let bodyIndustryOverrideKeyPresent = false
    try {
      const body = (await request.clone().json().catch(() => null)) as { industry_id_override?: string | null } | null
      if (body && Object.prototype.hasOwnProperty.call(body, 'industry_id_override')) {
        const { data: callerProfile } = await supabase
          .from('profiles')
          .select('access_level, role')
          .eq('auth_user_id', user.id)
          .single()
        const role = callerProfile?.role
        const accessLevel = callerProfile?.access_level
        const canOverride =
          accessLevel === 'super_admin' ||
          role === 'admin' ||
          role === 'client_admin'
        if (canOverride) {
          bodyIndustryOverrideKeyPresent = true
          bodyIndustryOverride = body.industry_id_override ?? null
        }
      }
    } catch {
      // body parse failure is fine — no override supplied
    }

    let storedIndustryOverride: string | null = null
    if (!bodyIndustryOverrideKeyPresent) {
      const { data: existing } = await adminClient
        .from('report_data')
        .select('industry_id_override')
        .eq('assignment_id', assignmentId)
        .maybeSingle()
      storedIndustryOverride = (existing?.industry_id_override as string | null) ?? null
    }

    const effectiveOverride: string | null | undefined = bodyIndustryOverrideKeyPresent
      ? bodyIndustryOverride
      : (storedIndustryOverride ?? undefined)

    // Generate report based on assessment type
    let reportData: unknown
    let overallScore: number | null = null

    if (assessment?.is_360) {
      reportData = await generate360Report(assignmentId, { industryIdOverride: effectiveOverride })
      // Extract overall_score from 360 report
      if (reportData && typeof reportData === 'object' && 'overall_score' in reportData) {
        overallScore = typeof reportData.overall_score === 'number' ? reportData.overall_score : null
      }
    } else {
      reportData = await generateLeaderBlockerReport(assignmentId)
      // Extract overall_score from Leader/Blocker report
      if (reportData && typeof reportData === 'object' && 'overall_score' in reportData) {
        overallScore = typeof reportData.overall_score === 'number' ? reportData.overall_score : null
      }
    }

    // Load template for this assessment (default or first available)
    const { data: template } = await adminClient
      .from('report_templates')
      .select('*')
      .eq('assessment_id', assignment.assessment_id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // Apply template to report if available
    if (template && reportData && typeof reportData === 'object') {
      // Type assertions for applyTemplateToReport
      type ReportData = {
        overall_score: number
        dimensions: Array<{
          dimension_id: string
          dimension_name: string
          [key: string]: unknown
        }>
        [key: string]: unknown
      }
      type ReportTemplate = {
        id: string
        assessment_id: string
        name: string
        is_default: boolean
        components: Record<string, boolean>
        labels: Record<string, string>
        styling: Record<string, unknown>
      }
      reportData = applyTemplateToReport(reportData as unknown as ReportData, template as unknown as ReportTemplate)
    }

    // Store report data. industry_id_override is included only when the body
    // explicitly set it (null clears, string sets); otherwise we leave the
    // existing column value untouched.
    const upsertRow: Record<string, unknown> = {
      assignment_id: assignmentId,
      overall_score: overallScore,
      dimension_scores: reportData,
      calculated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    if (bodyIndustryOverrideKeyPresent) {
      upsertRow.industry_id_override = bodyIndustryOverride
    }
    const { error: storeError } = await adminClient
      .from('report_data')
      .upsert(upsertRow, {
        onConflict: 'assignment_id',
      })

    if (storeError) {
      console.error('Error storing report data:', storeError)
      // Continue anyway - report is generated, just not cached
    }

    // Optionally trigger PDF generation (non-blocking, fire-and-forget)
    // PDF generation is optional and doesn't block report viewing
    const shouldAutoGeneratePdf = process.env.AUTO_GENERATE_PDF !== 'false' // Default to true unless explicitly disabled
    
    if (shouldAutoGeneratePdf) {
      const baseUrl = getAppUrl()
      
      const viewUrl = `${baseUrl}/reports/${assignmentId}/view`
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

      // Trigger PDF generation asynchronously (don't wait for completion)
      fetch(`${supabaseUrl}/functions/v1/generate-report-pdf`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assignment_id: assignmentId,
          view_url: viewUrl,
          nextjs_api_url: baseUrl,
          service_role_key: supabaseServiceKey,
        }),
      }).catch(error => {
        console.error('Error triggering PDF generation (non-blocking):', error)
        // Don't fail report generation if PDF trigger fails
      })
    }

    return NextResponse.json({
      success: true,
      report: reportData,
    })
  } catch (error) {
    console.error('Error generating report:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    // Return 400 for data/configuration issues the user can fix
    const isUserFixable = /dimension|group|target|invalid|not found|not configured/i.test(errorMessage)
    return NextResponse.json(
      {
        error: 'Failed to generate report',
        details: errorMessage,
      },
      { status: isUserFixable ? 400 : 500 }
    )
  }
}
