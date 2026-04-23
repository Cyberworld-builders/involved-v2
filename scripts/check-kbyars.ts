/**
 * Check email + magic link activity for kbyars@involvedtalent.com in prod.
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'

function loadEnv(file: string): Record<string, string> {
  const env: Record<string, string> = {}
  for (const line of fs.readFileSync(file, 'utf-8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#') || !t.includes('=')) continue
    const [k, ...r] = t.split('=')
    env[k.trim()] = r.join('=').trim().replace(/^["']|["']$/g, '')
  }
  return env
}

const prodEnv = loadEnv('.env.production')
const prod = createClient(prodEnv.NEXT_PUBLIC_SUPABASE_URL, prodEnv.SUPABASE_SERVICE_ROLE_KEY)

const EMAIL = 'kbyars@involvedtalent.com'

async function main() {
  console.log(`\n=== Email logs for ${EMAIL} (past 30 days) ===\n`)
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { data: logs, error: logsErr } = await prod
    .from('email_logs')
    .select('*')
    .eq('recipient_email', EMAIL)
    .gte('sent_at', since)
    .order('sent_at', { ascending: false })
  if (logsErr) { console.error(logsErr); process.exit(1) }
  if (!logs || logs.length === 0) {
    console.log('(no email_logs rows)')
  } else {
    for (const l of logs) {
      console.log(`  ${l.sent_at}  ${l.email_type.padEnd(12)} status=${l.status.padEnd(8)}  "${l.subject}"`)
      console.log(`     id=${l.provider_message_id ?? '(none)'}  related=${l.related_entity_type}/${l.related_entity_id}  error=${l.error_message ?? ''}`)
    }
  }

  console.log(`\n=== profiles row ===\n`)
  const { data: prof } = await prod
    .from('profiles')
    .select('*')
    .eq('email', EMAIL)
    .maybeSingle()
  console.log(prof ? JSON.stringify(prof, null, 2) : '(no profile)')

  console.log(`\n=== assignments ===\n`)
  if (prof?.id) {
    const { data: asns } = await prod
      .from('assignments')
      .select('id, assessment_id, completed, reminder, next_reminder, created_at, expires, url')
      .eq('user_id', prof.id)
      .order('created_at', { ascending: false })
    console.log(JSON.stringify(asns, null, 2))
  }

  console.log(`\n=== auth.users ===\n`)
  const { data: authRes, error: authErr } = await prod.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (authErr) { console.error(authErr) }
  else {
    const match = authRes?.users?.find(u => u.email?.toLowerCase() === EMAIL)
    if (match) {
      console.log({
        id: match.id,
        email: match.email,
        created_at: match.created_at,
        last_sign_in_at: match.last_sign_in_at,
        email_confirmed_at: match.email_confirmed_at,
        confirmed_at: match.confirmed_at,
        recovery_sent_at: match.recovery_sent_at,
        invited_at: match.invited_at,
        is_anonymous: match.is_anonymous,
      })
    } else {
      console.log('(no auth user)')
    }
  }
}

main().catch(e => { console.error(e); process.exit(1) })
