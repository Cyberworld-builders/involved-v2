// Simple test to verify if user profiles are being created
// Run this with: node test-trigger.js

const { createClient } = require('@supabase/supabase-js')

// You'll need to set these environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Missing Supabase environment variables')
  console.log('Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testUserProfiles() {
  console.log('🔍 Checking if user profiles exist...')
  
  try {
    // Get all users from our custom users table
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)

    if (error) {
      console.log('❌ Error fetching users:', error.message)
      return
    }

    console.log(`📊 Found ${users.length} user profiles:`)
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.email}) - Created: ${user.created_at}`)
    })

    if (users.length === 0) {
      console.log('⚠️  No user profiles found. This could mean:')
      console.log('   - No users have signed up yet')
      console.log('   - The trigger is not working')
      console.log('   - Users table doesn\'t exist')
    } else {
      console.log('✅ User profiles are being created successfully!')
    }

  } catch (error) {
    console.log('❌ Test failed:', error.message)
  }
}

testUserProfiles()
