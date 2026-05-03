/**
 * Canary load-test harness.
 *
 * Subcommands:
 *   seed       — create canary client + admin + N simulator-email profiles + M assessments
 *   wave       — create assignments for a slice of users and fire the batch-email endpoint
 *   reminders  — invoke the send-reminders Supabase edge function; reports sent count
 *   teardown   — delete canary client and everything under it (email_logs intentionally preserved)
 *
 * Required:
 *   --env=staging | --env=production
 *
 * Options (seed):
 *   --users=N         default 5
 *   --assessments=M   default 2
 *
 * Options (wave):
 *   --assessment=N    1-indexed pick from Canary 360 NN list (default 1)
 *   --group-size=N    number of canary users to include (default 3)
 *   --app-url=URL     override app URL (default: staging=https://involved-v2.cyberworldbuilders.dev)
 *   --expires=ISO     assignment expiration (default: now + 30 days)
 *   --reminder        mark assignments reminder=true, next_reminder=NOW, frequency=+1 day
 *   --skip-email      create assignments without firing the batch-email endpoint (pair with --reminder)
 *
 * Example:
 *   npx tsx scripts/canary.ts seed --env=staging --users=5 --assessments=2
 *   npx tsx scripts/canary.ts wave --env=staging --assessment=1 --group-size=3
 *   npx tsx scripts/canary.ts teardown --env=staging
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import { resolve } from 'path'

type EnvName = 'staging' | 'production'

const CANARY_CLIENT_NAME = 'Canary Load Test'
const CANARY_ADMIN_EMAIL = 'canary-admin@simulator.amazonses.com'
const CANARY_ADMIN_PASSWORD = 'CanaryAdmin!123'
const SIMULATOR_DOMAIN = 'simulator.amazonses.com'

function parseArgs(argv: string[]) {
  const sub = argv[0]
  const opts: Record<string, string> = {}
  for (const a of argv.slice(1)) {
    const m = a.match(/^--([^=]+)=(.*)$/)
    if (m) {
      opts[m[1]] = m[2]
      continue
    }
    const flag = a.match(/^--(.+)$/)
    if (flag) opts[flag[1]] = 'true'
  }
  return { sub, opts }
}

function loadEnv(file: string): Record<string, string> {
  const env: Record<string, string> = {}
  if (!fs.existsSync(file)) throw new Error(`Env file not found: ${file}`)
  for (const line of fs.readFileSync(file, 'utf-8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#') || !t.includes('=')) continue
    const [k, ...r] = t.split('=')
    env[k.trim()] = r.join('=').trim().replace(/^["']|["']$/g, '')
  }
  return env
}

function boot(envName: EnvName) {
  const file = resolve(__dirname, `../.env.${envName}`)
  const env = loadEnv(file)
  const url = env.NEXT_PUBLIC_SUPABASE_URL
  const key = env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error(`Missing Supabase credentials in ${file}`)
  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  console.log(`[canary] env=${envName}  supabase=${url}`)
  return { env, supabase }
}

async function ensureClient(supabase: SupabaseClient): Promise<string> {
  const { data: existing } = await supabase
    .from('clients')
    .select('id')
    .eq('name', CANARY_CLIENT_NAME)
    .maybeSingle()
  if (existing) {
    console.log(`  client: reusing ${existing.id}`)
    return existing.id
  }
  const { data, error } = await supabase
    .from('clients')
    .insert({ name: CANARY_CLIENT_NAME })
    .select('id')
    .single()
  if (error) throw error
  console.log(`  client: created ${data.id}`)
  return data.id
}

async function ensureAdmin(supabase: SupabaseClient, clientId: string): Promise<{ authId: string; profileId: string }> {
  // Find by email across paginated auth users
  let authId: string | null = null
  let page = 1
  while (!authId) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw error
    const found = (data.users as Array<{ id: string; email?: string }>).find(u => u.email === CANARY_ADMIN_EMAIL)
    if (found) { authId = found.id; break }
    if (data.users.length < 1000) break
    page++
  }

  if (!authId) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: CANARY_ADMIN_EMAIL,
      password: CANARY_ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: 'Canary Admin', username: 'canary-admin' },
    })
    if (error) throw error
    authId = data.user.id
    console.log(`  admin auth: created ${authId}`)
  } else {
    // Ensure password is known — reset to canonical so script can sign in later
    await supabase.auth.admin.updateUserById(authId, { password: CANARY_ADMIN_PASSWORD })
    console.log(`  admin auth: reusing ${authId} (password reset)`)
  }

  // Note: a DB trigger auto-creates a profile row with default fields on auth user creation.
  // We upsert-by-auth_user_id so the admin fields (role, access_level, client_id) are always correct,
  // whether this is a fresh seed or a rerun picking up the trigger-created row.
  const adminProfileFields = {
    auth_user_id: authId,
    email: CANARY_ADMIN_EMAIL,
    name: 'Canary Admin',
    username: 'canary-admin',
    client_id: clientId,
    role: 'admin',
    // client_admin (not super_admin) — send-batch-email only requires auth; minimize blast radius on prod
    access_level: 'client_admin',
  }

  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', authId)
    .maybeSingle()

  if (existingProfile) {
    const { error } = await supabase
      .from('profiles')
      .update(adminProfileFields)
      .eq('id', existingProfile.id)
    if (error) throw error
    console.log(`  admin profile: updated ${existingProfile.id} (role/client_id corrected)`)
    return { authId, profileId: existingProfile.id }
  }

  const { data: newProfile, error } = await supabase
    .from('profiles')
    .insert(adminProfileFields)
    .select('id')
    .single()
  if (error) throw error
  console.log(`  admin profile: created ${newProfile.id}`)
  return { authId, profileId: newProfile.id }
}

type RecipientType = 'success' | 'bounce' | 'complaint'

const TYPE_PREFIX: Record<RecipientType, string> = {
  success: 'success',
  bounce: 'bounce',
  complaint: 'complaint',
}

// SES simulator addresses (all support plus addressing). Each user gets a
// distinct subaddress so the email_logs rows are individually addressable.
function buildEmail(type: RecipientType, seq: string) {
  return `${TYPE_PREFIX[type]}+canary-${seq}@${SIMULATOR_DOMAIN}`
}

// Idempotent per-type seeding. Counts existing users matching the type prefix
// and inserts only the gap. Lets you re-run seed with a larger mix without
// duplicating rows or hitting the unique constraint on profile.email.
async function ensureUsers(supabase: SupabaseClient, clientId: string, mix: Record<RecipientType, number>) {
  const { data: existing } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('client_id', clientId)
    .like('email', `%@${SIMULATOR_DOMAIN}`)
    .neq('email', CANARY_ADMIN_EMAIL)
  const byType: Record<RecipientType, number> = { success: 0, bounce: 0, complaint: 0 }
  for (const u of existing ?? []) {
    if (u.email.startsWith('success+canary-')) byType.success++
    else if (u.email.startsWith('bounce+canary-')) byType.bounce++
    else if (u.email.startsWith('complaint+canary-')) byType.complaint++
  }
  console.log(`  users present: success=${byType.success} bounce=${byType.bounce} complaint=${byType.complaint}`)
  console.log(`  users target:  success=${mix.success} bounce=${mix.bounce} complaint=${mix.complaint}`)

  const rows: Array<Record<string, string>> = []
  for (const type of ['success', 'bounce', 'complaint'] as const) {
    const have = byType[type]
    const want = mix[type] ?? 0
    if (have >= want) continue
    for (let n = have + 1; n <= want; n++) {
      const seq = String(n).padStart(3, '0')
      rows.push({
        email: buildEmail(type, seq),
        name: `Canary ${type} ${seq}`,
        username: `canary-${type}-${seq}`,
        client_id: clientId,
        role: 'user',
        access_level: 'member',
      })
    }
  }
  if (rows.length === 0) {
    console.log(`  users: no new rows needed`)
    return
  }
  const { error } = await supabase.from('profiles').insert(rows)
  if (error) throw error
  console.log(`  users: inserted ${rows.length}`)
}

function parseMix(raw: string | undefined): Record<RecipientType, number> {
  // Format: "success:30,bounce:3,complaint:1". Missing keys default to 0.
  const out: Record<RecipientType, number> = { success: 5, bounce: 0, complaint: 0 }
  if (!raw) return out
  // Reset defaults if user provides explicit mix
  out.success = 0
  for (const part of raw.split(',')) {
    const [k, v] = part.split(':').map(s => s.trim())
    if ((k === 'success' || k === 'bounce' || k === 'complaint') && !Number.isNaN(Number(v))) {
      out[k] = Number(v)
    }
  }
  return out
}

async function ensureAssessments(supabase: SupabaseClient, adminAuthId: string, target: number) {
  const { data: existing } = await supabase
    .from('assessments')
    .select('id, title')
    .like('title', 'Canary 360 %')
  const have = existing?.length ?? 0
  console.log(`  assessments: ${have} already exist, target ${target}`)
  if (have >= target) return
  const toCreate = target - have
  const rows = []
  for (let i = 0; i < toCreate; i++) {
    const n = have + i + 1
    rows.push({
      title: `Canary 360 ${String(n).padStart(2, '0')}`,
      description: `Canary test assessment #${n}`,
      type: '360',
      is_360: true,
      status: 'active',
      created_by: adminAuthId,
    })
  }
  const { error } = await supabase.from('assessments').insert(rows)
  if (error) throw error
  console.log(`  assessments: inserted ${toCreate}`)
}

async function seed(supabase: SupabaseClient, mix: Record<RecipientType, number>, assessments: number) {
  console.log('\n[canary:seed] begin')
  const clientId = await ensureClient(supabase)
  const { authId: adminAuthId } = await ensureAdmin(supabase, clientId)
  await ensureUsers(supabase, clientId, mix)
  await ensureAssessments(supabase, adminAuthId, assessments)

  const { count: userCount } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', clientId)
  const { count: assessmentCount } = await supabase
    .from('assessments')
    .select('id', { count: 'exact', head: true })
    .like('title', 'Canary 360 %')

  console.log('\n[canary:seed] done')
  console.log(`  client_id:        ${clientId}`)
  console.log(`  admin email:      ${CANARY_ADMIN_EMAIL}`)
  console.log(`  admin password:   ${CANARY_ADMIN_PASSWORD}`)
  console.log(`  profiles total:   ${userCount}  (includes admin)`)
  console.log(`  assessments:      ${assessmentCount}`)
}

const DEFAULT_APP_URLS: Record<EnvName, string> = {
  staging: 'https://involved-v2.cyberworldbuilders.dev',
  production: 'https://my.involvedtalent.com',
}

async function signInAsCanaryAdmin(envUrl: string, anonKey: string) {
  const browserClient = createClient(envUrl, anonKey, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data, error } = await browserClient.auth.signInWithPassword({
    email: CANARY_ADMIN_EMAIL,
    password: CANARY_ADMIN_PASSWORD,
  })
  if (error || !data.session) throw new Error(`Sign-in failed: ${error?.message ?? 'no session'}`)
  return data.session
}

function buildAuthCookie(supabaseUrl: string, session: { access_token: string; refresh_token: string; expires_at?: number; expires_in?: number; token_type?: string; user?: unknown }): string {
  const projectRef = new URL(supabaseUrl).hostname.split('.')[0]
  const cookieName = `sb-${projectRef}-auth-token`
  // @supabase/ssr 0.7.x format: "base64-" + base64(JSON.stringify(session))
  const payload = {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at,
    expires_in: session.expires_in,
    token_type: session.token_type ?? 'bearer',
    user: session.user,
  }
  const encoded = 'base64-' + Buffer.from(JSON.stringify(payload)).toString('base64')
  return `${cookieName}=${encodeURIComponent(encoded)}`
}

async function wave(
  supabase: SupabaseClient,
  anonKey: string,
  supabaseUrl: string,
  appUrl: string,
  assessmentIndex: number,
  groupSize: number,
  expiresIso: string,
  withReminder: boolean,
  skipEmail: boolean,
  includeTypes: Array<RecipientType | 'all'> = ['all'],
) {
  console.log('\n[canary:wave] begin')
  console.log(`  app_url=${appUrl}  assessment=${assessmentIndex}  group_size=${groupSize}  include_types=${includeTypes.join(',')}  expires=${expiresIso}  reminder=${withReminder}  skip_email=${skipEmail}`)

  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('name', CANARY_CLIENT_NAME)
    .maybeSingle()
  if (!client) throw new Error('No canary client found — run seed first')

  const { data: allUsers } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('client_id', client.id)
    .like('email', `%@${SIMULATOR_DOMAIN}`)
    .neq('email', CANARY_ADMIN_EMAIL)
    .order('email')

  // Filter by include_types — lets one wave target only success addresses for a
  // "healthy" survey demo, vs. another that includes bounce/complaint for a
  // "concerning" survey. Default ['all'] keeps behavior backwards-compatible.
  const allowAll = includeTypes.includes('all')
  const filtered = (allUsers ?? []).filter(u => {
    if (allowAll) return true
    if (includeTypes.includes('success') && u.email.startsWith('success+canary-')) return true
    if (includeTypes.includes('bounce') && u.email.startsWith('bounce+canary-')) return true
    if (includeTypes.includes('complaint') && u.email.startsWith('complaint+canary-')) return true
    return false
  })
  if (filtered.length < groupSize) {
    throw new Error(`Need at least ${groupSize} canary users matching include_types=${includeTypes.join(',')}, have ${filtered.length}`)
  }
  // Random sample so sequential waves produce natural rater overlap
  const shuffled = [...filtered].sort(() => Math.random() - 0.5)
  const users = shuffled.slice(0, groupSize)

  const { data: assessments } = await supabase
    .from('assessments')
    .select('id, title')
    .like('title', 'Canary 360 %')
    .order('title')
  if (!assessments || assessments.length < assessmentIndex) {
    throw new Error(`Need at least ${assessmentIndex} canary assessments, have ${assessments?.length ?? 0}`)
  }
  const assessment = assessments[assessmentIndex - 1]
  console.log(`  using assessment: "${assessment.title}" (${assessment.id.slice(0, 8)})`)
  const mixCounts = users.map(u => u.email.split('+')[0]).reduce((acc, k) => { acc[k] = (acc[k] ?? 0) + 1; return acc }, {} as Record<string, number>)
  console.log(`  user mix: ${JSON.stringify(mixCounts)}`)
  console.log(`  using users: ${users.length} total`)

  // Create a survey for this wave so the campaign dashboard can scope email_logs
  // by survey via assignments.survey_id. Without this, batch-email rows are
  // unjoinable in the dashboard.
  const surveyName = `Canary wave ${new Date().toISOString().slice(0, 19)} (${includeTypes.join(',')})`
  const { data: survey, error: surveyErr } = await supabase
    .from('surveys')
    .insert({
      client_id: client.id,
      assessment_id: assessment.id,
      name: surveyName,
    })
    .select('id')
    .single()
  if (surveyErr) throw surveyErr
  console.log(`  survey: created ${survey.id.slice(0, 8)} ("${surveyName}")`)

  const reminderFields = withReminder
    ? { reminder: true, next_reminder: new Date().toISOString(), reminder_frequency: '+1 day' }
    : {}
  const rows = users.map(u => ({
    user_id: u.id,
    assessment_id: assessment.id,
    survey_id: survey.id,
    expires: expiresIso,
    ...reminderFields,
  }))
  const { data: inserted, error: insertErr } = await supabase
    .from('assignments')
    .insert(rows)
    .select('id')
  if (insertErr) throw insertErr
  const assignmentIds = (inserted ?? []).map(a => a.id)
  console.log(`  inserted ${assignmentIds.length} assignment(s): ${assignmentIds.map(id => id.slice(0, 8)).join(', ')}`)

  if (skipEmail) {
    console.log('  --skip-email set, not firing batch-email endpoint')
    return { assignmentIds, response: null }
  }

  console.log(`  signing in as ${CANARY_ADMIN_EMAIL}...`)
  const session = await signInAsCanaryAdmin(supabaseUrl, anonKey)
  const cookie = buildAuthCookie(supabaseUrl, session)

  console.log(`  POST ${appUrl}/api/assignments/send-batch-email`)
  const startMs = Date.now()
  const resp = await fetch(`${appUrl}/api/assignments/send-batch-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ assignment_ids: assignmentIds }),
  })
  const elapsedMs = Date.now() - startMs
  const respText = await resp.text()
  let respJson: unknown = null
  try { respJson = JSON.parse(respText) } catch { /* non-JSON */ }
  console.log(`  status ${resp.status} in ${elapsedMs}ms`)
  console.log(`  body: ${respText.slice(0, 400)}${respText.length > 400 ? '...' : ''}`)

  if (resp.ok) {
    console.log(`\n  email_logs query (give SES a moment to settle):`)
    await new Promise(r => setTimeout(r, 1500))
    const { data: logs } = await supabase
      .from('email_logs')
      .select('recipient_email, subject, status, provider_message_id, sent_at, error_message')
      .in('related_entity_id', assignmentIds)
      .order('sent_at', { ascending: false })
    console.log(`  email_logs matching assignment_ids: ${logs?.length ?? 0}`)
    for (const l of logs ?? []) {
      console.log(`    ${l.status.padEnd(6)} ${l.recipient_email.padEnd(52)} msg=${(l.provider_message_id ?? '-').slice(0, 30)}${l.error_message ? ' ERR=' + l.error_message : ''}`)
    }
  }

  return { assignmentIds, response: respJson }
}

