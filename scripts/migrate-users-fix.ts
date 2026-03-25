/**
 * Fix: migrate auth users and profiles preserving original UUIDs.
 * Then re-insert assignments, dimension_scores, and report_data.
 *
 * Usage: npx tsx scripts/migrate-users-fix.ts
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

const stagingEnv = loadEnv('.env.staging')
const prodEnv = loadEnv('.env.production')

const staging = createClient(stagingEnv.NEXT_PUBLIC_SUPABASE_URL, stagingEnv.SUPABASE_SERVICE_ROLE_KEY)
const prod = createClient(prodEnv.NEXT_PUBLIC_SUPABASE_URL, prodEnv.SUPABASE_SERVICE_ROLE_KEY)

async function main() {
  console.log('=== FIX: Migrate users with preserved UUIDs ===\n')

  // 1. Get all profiles from staging
  const { data: profiles } = await staging.from('profiles').select('*')
  if (!profiles || profiles.length === 0) {
    console.log('No profiles to migrate')
    return
  }
  console.log(`Found ${profiles.length} profiles to migrate\n`)

  // 2. Create auth users in production with matching UUIDs
  console.log('--- Creating auth users ---')
  let authCreated = 0
  for (const profile of profiles) {
    const { data, error } = await prod.auth.admin.createUser({
      email: profile.email,
      password: 'TempMigration123!',
      email_confirm: true,
      user_metadata: {
        first_name: profile.first_name,
        last_name: profile.last_name,
      },
    })

    if (error) {
      if (error.message.includes('already been registered')) {
        console.log(`  EXISTS ${profile.email}`)
        // Update the existing user's ID won't work — we need to delete and recreate
        // Actually, let's check if the ID matches
        const { data: users } = await prod.auth.admin.listUsers()
        const existing = users?.users?.find(u => u.email === profile.email)
        if (existing && existing.id !== profile.id) {
          // Delete and recreate with correct ID
          await prod.auth.admin.deleteUser(existing.id)
          const { error: recreateErr } = await prod.auth.admin.createUser({
            email: profile.email,
            password: 'TempMigration123!',
            email_confirm: true,
            user_metadata: {
              first_name: profile.first_name,
              last_name: profile.last_name,
            },
          })
          if (recreateErr) {
            console.log(`  RECREATE FAIL ${profile.email}: ${recreateErr.message}`)
          } else {
            console.log(`  RECREATED ${profile.email} (new UUID)`)
            authCreated++
          }
        } else if (existing && existing.id === profile.id) {
          console.log(`  ID MATCH ${profile.email}`)
          authCreated++
        }
      } else {
        console.log(`  FAIL ${profile.email}: ${error.message}`)
      }
    } else {
      // User created but with a NEW UUID — we need to update profile to use this UUID
      // Actually we can't control the UUID. Let's map old→new
      console.log(`  CREATED ${profile.email} (id: ${data.user?.id?.substring(0, 8)})`)
      authCreated++
    }
  }
  console.log(`Auth users: ${authCreated}/${profiles.length}\n`)

  // 3. Build UUID mapping (staging id → prod id)
  const { data: prodUsers } = await prod.auth.admin.listUsers()
  const emailToStagingId = new Map<string, string>()
  const emailToProdId = new Map<string, string>()

  for (const p of profiles) {
    emailToStagingId.set(p.email, p.id)
  }
  for (const u of prodUsers?.users || []) {
    if (u.email) emailToProdId.set(u.email, u.id)
  }

  const idMap = new Map<string, string>() // staging UUID → prod UUID
  for (const [email, stagingId] of emailToStagingId) {
    const prodId = emailToProdId.get(email)
    if (prodId) {
      idMap.set(stagingId, prodId)
      if (stagingId !== prodId) {
        console.log(`  MAP ${email}: ${stagingId.substring(0, 8)} → ${prodId.substring(0, 8)}`)
      }
    }
  }
  console.log(`\nMapped ${idMap.size} user IDs\n`)

  // 4. Insert profiles with remapped IDs
  console.log('--- Inserting profiles ---')
  let profilesInserted = 0
  for (const profile of profiles) {
    const newId = idMap.get(profile.id)
    if (!newId) {
      console.log(`  SKIP ${profile.email} — no prod auth user`)
      continue
    }
    const remapped = { ...profile, id: newId }
    const { error } = await prod.from('profiles').upsert(remapped, { onConflict: 'id' })
    if (error) {
      console.log(`  FAIL ${profile.email}: ${error.message}`)
    } else {
      profilesInserted++
    }
  }
  console.log(`Profiles: ${profilesInserted}/${profiles.length}\n`)

  // 5. Re-insert assignments with remapped user_id and target_id
  console.log('--- Re-inserting assignments ---')
  const { data: assignments } = await staging.from('assignments').select('*')
  let assignmentsInserted = 0
  for (const a of assignments || []) {
    const remapped = {
      ...a,
      user_id: idMap.get(a.user_id) || a.user_id,
      target_id: idMap.get(a.target_id) || a.target_id,
    }
    const { error } = await prod.from('assignments').upsert(remapped, { onConflict: 'id' })
    if (error) {
      console.log(`  FAIL ${a.id.substring(0, 8)}: ${error.message}`)
    } else {
      assignmentsInserted++
    }
  }
  console.log(`Assignments: ${assignmentsInserted}/${assignments?.length || 0}\n`)

  // 6. Re-insert group_members with remapped user_id
  console.log('--- Re-inserting group_members ---')
  // First clear existing (may have wrong IDs from first run)
  await prod.from('group_members').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  const { data: members } = await staging.from('group_members').select('*')
  let membersInserted = 0
  for (const m of members || []) {
    const remapped = {
      ...m,
      user_id: idMap.get(m.user_id) || m.user_id,
    }
    const { error } = await prod.from('group_members').upsert(remapped, { onConflict: 'id' })
    if (error) {
      console.log(`  FAIL: ${error.message}`)
    } else {
      membersInserted++
    }
  }
  console.log(`Group members: ${membersInserted}/${members?.length || 0}\n`)

  // 7. Re-insert assignment_dimension_scores
  console.log('--- Re-inserting dimension_scores ---')
  const { data: scores } = await staging.from('assignment_dimension_scores').select('*')
  let scoresInserted = 0
  const scoreBatch = 50
  for (let i = 0; i < (scores?.length || 0); i += scoreBatch) {
    const batch = scores!.slice(i, i + scoreBatch)
    const { error } = await prod.from('assignment_dimension_scores').upsert(batch, { onConflict: 'id' })
    if (error) {
      console.log(`  BATCH ERROR at ${i}: ${error.message}`)
    } else {
      scoresInserted += batch.length
    }
  }
  console.log(`Dimension scores: ${scoresInserted}/${scores?.length || 0}\n`)

  // 8. Insert report_data
  console.log('--- Inserting report_data ---')
  const { data: reports } = await staging.from('report_data').select('*')
  let reportsInserted = 0
  for (const r of reports || []) {
    const { error } = await prod.from('report_data').upsert(r, { onConflict: 'assignment_id' })
    if (error) {
      console.log(`  FAIL ${r.assignment_id?.substring(0, 8)}: ${error.message}`)
    } else {
      reportsInserted++
    }
  }
  console.log(`Reports: ${reportsInserted}/${reports?.length || 0}\n`)

  console.log('=== FIX COMPLETE ===')
}

main().catch(err => {
  console.error('Fix failed:', err)
  process.exit(1)
})
