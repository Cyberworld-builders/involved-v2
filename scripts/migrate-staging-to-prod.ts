/**
 * Migrate all data and storage from staging to production Supabase.
 *
 * Usage: npx tsx scripts/migrate-staging-to-prod.ts
 *        npx tsx scripts/migrate-staging-to-prod.ts --dry-run
 *
 * Reads credentials from .env.staging and .env.production
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

const DRY_RUN = process.argv.includes('--dry-run')

// Load staging env
const stagingEnv: Record<string, string> = {}
for (const line of fs.readFileSync(path.resolve('.env.staging'), 'utf-8').split('\n')) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue
  const [key, ...rest] = trimmed.split('=')
  stagingEnv[key.trim()] = rest.join('=').trim().replace(/^["']|["']$/g, '')
}

// Load production env
const prodEnv: Record<string, string> = {}
for (const line of fs.readFileSync(path.resolve('.env.production'), 'utf-8').split('\n')) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue
  const [key, ...rest] = trimmed.split('=')
  prodEnv[key.trim()] = rest.join('=').trim().replace(/^["']|["']$/g, '')
}

const staging = createClient(stagingEnv.NEXT_PUBLIC_SUPABASE_URL, stagingEnv.SUPABASE_SERVICE_ROLE_KEY)
const prod = createClient(prodEnv.NEXT_PUBLIC_SUPABASE_URL, prodEnv.SUPABASE_SERVICE_ROLE_KEY)

// Tables in dependency order (parents before children)
const TABLES = [
  'industries',
  'clients',
  'assessments',
  'dimensions',
  'fields',
  'groups',
  'surveys',
  'feedback',
  'resources',
  'report_templates',
  // profiles are created via auth, handle separately
  'industry_benchmarks',
  'group_members',
  'assignments',
  'assignment_answers',
  'assignment_dimension_scores',
  'report_data',
  'email_logs',
]

const STORAGE_BUCKETS = [
  'client-assets',
  'assessment-assets',
  'resources-videos',
  'reports-pdf',
]

async function migrateTable(table: string) {
  console.log(`\n--- ${table} ---`)

  // Fetch all rows from staging
  const { data, error } = await staging.from(table).select('*')
  if (error) {
    console.log(`  SKIP: ${error.message}`)
    return 0
  }
  if (!data || data.length === 0) {
    console.log(`  SKIP: 0 rows`)
    return 0
  }

  console.log(`  Found ${data.length} rows in staging`)

  if (DRY_RUN) {
    console.log(`  DRY RUN: would insert ${data.length} rows`)
    return data.length
  }

  // Insert in batches of 50
  let inserted = 0
  const batchSize = 50
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize)
    const { error: insertError } = await prod.from(table).upsert(batch, { onConflict: 'id' })
    if (insertError) {
      console.log(`  ERROR at batch ${i}: ${insertError.message}`)
      // Try one by one for this batch
      for (const row of batch) {
        const { error: singleError } = await prod.from(table).upsert(row, { onConflict: 'id' })
        if (singleError) {
          console.log(`  FAIL row ${(row as Record<string, unknown>).id}: ${singleError.message}`)
        } else {
          inserted++
        }
      }
    } else {
      inserted += batch.length
    }
  }

  console.log(`  Inserted ${inserted}/${data.length}`)
  return inserted
}

async function migrateProfiles() {
  console.log('\n--- profiles (special handling) ---')

  const { data, error } = await staging.from('profiles').select('*')
  if (error || !data || data.length === 0) {
    console.log(`  SKIP: ${error?.message || '0 rows'}`)
    return 0
  }

  console.log(`  Found ${data.length} profiles in staging`)

  if (DRY_RUN) {
    console.log(`  DRY RUN: would upsert ${data.length} profiles`)
    return data.length
  }

  // Profiles reference auth.users via id. We need to create auth users first
  // or just insert profiles if auth users already exist.
  // For migration: upsert profiles, skip auth user creation (they'll need to reset passwords)
  let inserted = 0
  for (const profile of data) {
    // First try to create the auth user
    const { error: authError } = await prod.auth.admin.createUser({
      email: profile.email,
      password: 'TempPassword123!', // They'll need to reset
      email_confirm: true,
      user_metadata: {
        first_name: profile.first_name,
        last_name: profile.last_name,
      },
    })

    if (authError && !authError.message.includes('already been registered')) {
      // Try updating instead
      const { error: updateError } = await prod.auth.admin.updateUserById(profile.id, {
        email: profile.email,
      })
      if (updateError) {
        console.log(`  AUTH SKIP ${profile.email}: ${authError.message}`)
      }
    }

    // Upsert profile
    const { error: profileError } = await prod.from('profiles').upsert(profile, { onConflict: 'id' })
    if (profileError) {
      console.log(`  PROFILE FAIL ${profile.email}: ${profileError.message}`)
    } else {
      inserted++
    }
  }

  console.log(`  Migrated ${inserted}/${data.length} profiles`)
  return inserted
}

async function migrateStorage(bucket: string) {
  console.log(`\n--- storage: ${bucket} ---`)

  // List all files in staging bucket
  const { data: files, error } = await staging.storage.from(bucket).list('', { limit: 1000 })
  if (error) {
    console.log(`  SKIP: ${error.message}`)
    return 0
  }

  // Flatten — handle folders
  const allFiles: string[] = []

  async function listRecursive(prefix: string) {
    const { data: items } = await staging.storage.from(bucket).list(prefix, { limit: 1000 })
    for (const item of items || []) {
      const fullPath = prefix ? `${prefix}/${item.name}` : item.name
      if (item.id) {
        // It's a file
        allFiles.push(fullPath)
      } else {
        // It's a folder
        await listRecursive(fullPath)
      }
    }
  }

  await listRecursive('')
  console.log(`  Found ${allFiles.length} files`)

  if (DRY_RUN) {
    for (const f of allFiles) console.log(`    ${f}`)
    return allFiles.length
  }

  let copied = 0
  for (const filePath of allFiles) {
    try {
      // Download from staging
      const { data: fileData, error: dlError } = await staging.storage.from(bucket).download(filePath)
      if (dlError || !fileData) {
        console.log(`  DL FAIL ${filePath}: ${dlError?.message}`)
        continue
      }

      // Upload to production
      const buffer = Buffer.from(await fileData.arrayBuffer())
      const { error: ulError } = await prod.storage.from(bucket).upload(filePath, buffer, {
        upsert: true,
        contentType: fileData.type,
      })
      if (ulError) {
        console.log(`  UL FAIL ${filePath}: ${ulError.message}`)
      } else {
        copied++
      }
    } catch (err) {
      console.log(`  ERROR ${filePath}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  console.log(`  Copied ${copied}/${allFiles.length} files`)
  return copied
}

async function main() {
  console.log(`========================================`)
  console.log(`  STAGING → PRODUCTION MIGRATION`)
  console.log(`  ${DRY_RUN ? '🔍 DRY RUN' : '🚀 LIVE'}`)
  console.log(`========================================`)
  console.log(`Staging:    ${stagingEnv.NEXT_PUBLIC_SUPABASE_URL}`)
  console.log(`Production: ${prodEnv.NEXT_PUBLIC_SUPABASE_URL}`)
  console.log()

  // Migrate profiles first (creates auth users)
  await migrateProfiles()

  // Migrate tables in dependency order
  for (const table of TABLES) {
    await migrateTable(table)
  }

  // Migrate storage
  for (const bucket of STORAGE_BUCKETS) {
    await migrateStorage(bucket)
  }

  console.log('\n========================================')
  console.log('  MIGRATION COMPLETE')
  console.log('========================================')
}

main().catch(err => {
  console.error('Migration failed:', err)
  process.exit(1)
})