async function reminders(supabase: SupabaseClient, supabaseUrl: string, serviceRoleKey: string) {
  console.log('\n[canary:reminders] begin')

  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('name', CANARY_CLIENT_NAME)
    .maybeSingle()
  if (!client) throw new Error('No canary client found — run seed + wave --reminder first')

  // Count how many canary assignments are actually due before we fire the function
  const { data: assessRows } = await supabase.from('assessments').select('id').like('title', 'Canary 360 %')
  const assessmentIds = (assessRows ?? []).map(a => a.id)
  const nowIso = new Date().toISOString()
  const { count: dueCount } = await supabase
    .from('assignments')
    .select('id', { count: 'exact', head: true })
    .in('assessment_id', assessmentIds)
    .eq('reminder', true)
    .eq('completed', false)
    .lte('next_reminder', nowIso)
  console.log(`  canary assignments due (reminder=true, completed=false, next_reminder<=now): ${dueCount}`)

  const fnUrl = `${supabaseUrl.replace(/\/+$/, '')}/functions/v1/send-reminders`
  console.log(`  POST ${fnUrl}`)
  const startMs = Date.now()
  const resp = await fetch(fnUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({ triggered_at: nowIso, source: 'canary-script' }),
  })
  const elapsedMs = Date.now() - startMs
  const respText = await resp.text()
  console.log(`  status ${resp.status} in ${elapsedMs}ms`)
  console.log(`  body: ${respText.slice(0, 800)}${respText.length > 800 ? '...' : ''}`)

  // Report on canary reminder logs
  await new Promise(r => setTimeout(r, 2000))
  const cutoff = new Date(Date.now() - 120 * 1000).toISOString()
  const { count: sentCount } = await supabase
    .from('email_logs')
    .select('id', { count: 'exact', head: true })
    .ilike('recipient_email', `%@${SIMULATOR_DOMAIN}`)
    .eq('email_type', 'reminder')
    .eq('status', 'sent')
    .gte('sent_at', cutoff)
  const { count: failedCount } = await supabase
    .from('email_logs')
    .select('id', { count: 'exact', head: true })
    .ilike('recipient_email', `%@${SIMULATOR_DOMAIN}`)
    .eq('email_type', 'reminder')
    .eq('status', 'failed')
    .gte('sent_at', cutoff)
  console.log(`\n  reminder email_logs in last 120s (simulator recipients):`)
  console.log(`    sent:   ${sentCount}`)
  console.log(`    failed: ${failedCount}`)
}

