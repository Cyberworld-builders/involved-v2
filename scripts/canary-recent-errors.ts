import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import { resolve } from 'path'

async function main() {
  const envArg = process.argv.find(a => a.startsWith('--env='))?.split('=')[1]
  if (envArg !== 'staging' && envArg !== 'production') { console.error('--env required'); process.exit(1) }
  const env: Record<string, string> = {}
  for (const line of fs.readFileSync(resolve(__dirname, `../.env.${envArg}`), 'utf-8').split('\n')) {
    const t = line.trim(); if (!t || t.startsWith('#') || !t.includes('=')) continue
    const [k, ...r] = t.split('='); env[k.trim()] = r.join('=').trim().replace(/^["']|["']$/g, '')
  }
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  const cutoff = new Date(Date.now() - 300 * 1000).toISOString()
  const { data } = await sb.from('email_logs')
    .select('recipient_email, error_message, sent_at')
    .ilike('recipient_email', '%simulator.amazonses.com')
    .eq('status', 'failed')
    .gte('sent_at', cutoff)
    .order('sent_at', { ascending: false })
    .limit(5)
  console.log('recent failed sends (last 5):')
  for (const r of data ?? []) console.log(`  ${r.sent_at} ${r.recipient_email}\n    err=${r.error_message}`)
}
main().catch(e => { console.error(e); process.exit(1) })
