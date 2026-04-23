/**
 * One-off: check for residual canary state after teardown.
 * (Remove when canary testing is done.)
 */
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import { resolve } from 'path'

async function main() {
  const envArg = process.argv.find(a => a.startsWith('--env='))?.split('=')[1]
  if (envArg !== 'staging' && envArg !== 'production') { console.error('--env=staging|production required'); process.exit(1) }
  const env: Record<string, string> = {}
  for (const line of fs.readFileSync(resolve(__dirname, `../.env.${envArg}`), 'utf-8').split('\n')) {
    const t = line.trim(); if (!t || t.startsWith('#') || !t.includes('=')) continue
    const [k, ...r] = t.split('='); env[k.trim()] = r.join('=').trim().replace(/^["']|["']$/g, '')
  }
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })

  const { data: logs } = await sb.from('email_logs')
    .select('recipient_email, status, sent_at, error_message, related_entity_id')
    .ilike('recipient_email', '%simulator.amazonses.com')
    .order('sent_at', { ascending: false })
  console.log(`email_logs with simulator recipients: ${logs?.length ?? 0}`)
  for (const l of logs ?? []) console.log(`  ${l.status.padEnd(6)} ${l.recipient_email.padEnd(52)} related=${l.related_entity_id?.slice(0, 8) ?? '-'}  err=${(l.error_message ?? '-').slice(0, 60)}`)

  const { data: profs } = await sb.from('profiles').select('id, email, client_id, auth_user_id').ilike('email', '%simulator.amazonses.com')
  console.log(`\nresidual profiles with simulator emails: ${profs?.length ?? 0}`)
  for (const p of profs ?? []) console.log(`  ${p.email.padEnd(52)} client=${p.client_id?.slice(0, 8) ?? '(none)'} auth=${p.auth_user_id?.slice(0, 8) ?? '(none)'}`)

  const { data: assess } = await sb.from('assessments').select('id, title').ilike('title', 'Canary 360 %')
  console.log(`\nresidual canary assessments: ${assess?.length ?? 0}`)

  const { data: clients } = await sb.from('clients').select('id, name').ilike('name', '%canary%')
  console.log(`\nresidual canary clients: ${clients?.length ?? 0}`)
  for (const c of clients ?? []) console.log(`  ${c.id} ${c.name}`)
}
main().catch(e => { console.error(e); process.exit(1) })
