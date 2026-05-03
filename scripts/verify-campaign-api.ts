// Replicates the /api/admin/email-campaign detail-mode logic against the DB
// directly. Used to diagnose why the dashboard renders zeros.
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import { resolve } from 'path'

async function main() {
  const envArg = process.argv.find(a => a.startsWith('--env='))?.split('=')[1]
  const surveyId = process.argv.find(a => a.startsWith('--survey='))?.split('=')[1]
  if (envArg !== 'staging' && envArg !== 'production') { console.error('--env required'); process.exit(1) }
  if (!surveyId) { console.error('--survey=<id> required'); process.exit(1) }

  const env: Record<string,string> = {}
  for (const line of fs.readFileSync(resolve(__dirname, `../.env.${envArg}`), 'utf-8').split('\n')) {
    const t = line.trim(); if (!t || t.startsWith('#') || !t.includes('=')) continue
    const [k, ...r] = t.split('='); env[k.trim()] = r.join('=').trim().replace(/^["']|["']$/g, '')
  }
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })

  // 1) survey lookup
  const { data: survey, error: surveyErr } = await sb
    .from('surveys')
    .select('id, name, created_at')
    .eq('id', surveyId)
    .single()
  console.log('survey lookup:', survey ? `OK id=${survey.id.slice(0,8)} name="${survey.name}"` : `FAIL ${surveyErr?.message}`)

  // 2) assignments under this survey
  const { data: assignments, error: assignErr } = await sb
    .from('assignments')
    .select('id, completed, expires, target_id, user_id, completed_at, created_at')
    .eq('survey_id', surveyId)
  console.log(`assignments: ${assignments?.length ?? 0} rows  err=${assignErr?.message ?? 'none'}`)

  // 4) email_logs joined to assignments
  const ids = (assignments ?? []).map(a => a.id)
  if (ids.length === 0) {
    console.log('no assignments → email_logs query skipped')
    return
  }
  const fromIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const toIso = new Date().toISOString()
  console.log(`window: ${fromIso} → ${toIso}`)

  const { data: logs, error: logsErr } = await sb
    .from('email_logs')
    .select('status, recipient_email, sent_at, related_entity_type, related_entity_id')
    .eq('related_entity_type', 'assignment')
    .in('related_entity_id', ids)
    .gte('sent_at', fromIso)
    .lte('sent_at', toIso)
  console.log(`email_logs: ${logs?.length ?? 0} rows  err=${logsErr?.message ?? 'none'}`)

  const counts: Record<string, number> = {}
  for (const l of logs ?? []) counts[l.status] = (counts[l.status] ?? 0) + 1
  console.log(`status counts: ${JSON.stringify(counts)}`)

  // 5) Sanity: same join WITHOUT date filter
  const { data: logsAllTime } = await sb
    .from('email_logs')
    .select('status, sent_at')
    .eq('related_entity_type', 'assignment')
    .in('related_entity_id', ids)
    .order('sent_at', { ascending: false })
    .limit(5)
  console.log(`email_logs all-time (most recent 5):`)
  for (const l of logsAllTime ?? []) console.log(`  ${l.sent_at} ${l.status}`)
}
main().catch(e => { console.error(e); process.exit(1) })
