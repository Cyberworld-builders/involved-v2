// Script to check answers in the database
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function checkAnswers() {
  console.log('Checking answers table...\n')

  // Get all answers
  const { data: answers, error: answersError } = await adminClient
    .from('answers')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20)

  if (answersError) {
    console.error('Error fetching answers:', answersError)
    return
  }

  console.log(`Found ${answers?.length || 0} answers (showing latest 20):\n`)
  
  if (!answers || answers.length === 0) {
    console.log('No answers found in database.')
  } else {
    answers.forEach((answer, index) => {
      console.log(`${index + 1}. Answer ID: ${answer.id}`)
      console.log(`   Assignment ID: ${answer.assignment_id}`)
      console.log(`   Field ID: ${answer.field_id}`)
      console.log(`   User ID: ${answer.user_id}`)
      console.log(`   Value: ${answer.value}`)
      console.log(`   Created: ${answer.created_at}`)
      console.log('')
    })
  }

  // Get assignments count
  const { data: assignments, error: assignmentsError } = await adminClient
    .from('assignments')
    .select('id, completed, completed_at')
    .eq('completed', true)
    .order('completed_at', { ascending: false })
    .limit(10)

  if (!assignmentsError && assignments) {
    console.log(`\nFound ${assignments.length} completed assignments (showing latest 10):\n`)
    assignments.forEach((assignment, index) => {
      console.log(`${index + 1}. Assignment ID: ${assignment.id}`)
      console.log(`   Completed: ${assignment.completed}`)
      console.log(`   Completed At: ${assignment.completed_at}`)
      
      // Check if this assignment has answers
      adminClient
        .from('answers')
        .select('id')
        .eq('assignment_id', assignment.id)
        .then(({ data: assignmentAnswers }) => {
          console.log(`   Answers: ${assignmentAnswers?.length || 0}`)
        })
    })
  }

  // Get total counts
  const { count: totalAnswers } = await adminClient
    .from('answers')
    .select('*', { count: 'exact', head: true })

  const { count: totalCompletedAssignments } = await adminClient
    .from('assignments')
    .select('*', { count: 'exact', head: true })
    .eq('completed', true)

  console.log(`\n\nSummary:`)
  console.log(`Total answers in database: ${totalAnswers || 0}`)
  console.log(`Total completed assignments: ${totalCompletedAssignments || 0}`)
}

checkAnswers().catch(console.error)
