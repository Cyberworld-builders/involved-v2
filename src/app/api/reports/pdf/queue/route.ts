import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const MAX_ASSIGNMENT_IDS = 100

/**
 * POST /api/reports/pdf/queue
 * Queue multiple assignments for PDF generation (idempotent).
 * pdf-service polls report_data for pdf_status = 'queued' and processes one at a time.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const assignmentIds = body?.assignment_ids

    if (!Array.isArray(assignmentIds) || assignmentIds.length === 0) {
      return NextResponse.json(
        { error: 'assignment_ids array is required and must be non-empty' },
        { status: 400 }
      )
    }

    if (assignmentIds.length > MAX_ASSIGNMENT_IDS) {
      return NextResponse.json(
        { error: `Maximum ${MAX_ASSIGNMENT_IDS} assignments per request` },
        { status: 400 }
      )
    }

    const uniqueIds = [...new Set(assignmentIds)] as string[]
    let queued = 0
    let skipped = 0
    const errors: string[] = []

    for (const assignmentId of uniqueIds) {
      const { data: currentReportData } = await adminClient
        .from('report_data')
        .select('pdf_status')
        .eq('assignment_id', assignmentId)
        .single()

      if (
        currentReportData?.pdf_status === 'queued' ||
        currentReportData?.pdf_status === 'generating' ||
        currentReportData?.pdf_status === 'ready'
      ) {
        skipped++
        continue
      }

      const { data: assignment, error: assignmentError } = await adminClient
        .from('assignments')
        .select('id, completed')
        .eq('id', assignmentId)
        .single()

      if (assignmentError || !assignment) {
        errors.push(`${assignmentId.slice(0, 8)}: not found`)
        continue
      }

      if (!assignment.completed) {
        errors.push(`${assignmentId.slice(0, 8)}: assignment not completed`)
        continue
      }

      if (!currentReportData) {
        await adminClient.from('report_data').insert({
          assignment_id: assignmentId,
          dimension_scores: {},
        })
      }

      const { error: updateError } = await adminClient
        .from('report_data')
        .update({ pdf_status: 'queued' })
        .eq('assignment_id', assignmentId)

      if (updateError) {
        errors.push(`${assignmentId.slice(0, 8)}: ${updateError.message}`)
        continue
      }

      queued++
    }

    return NextResponse.json({
      queued,
      skipped,
      ...(errors.length > 0 && { errors }),
    })
  } catch (error) {
    console.error('Bulk PDF queue error:', error)
    return NextResponse.json(
      {
        error: 'Failed to queue PDFs',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
