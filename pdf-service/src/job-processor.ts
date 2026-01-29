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
  const supabase = getSupabaseClient();
  const { data: rows, error } = await supabase
    .from('report_data')
    .select('assignment_id, pdf_version')
    .eq('pdf_status', 'queued')
    .order('updated_at', { ascending: true })
    .limit(1);

  if (error) {
    console.error('[JobProcessor] Poll error:', error.message);
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