async function teardown(supabase: SupabaseClient) {
  console.log('\n[canary:teardown] begin')
  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('name', CANARY_CLIENT_NAME)
    .maybeSingle()
  if (!client) {
    console.log(`  no canary client found; nothing to do`)
    return
  }
  const clientId = client.id

  // Delete assignments via assessment_id — assessment count is always small regardless of user count,
  // so this avoids PostgREST URL-length limits on .in() with many UUIDs.
  const { data: assessRows } = await supabase.from('assessments').select('id').like('title', 'Canary 360 %')
  const assessmentIds = (assessRows ?? []).map(a => a.id)
  if (assessmentIds.length) {
    const { error, count } = await supabase
      .from('assignments')
      .delete({ count: 'exact' })
      .in('assessment_id', assessmentIds)
    if (error) throw error
    console.log(`  assignments deleted: ${count ?? 0}`)
  }

  // Delete surveys created by waves under this client. Must come after assignments
  // (which have FK to surveys via survey_id) but can come before assessments.
  const { error: surveyErr, count: surveyCount } = await supabase
    .from('surveys')
    .delete({ count: 'exact' })
    .eq('client_id', clientId)
  if (surveyErr) throw surveyErr
  console.log(`  surveys deleted: ${surveyCount ?? 0}`)

  const { error: assessError, count: assessCount } = await supabase
    .from('assessments')
    .delete({ count: 'exact' })
    .like('title', 'Canary 360 %')
  if (assessError) throw assessError
  console.log(`  assessments deleted: ${assessCount ?? 0}`)

  // Profiles could number in the thousands; default select limit is 1000, and .in() is URL-limited.
  // Use paginated select + direct eq('client_id') delete (no .in() needed).
  let profileCount = 0
  let authIds: string[] = []
  const pageSize = 1000
  let from = 0
  while (true) {
    const { data: page, error } = await supabase
      .from('profiles')
      .select('id, auth_user_id')
      .eq('client_id', clientId)
      .range(from, from + pageSize - 1)
    if (error) throw error
    if (!page || page.length === 0) break
    profileCount += page.length
    authIds = authIds.concat(page.map(p => p.auth_user_id).filter((x): x is string => !!x))
    if (page.length < pageSize) break
    from += pageSize
  }
  console.log(`  profiles found: ${profileCount} (auth users: ${authIds.length})`)

  const { error: profErr, count: profDelCount } = await supabase
    .from('profiles')
    .delete({ count: 'exact' })
    .eq('client_id', clientId)
  if (profErr) throw profErr
  console.log(`  profiles deleted: ${profDelCount ?? 0}`)

  for (const id of authIds) {
    const { error } = await supabase.auth.admin.deleteUser(id)
    if (error) console.warn(`  auth delete warn for ${id}: ${error.message}`)
  }
  console.log(`  auth users deleted: ${authIds.length}`)

  const { error: clientErr } = await supabase.from('clients').delete().eq('id', clientId)
  if (clientErr) throw clientErr
  console.log(`  client deleted: ${clientId}`)

  console.log('\n[canary:teardown] done (email_logs intentionally preserved)')
}

