/**
 * Audit: find profiles where profiles.email != auth.users.email for the linked auth_user_id.
 * Dry-run only. Reports divergence grouped by client.
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

interface ProfileRow {
  id: string
  auth_user_id: string
  email: string
  name: string
  username: string
  client_id: string | null
  created_at: string
}

async function listAllAuthUsers(): Promise<Map<string, { email: string; full_name?: string; username?: string }>> {
  const byId = new Map<string, { email: string; full_name?: string; username?: string }>()
  const perPage = 1000
  let page = 1
  while (true) {
    const { data, error } = await prod.auth.admin.listUsers({ page, perPage })
    if (error) throw error
    const users = data?.users ?? []
    for (const u of users) {
      byId.set(u.id, {
        email: (u.email ?? '').toLowerCase(),
        full_name: (u.user_metadata as Record<string, unknown>)?.full_name as string | undefined,
        username: (u.user_metadata as Record<string, unknown>)?.username as string | undefined,
      })
    }
    if (users.length < perPage) break
    page++
  }
  return byId
}

async function main() {
  console.log('Listing all auth users...')
  const authMap = await listAllAuthUsers()
  console.log(`  got ${authMap.size} auth users\n`)

  console.log('Querying profiles (with non-null auth_user_id)...')
  let profiles: ProfileRow[] = []
  const pageSize = 1000
  let from = 0
  while (true) {
    const { data, error } = await prod
      .from('profiles')
      .select('id, auth_user_id, email, name, username, client_id, created_at')
      .not('auth_user_id', 'is', null)
      .range(from, from + pageSize - 1)
    if (error) throw error
    if (!data || data.length === 0) break
    profiles = profiles.concat(data as ProfileRow[])
    if (data.length < pageSize) break
    from += pageSize
  }
  console.log(`  got ${profiles.length} profiles with auth_user_id\n`)

  // Client lookup for labeling
  const { data: clients } = await prod.from('clients').select('id, name')
  const clientName = new Map<string, string>((clients ?? []).map(c => [c.id, c.name]))

  const emailDrift: Array<{ p: ProfileRow; authEmail: string; authFullName?: string; authUsername?: string; clientLabel: string }> = []
  const nameDrift: typeof emailDrift = []
  const usernameDrift: typeof emailDrift = []
  const orphaned: ProfileRow[] = []

  for (const p of profiles) {
    const a = authMap.get(p.auth_user_id)
    if (!a) {
      orphaned.push(p)
      continue
    }
    const profileEmail = (p.email ?? '').toLowerCase().trim()
    const authEmail = a.email.trim()
    const clientLabel = p.client_id ? (clientName.get(p.client_id) ?? p.client_id.slice(0, 8)) : '(no client)'

    if (authEmail && profileEmail && authEmail !== profileEmail) {
      emailDrift.push({ p, authEmail, authFullName: a.full_name, authUsername: a.username, clientLabel })
    }
    if (a.full_name && p.name && a.full_name !== p.name) {
      nameDrift.push({ p, authEmail, authFullName: a.full_name, authUsername: a.username, clientLabel })
    }
    if (a.username && p.username && a.username !== p.username) {
      usernameDrift.push({ p, authEmail, authFullName: a.full_name, authUsername: a.username, clientLabel })
    }
  }

  console.log('============================================================')
  console.log(`EMAIL DRIFT (profile.email != auth.users.email): ${emailDrift.length}`)
  console.log('============================================================')
  const byClient = new Map<string, typeof emailDrift>()
  for (const r of emailDrift) {
    const arr = byClient.get(r.clientLabel) ?? []
    arr.push(r)
    byClient.set(r.clientLabel, arr)
  }
  for (const [cli, rows] of Array.from(byClient.entries()).sort()) {
    console.log(`\n  [${cli}] — ${rows.length} profile(s):`)
    for (const r of rows) {
      console.log(`    profile: "${r.p.name}" <${r.p.email}>  (profile.id=${r.p.id.slice(0, 8)})`)
      console.log(`       auth: "${r.authFullName ?? '?'}" <${r.authEmail}>  (auth_user_id=${r.p.auth_user_id.slice(0, 8)})`)
    }
  }

  console.log('\n============================================================')
  console.log(`NAME DRIFT (profile.name != auth user_metadata.full_name): ${nameDrift.length}`)
  console.log('============================================================')
  for (const r of nameDrift.slice(0, 50)) {
    console.log(`  [${r.clientLabel}] profile="${r.p.name}"  auth="${r.authFullName}"  <${r.p.email}>`)
  }
  if (nameDrift.length > 50) console.log(`  ... (${nameDrift.length - 50} more)`)

  console.log('\n============================================================')
  console.log(`USERNAME DRIFT (profile.username != auth user_metadata.username): ${usernameDrift.length}`)
  console.log('============================================================')
  for (const r of usernameDrift.slice(0, 50)) {
    console.log(`  [${r.clientLabel}] profile=${r.p.username}  auth=${r.authUsername}  <${r.p.email}>`)
  }
  if (usernameDrift.length > 50) console.log(`  ... (${usernameDrift.length - 50} more)`)

  console.log('\n============================================================')
  console.log(`ORPHANED PROFILES (auth_user_id points to no existing auth user): ${orphaned.length}`)
  console.log('============================================================')
  for (const p of orphaned) {
    const cli = p.client_id ? (clientName.get(p.client_id) ?? p.client_id.slice(0, 8)) : '(no client)'
    console.log(`  [${cli}] "${p.name}" <${p.email}>  auth_user_id=${p.auth_user_id.slice(0, 8)}`)
  }

  console.log('\n============================================================')
  console.log('SUMMARY')
  console.log('============================================================')
  console.log(`  Profiles scanned: ${profiles.length}`)
  console.log(`  Email drift:      ${emailDrift.length}`)
  console.log(`  Name drift:       ${nameDrift.length}`)
  console.log(`  Username drift:   ${usernameDrift.length}`)
  console.log(`  Orphaned:         ${orphaned.length}`)
}

main().catch(e => { console.error(e); process.exit(1) })
