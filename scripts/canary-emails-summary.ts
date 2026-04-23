/**
 * Summarize emails sent for the active canary client (by simulator recipients).
 * Shows per-user email count distribution (matches "rater overlap" intuition).
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

  const { data: client } = await sb.from('clients').select('id').eq('name', 'Canary Load Test').maybeSingle()
  if (!client) { console.log('No active canary client'); return }

  const { data: assignments } = await sb.from('assignments').select('id').in('user_id', (await sb.from('profiles').select('id').eq('client_id', client.id)).data?.map(p => p.id) ?? [])
  const assignmentIds = new Set((assignments ?? []).map(a => a.id))

  const { data: logs } = await sb.from('email_logs')
    .select('recipient_email, status, sent_at, related_entity_id')
    .ilike('recipient_email', '%simulator.amazonses.com')
    .eq('status', 'sent')
    .order('sent_at', { ascending: true })

  const relevantLogs = (logs ?? []).filter(l => l.related_entity_id && assignmentIds.has(l.related_entity_id))

  const byUser = new Map<string, number>()
  for (const l of relevantLogs) byUser.set(l.recipient_email, (byUser.get(l.recipient_email) ?? 0) + 1)

  console.log(`Total emails (sent, current canary): ${relevantLogs.length}`)
  console.log(`Unique recipients: ${byUser.size}`)
  console.log(`\nPer-user email count (desc):`)
  const entries = [...byUser.entries()].sort((a, b) => b[1] - a[1])
  for (const [email, count] of entries) {
    console.log(`  ${String(count).padStart(2)} × ${email}`)
  }

  const dist = new Map<number, number>()
  for (const [, count] of entries) dist.set(count, (dist.get(count) ?? 0) + 1)
  console.log(`\nDistribution (users × email count):`)
  for (const [count, users] of [...dist.entries()].sort((a, b) => a[0] - b[0])) {
    console.log(`  ${users} user(s) received ${count} email(s)`)
  }
}
main().catch(e => { console.error(e); process.exit(1) })
