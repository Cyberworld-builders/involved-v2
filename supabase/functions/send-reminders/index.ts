import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ReminderAssignment {
  id: string
  user_id: string
  assessment_id: string
  reminder_frequency: string
  user: {
    id: string
    name: string
    email: string
    username: string
  }
  assessment: {
    id: string
    title: string
  }
}

/**
 * Calculate next reminder date from frequency string
 */
function calculateNextReminder(now: Date, frequency: string): Date {
  const next = new Date(now)
  
  // Parse frequency string like "+1 day", "+2 days", "+1 week", "+2 weeks", "+1 month", etc.
  if (frequency === '+1 day') {
    next.setDate(next.getDate() + 1)
  } else if (frequency === '+2 days') {
    next.setDate(next.getDate() + 2)
  } else if (frequency === '+3 days') {
    next.setDate(next.getDate() + 3)
  } else if (frequency === '+4 days') {
    next.setDate(next.getDate() + 4)
  } else if (frequency === '+5 days') {
    next.setDate(next.getDate() + 5)
  } else if (frequency === '+6 days') {
    next.setDate(next.getDate() + 6)
  } else if (frequency === '+1 week') {
    next.setDate(next.getDate() + 7)
  } else if (frequency === '+2 weeks') {
    next.setDate(next.getDate() + 14)
  } else if (frequency === '+3 weeks') {
    next.setDate(next.getDate() + 21)
  } else if (frequency === '+1 month') {
    next.setMonth(next.getMonth() + 1)
  } else if (frequency === '+2 months') {
    next.setMonth(next.getMonth() + 2)
  } else if (frequency === '+3 months') {
    next.setMonth(next.getMonth() + 3)
  } else {
    // Default to 1 week if unknown frequency
    console.warn(`Unknown reminder frequency: ${frequency}, defaulting to 1 week`)
    next.setDate(next.getDate() + 7)
  }
  
  return next
}


serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const baseUrl = Deno.env.get('BASE_URL') || supabaseUrl.replace('.supabase.co', '') // Fallback
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    }

    // Initialize Supabase admin client
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get current time and tomorrow (to catch reminders due today)
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)

    console.log(`🔍 Checking for reminders due between ${now.toISOString()} and ${tomorrow.toISOString()}`)

    // Query assignments due for reminders
    const { data: assignments, error: queryError } = await supabase
      .from('assignments')
      .select(`
        id,
        user_id,
        assessment_id,
        reminder_frequency,
        url,
        user:profiles!assignments_user_id_fkey(id, name, email, username),
        assessment:assessments!assignments_assessment_id_fkey(id, title)
      `)
      .eq('reminder', true)
      .eq('completed', false)
      .not('next_reminder', 'is', null)
      .gte('next_reminder', now.toISOString())
      .lt('next_reminder', tomorrow.toISOString())

    if (queryError) {
      console.error('❌ Error querying assignments:', queryError)
      return new Response(
        JSON.stringify({ error: queryError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!assignments || assignments.length === 0) {
      console.log('✅ No reminders to send')
      return new Response(
        JSON.stringify({ message: 'No reminders to send', count: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`📧 Found ${assignments.length} assignment(s) due for reminders`)

    // Process each assignment
    const results = {
      sent: 0,
      failed: 0,
      errors: [] as string[],
    }

    for (const assignment of assignments as ReminderAssignment[]) {
      try {
        // Calculate next reminder date
        const nextReminder = calculateNextReminder(
          new Date(),
          assignment.reminder_frequency
        )

        // Use existing assignment URL if available, otherwise use simple URL
        // The URL should already be generated and stored when assignment is created
        const assignmentUrl = assignment.url || `${baseUrl}/assignment/${assignment.id}`

        // Send reminder email via the email API
        const emailResponse = await fetch(
          `${supabaseUrl}/functions/v1/send-reminder-email`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              assignment_id: assignment.id,
              user_email: assignment.user.email,
              user_name: assignment.user.name,
              user_username: assignment.user.username,
              assessment_title: assignment.assessment.title,
              assignment_url: assignmentUrl,
              reminder_frequency: assignment.reminder_frequency,
            }),
          }
        )

        if (!emailResponse.ok) {
          const errorData = await emailResponse.json().catch(() => ({ error: 'Unknown error' }))
          throw new Error(`Email send failed: ${errorData.error || emailResponse.statusText}`)
        }

        // Update next_reminder in database
        const { error: updateError } = await supabase
          .from('assignments')
          .update({ next_reminder: nextReminder.toISOString() })
          .eq('id', assignment.id)

        if (updateError) {
          throw new Error(`Update failed: ${updateError.message}`)
        }

        results.sent++
        console.log(`✅ Sent reminder for assignment ${assignment.id} (${assignment.user.email})`)
      } catch (error) {
        results.failed++
        const errorMsg = `Assignment ${assignment.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
        results.errors.push(errorMsg)
        console.error(`❌ ${errorMsg}`)
      }
    }

    const response = {
      message: `Processed ${assignments.length} reminder(s)`,
      timestamp: now.toISOString(),
      ...results,
    }

    console.log(`📊 Reminder processing complete:`, response)

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('❌ Unexpected error:', error)
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

