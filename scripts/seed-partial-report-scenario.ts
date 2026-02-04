/**
 * Seed a partial 360 report scenario (zero completed raters) for local testing.
 *
 * Creates or reuses a 360 assignment + group with no completed responses, then
 * prints the report URL so you can open dashboard/fullscreen and test PDF export
 * without deploying.
 *
 * Prerequisites:
 * - Run seed-360-demo first so client, 360 assessment, groups, and users exist.
 * - Or run against a DB that already has a 360 assessment and a group with target_id set.
 *
 * Usage: npx tsx scripts/seed-partial-report-scenario.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function main() {
  console.log('Seeding partial 360 report scenario (zero completed raters)...\n')

  // 1. Find a 360 assessment
  const { data: assessment360, error: assessError } = await supabase
    .from('assessments')
    .select('id, title')
    .eq('is_360', true)
    .limit(1)
    .maybeSingle()

  if (assessError || !assessment360) {
    console.error('No 360 assessment found. Run seed-360-demo first: npx tsx scripts/seed-360-demo.ts')
    process.exit(1)
  }

  // 2. Find a group that has target_id set (required for 360)
  const { data: groups, error: groupError } = await supabase
    .from('groups')
    .select('id, name, target_id')
    .not('target_id', 'is', null)
    .limit(5)

  if (groupError || !groups?.length) {
    console.error('No groups with target_id found. Run seed-360-demo first.')
    process.exit(1)
  }

  // 3. Get group members for the first group
  const group = groups[0]
  const { data: members, error: membersError } = await supabase
    .from('group_members')
    .select('profile_id, position')
    .eq('group_id', group.id)

  if (membersError || !members?.length) {
    console.error('No members in group. Run seed-360-demo first.')
    process.exit(1)
  }

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 30)
  const expires = expiresAt.toISOString()

  // 4. Ensure assignments exist for each member, all with completed=false
  let reportAssignmentId: string | null = null

  for (const member of members) {
    const { data: existing } = await supabase
      .from('assignments')
      .select('id, completed')
      .eq('user_id', member.profile_id)
      .eq('assessment_id', assessment360.id)
      .eq('target_id', group.target_id)
      .eq('group_id', group.id)
      .maybeSingle()

    if (existing) {
      if (existing.completed) {
        await supabase
          .from('assignments')
          .update({ completed: false, completed_at: null })
          .eq('id', existing.id)
      }
      if (!reportAssignmentId) reportAssignmentId = existing.id
    } else {
      const { data: inserted, error: insertErr } = await supabase
        .from('assignments')
        .insert({
          user_id: member.profile_id,
          assessment_id: assessment360.id,
          target_id: group.target_id,
          group_id: group.id,
          expires,
          completed: false,
        })
        .select('id')
        .single()

      if (insertErr) {
        console.error('Failed to create assignment:', insertErr)
        process.exit(1)
      }
      if (!reportAssignmentId) reportAssignmentId = inserted.id
    }
  }

  if (!reportAssignmentId) {
    console.error('No assignment id for report URL.')
    process.exit(1)
  }

  console.log('Partial report scenario ready.\n')
  console.log('Report URLs (zero completed raters; partial report):')
  console.log(`  Dashboard:  ${appUrl}/dashboard/reports/${reportAssignmentId}`)
  console.log(`  Fullscreen: ${appUrl}/reports/${reportAssignmentId}/view`)
  console.log('\nOpen the dashboard URL while logged in, then try fullscreen and PDF export.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
