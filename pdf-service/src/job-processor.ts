/**
 * Polls Supabase report_data for pdf_status = 'queued', processes one job at a time:
 * generate PDF -> upload to storage -> update DB.
 */
import { getSupabaseClient } from './supabase-client';
import { generatePDFFromView } from './pdf-generator';

const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS ?? '5000', 10);
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? '';
const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? 'reports-pdf';

export async function startJobProcessor(): Promise<void> {
  if (!APP_URL) {
    console.warn('[JobProcessor] NEXT_PUBLIC_APP_URL (or APP_URL) not set; view URLs may be wrong');
  }
  console.log('[JobProcessor] Starting poll interval', POLL_INTERVAL_MS, 'ms');
  await pollOnce();
  setInterval(pollOnce, POLL_INTERVAL_MS);
}

async function pollOnce(): Promise<void> {
  // #region agent log
  const supabaseUrl = process.env.SUPABASE_URL ?? '';
  const supabaseHost = supabaseUrl ? new URL(supabaseUrl).hostname : '(missing)';
  fetch('http://127.0.0.1:7243/ingest/63306b5a-1726-4764-b733-5d551565958f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'job-processor.ts:pollOnce',message:'Poll attempt',data:{supabaseHost,hasKey:!!process.env.SUPABASE_SERVICE_ROLE_KEY},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  const supabase = getSupabaseClient();
  const { data: rows, error } = await supabase
    .from('report_data')
    .select('assignment_id, pdf_version')
    .eq('pdf_status', 'queued')
    .order('updated_at', { ascending: true })
    .limit(1);

  if (error) {
    // #region agent log
    const err = error as unknown as Record<string, unknown>;
    const cause = err.cause ?? (error instanceof Error && 'cause' in error ? (error as Error & { cause?: unknown }).cause : null);
    const causeStr = cause instanceof Error ? cause.message : cause != null ? String(cause) : null;
    const causeCode = (cause && typeof cause === 'object' && 'code' in cause ? (cause as { code?: string }).code : null) ?? (err.code as string | undefined) ?? (err.errno as string | undefined);
    const safeDetail = {
      message: error.message,
      causeStr,
      causeCode,
      supabaseHost,
      keys: Object.keys(err),
      code: err.code,
      errno: err.errno,
      details: err.details,
    };
    fetch('http://127.0.0.1:7243/ingest/63306b5a-1726-4764-b733-5d551565958f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'job-processor.ts:pollError',message:'Poll error detail',data:safeDetail,timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    console.error('[JobProcessor] Poll error:', JSON.stringify(safeDetail));
    return;
  }
  if (!rows?.length) {
    return;
  }

  const { assignment_id: assignmentId, pdf_version: currentVersion } = rows[0];
  const nextVersion = (currentVersion ?? 1);

  // Claim job: set status to generating
  const { error: updateErr } = await supabase
    .from('report_data')
    .update({ pdf_status: 'generating' })
    .eq('assignment_id', assignmentId);

  if (updateErr) {
    console.error('[JobProcessor] Failed to claim job', assignmentId, updateErr.message);
    return;
  }

  console.log('[JobProcessor] Processing job', assignmentId);
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  const viewUrl = `${APP_URL}/reports/${assignmentId}/view?service_role_token=${encodeURIComponent(serviceRoleKey)}`;

  try {
    const pdfBuffer = await generatePDFFromView(viewUrl);
    const storagePath = `${assignmentId}/v${nextVersion}.pdf`;

    const { error: uploadErr } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, pdfBuffer, { contentType: 'application/pdf', upsert: true });

    if (uploadErr) {
      throw new Error(`Storage upload failed: ${uploadErr.message}`);
    }

    await supabase
      .from('report_data')
      .update({
        pdf_status: 'ready',
        pdf_storage_path: storagePath,
        pdf_generated_at: new Date().toISOString(),
        pdf_version: nextVersion,
        pdf_last_error: null,
      })
      .eq('assignment_id', assignmentId);

    console.log('[JobProcessor] Job completed', assignmentId, storagePath);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[JobProcessor] Job failed', assignmentId, message);
    await supabase
      .from('report_data')
      .update({
        pdf_status: 'failed',
        pdf_last_error: message,
      })
      .eq('assignment_id', assignmentId);
  }
}
