/**
 * Quick count of recent email_logs for canary (simulator recipients) in last N seconds.
 */
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import { resolve } from 'path'

async function main() {
  const envArg = process.argv.find(a => a.startsWith('--env='))?.split('=')[1]
  const secondsArg = Number(process.argv.find(a => a.startsWith('--seconds='))?.split('=')[1] ?? 120)
  if (envArg !== 'staging' && envArg !== 'production') { console.error('--env=staging|production required'); process.exit(1) }
  const env: Record<string, string> = {}
  for (const line of fs.readFileSync(resolve(__dirname, `../.env.${envArg}`), 'utf-8').split('\n')) {
    const t = line.trim(); if (!t || t.startsWith('#') || !t.includes('=')) continue
    const [k, ...r] = t.split('='); env[k.trim()] = r.join('=').trim().replace(/^["']|["']$/g, '')
  }
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })

  const cutoff = new Date(Date.now() - secondsArg * 1000).toISOString()
  const { count: sentCount } = await sb.from('email_logs')
    .select('id', { count: 'exact', head: true })
    .ilike('recipient_email', '%simulator.amazonses.com')
    .eq('status', 'sent')
    .gte('sent_at', cutoff)
  const { count: failedCount } = await sb.from('email_logs')
    .select('id', { count: 'exact', head: true })
    .ilike('recipient_email', '%simulator.amazonses.com')
    .eq('status', 'failed')
    .gte('sent_at', cutoff)

  console.log(`env=${envArg}  cutoff=${cutoff}  (last ${secondsArg}s)`)
  console.log(`  sent:   ${sentCount}`)
  console.log(`  failed: ${failedCount}`)

  const { count: totalSent } = await sb.from('email_logs')
    .select('id', { count: 'exact', head: true })
    .ilike('recipient_email', '%simulator.amazonses.com')
    .eq('status', 'sent')
  const { count: totalFailed } = await sb.from('email_logs')
    .select('id', { count: 'exact', head: true })
    .ilike('recipient_email', '%simulator.amazonses.com')
    .eq('status', 'failed')
  const { data: oldest } = await sb.from('email_logs').select('sent_at').ilike('recipient_email', '%simulator.amazonses.com').order('sent_at', { ascending: true }).limit(1)
  const { data: newest } = await sb.from('email_logs').select('sent_at').ilike('recipient_email', '%simulator.amazonses.com').order('sent_at', { ascending: false }).limit(1)
  console.log(`\nall-time simulator logs:`)
  console.log(`  sent:   ${totalSent}`)
  console.log(`  failed: ${totalFailed}`)
  console.log(`  oldest: ${oldest?.[0]?.sent_at}`)
  console.log(`  newest: ${newest?.[0]?.sent_at}`)
}
main().catch(e => { console.error(e); process.exit(1) })
