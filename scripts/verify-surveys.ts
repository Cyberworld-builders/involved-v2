// Quick verification script — list canary survey state on a given env.
// Throwaway, used during PR #280 simulation.
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import { resolve } from 'path'

async function main() {
  const envArg = process.argv.find(a => a.startsWith('--env='))?.split('=')[1]
  if (envArg !== 'staging' && envArg !== 'production') { console.error('--env required'); process.exit(1) }
  const env: Record<string,string> = {}
  for (const line of fs.readFileSync(resolve(__dirname, `../.env.${envArg}`), 'utf-8').split('\n')) {
    const t = line.trim(); if (!t || t.startsWith('#') || !t.includes('=')) continue
    const [k, ...r] = t.split('='); env[k.trim()] = r.join('=').trim().replace(/^["']|["']$/g, '')
  }
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })

  const { data: surveys } = await sb.from('surveys').select('id, name, created_at, client:clients!surveys_client_id_fkey(name), assessment:assessments!surveys_assessment_id_fkey(title)').like('name', 'Canary wave %').order('created_at', { ascending: false }).limit(5)
  console.log(`Canary surveys on ${envArg}:`)
  for (const s of surveys ?? []) {
    const c = Array.isArray(s.client) ? s.client[0] : s.client
    const a = Array.isArray(s.assessment) ? s.assessment[0] : s.assessment
    console.log(`  ${s.id.slice(0,8)}  ${a?.title} / ${c?.name}`)
    console.log(`    name: ${s.name}`)
  }

  console.log('\nStatus breakdown per survey:')
  for (const s of surveys ?? []) {
    const { data: assignments } = await sb.from('assignments').select('id').eq('survey_id', s.id)
    const ids = (assignments ?? []).map(a => a.id)
    if (!ids.length) continue
    const { data: logs } = await sb.from('email_logs').select('status').in('related_entity_id', ids).eq('related_entity_type', 'assignment')
    const counts: Record<string, number> = {}
    for (const l of logs ?? []) counts[l.status] = (counts[l.status] ?? 0) + 1
    console.log(`  ${s.id.slice(0,8)}: ${JSON.stringify(counts)} (assignments=${ids.length})`)
  }
}
main().catch(e => { console.error(e); process.exit(1) })
