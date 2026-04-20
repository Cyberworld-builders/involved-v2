/**
 * Check recent email activity in prod — looking for Craig's pilot.
 * Usage: npx tsx scripts/check-recent-email-sends.ts
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

async function main() {
  const sinceDays = 10
  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await prod
    .from('email_logs')
    .select('sent_at, email_type, recipient_email, subject, status, provider_message_id, related_entity_type, related_entity_id')
    .gte('sent_at', since)
    .order('sent_at', { ascending: false })

  if (error) {
    console.error('Query failed:', error)
    process.exit(1)
  }

  if (!data || data.length === 0) {
    console.log(`No email_logs rows in the past ${sinceDays} days.`)
    return
  }

  console.log(`\n=== ${data.length} email_logs rows in past ${sinceDays} days ===\n`)

  // Group by day + email_type
  const byDay = new Map<string, Map<string, number>>()
  for (const r of data) {
    const day = r.sent_at.slice(0, 10)
    const inner = byDay.get(day) ?? new Map()
    inner.set(r.email_type, (inner.get(r.email_type) ?? 0) + 1)
    byDay.set(day, inner)
  }

  console.log('By day + type:')
  for (const [day, inner] of Array.from(byDay.entries()).sort().reverse()) {
    const parts = Array.from(inner.entries()).map(([t, n]) => `${t}=${n}`).join(', ')
    console.log(`  ${day}: ${parts}`)
  }

  // Domain breakdown
  const domainCounts = new Map<string, number>()
  for (const r of data) {
    const dom = (r.recipient_email.split('@')[1] || 'unknown').toLowerCase()
    domainCounts.set(dom, (domainCounts.get(dom) ?? 0) + 1)
  }
  console.log('\nBy recipient domain:')
  for (const [dom, n] of Array.from(domainCounts.entries()).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${dom}: ${n}`)
  }

  // Unique recipients in past 10d
  const uniqueRecipients = new Set(data.map(r => r.recipient_email.toLowerCase()))
  console.log(`\nUnique recipients: ${uniqueRecipients.size}`)

  // Frontier-specific
  const frontierRows = data.filter(r => r.recipient_email.toLowerCase().includes('frontier'))
  if (frontierRows.length > 0) {
    console.log(`\n=== ${frontierRows.length} Frontier recipient sends ===`)
    for (const r of frontierRows.slice(0, 30)) {
      console.log(`  ${r.sent_at}  ${r.email_type.padEnd(10)}  ${r.status.padEnd(8)}  ${r.recipient_email}  "${r.subject}"`)
    }
    if (frontierRows.length > 30) console.log(`  ... (${frontierRows.length - 30} more)`)
  } else {
    console.log('\nNo Frontier recipients in this window.')
  }

  // Last 20 sends regardless
  console.log('\n=== Last 20 sends (any domain) ===')
  for (const r of data.slice(0, 20)) {
    console.log(`  ${r.sent_at}  ${r.email_type.padEnd(10)}  ${r.recipient_email.padEnd(40)}  "${(r.subject || '').slice(0, 60)}"`)
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