async function main() {
  const { sub, opts } = parseArgs(process.argv.slice(2))
  if (!sub || !['seed', 'wave', 'reminders', 'teardown'].includes(sub)) {
    console.error('Usage: npx tsx scripts/canary.ts <seed|wave|reminders|teardown> --env=<staging|production> [options]')
    process.exit(1)
  }
  const envName = opts.env as EnvName
  if (envName !== 'staging' && envName !== 'production') {
    console.error(`--env must be "staging" or "production" (got: ${opts.env ?? '<missing>'})`)
    process.exit(1)
  }
  const { env, supabase } = boot(envName)

  if (sub === 'seed') {
    // Backwards compatibility: --num=N still works; --mix=success:N,bounce:N,complaint:N takes priority.
    const mix = opts.mix
      ? parseMix(opts.mix)
      : { success: Number(opts.num ?? opts.users ?? 5), bounce: 0, complaint: 0 }
    const assessments = Number(opts.assessments ?? 2)
    await seed(supabase, mix, assessments)
  } else if (sub === 'wave') {
    const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!anonKey) throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY in env file')
    const assessmentIndex = Number(opts.assessment ?? 1)
    const groupSize = Number(opts['group-size'] ?? 3)
    const appUrl = opts['app-url'] ?? DEFAULT_APP_URLS[envName]
    const expires = opts.expires ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    const withReminder = 'reminder' in opts
    const skipEmail = 'skip-email' in opts
    // include-types=success,bounce or include-types=all (default) — restricts which user emails participate.
    const includeTypes = (opts['include-types'] ?? 'all').split(',').map((s: string) => s.trim()) as Array<RecipientType | 'all'>
    await wave(supabase, anonKey, env.NEXT_PUBLIC_SUPABASE_URL, appUrl, assessmentIndex, groupSize, expires, withReminder, skipEmail, includeTypes)
  } else if (sub === 'reminders') {
    await reminders(supabase, env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
  } else {
    await teardown(supabase)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
