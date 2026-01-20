/**
 * Comprehensive 360 Survey Demo Seeder
 * 
 * This script creates:
 * - A demo client
 * - A 360 assessment with 30 questions across 9 dimensions
 * - Industry benchmarks for all dimensions
 * - A group of 5 users (supervisor, self/target, 3 subordinates)
 * - Assignments for all users to complete the assessment
 * - Completed answers for all assignments
 * 
 * Run with: npx tsx scripts/seed-360-demo.ts
 */


import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:')
  console.error('  NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗')
  console.error('  SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Dimensions for the 360 assessment
const DIMENSIONS = [
  { name: 'Communication', code: 'COMM' },
  { name: 'Leadership', code: 'LEAD' },
  { name: 'Teamwork', code: 'TEAM' },
  { name: 'Problem Solving', code: 'PROB' },
  { name: 'Adaptability', code: 'ADAP' },
  { name: 'Innovation', code: 'INNO' },
  { name: 'Accountability', code: 'ACCT' },
  { name: 'Strategic Thinking', code: 'STRAT' },
  { name: 'Emotional Intelligence', code: 'EI' },
]

// Questions per dimension (30 total questions, ~3-4 per dimension)
const QUESTIONS_PER_DIMENSION = [
  [1, 2, 3, 4],      // Communication (4 questions)
  [5, 6, 7],         // Leadership (3 questions)
  [8, 9, 10, 11],    // Teamwork (4 questions)
  [12, 13, 14],      // Problem Solving (3 questions)
  [15, 16, 17],      // Adaptability (3 questions)
  [18, 19, 20],      // Innovation (3 questions)
  [21, 22, 23],      // Accountability (3 questions)
  [24, 25, 26],      // Strategic Thinking (3 questions)
  [27, 28, 29, 30],  // Emotional Intelligence (4 questions)
]

// Sample questions with descriptions
const QUESTION_TEMPLATES = [
  {
    text: 'How effectively does this person communicate their ideas and thoughts?',
    description: 'Consider clarity, conciseness, and the ability to convey complex information in an understandable way.',
  },
  {
    text: 'How well does this person listen to others and respond appropriately?',
    description: 'Evaluate active listening skills, empathy, and the ability to understand different perspectives.',
  },
  {
    text: 'How effectively does this person provide feedback to colleagues?',
    description: 'Assess the quality, timeliness, and constructive nature of feedback provided.',
  },
  {
    text: 'How well does this person adapt their communication style to different audiences?',
    description: 'Consider the ability to adjust tone, format, and content based on the audience.',
  },
  {
    text: 'How effectively does this person inspire and motivate their team?',
    description: 'Evaluate the ability to create enthusiasm, set a positive tone, and drive team performance.',
  },
  {
    text: 'How well does this person make difficult decisions?',
    description: 'Assess decision-making quality, timeliness, and the ability to balance competing priorities.',
  },
  {
    text: 'How effectively does this person delegate tasks and responsibilities?',
    description: 'Consider the ability to assign appropriate work, provide clear instructions, and trust team members.',
  },
  {
    text: 'How well does this person collaborate with team members?',
    description: 'Evaluate cooperation, willingness to share information, and contribution to team goals.',
  },
  {
    text: 'How effectively does this person resolve conflicts within the team?',
    description: 'Assess mediation skills, fairness, and the ability to find mutually beneficial solutions.',
  },
  {
    text: 'How well does this person support and help colleagues when needed?',
    description: 'Consider availability, helpfulness, and willingness to go above and beyond for team members.',
  },
  {
    text: 'How effectively does this person contribute to team meetings and discussions?',
    description: 'Evaluate participation quality, idea generation, and constructive input during team activities.',
  },
  {
    text: 'How well does this person identify and analyze problems?',
    description: 'Assess the ability to recognize issues, gather relevant information, and understand root causes.',
  },
  {
    text: 'How effectively does this person develop solutions to complex problems?',
    description: 'Evaluate creativity, analytical thinking, and the quality of proposed solutions.',
  },
  {
    text: 'How well does this person implement solutions and follow through?',
    description: 'Consider execution capability, persistence, and the ability to overcome obstacles.',
  },
  {
    text: 'How effectively does this person adapt to changing circumstances?',
    description: 'Evaluate flexibility, resilience, and the ability to adjust plans when needed.',
  },
  {
    text: 'How well does this person handle ambiguity and uncertainty?',
    description: 'Assess comfort with unclear situations and the ability to make progress despite incomplete information.',
  },
  {
    text: 'How effectively does this person learn from new experiences?',
    description: 'Consider openness to feedback, willingness to try new approaches, and continuous improvement mindset.',
  },
  {
    text: 'How well does this person generate new and creative ideas?',
    description: 'Evaluate originality, creativity, and the ability to think outside the box.',
  },
  {
    text: 'How effectively does this person implement innovative solutions?',
    description: 'Assess the ability to turn creative ideas into practical, actionable solutions.',
  },
  {
    text: 'How well does this person encourage innovation in others?',
    description: 'Consider the ability to create an environment that supports and rewards creative thinking.',
  },
  {
    text: 'How effectively does this person take responsibility for their actions?',
    description: 'Evaluate ownership of outcomes, both positive and negative, and accountability.',
  },
  {
    text: 'How well does this person follow through on commitments?',
    description: 'Assess reliability, dependability, and the ability to deliver on promises.',
  },
  {
    text: 'How effectively does this person hold themselves to high standards?',
    description: 'Consider self-discipline, attention to detail, and commitment to quality work.',
  },
  {
    text: 'How well does this person think strategically about long-term goals?',
    description: 'Evaluate the ability to see the big picture, plan ahead, and consider future implications.',
  },
  {
    text: 'How effectively does this person align actions with organizational strategy?',
    description: 'Assess understanding of strategic priorities and the ability to connect daily work to broader goals.',
  },
  {
    text: 'How well does this person anticipate future challenges and opportunities?',
    description: 'Consider forward-thinking ability, trend recognition, and proactive planning.',
  },
  {
    text: 'How effectively does this person recognize and manage their own emotions?',
    description: 'Evaluate self-awareness, emotional regulation, and the ability to stay composed under pressure.',
  },
  {
    text: 'How well does this person understand and respond to others\' emotions?',
    description: 'Assess empathy, social awareness, and the ability to read emotional cues.',
  },
  {
    text: 'How effectively does this person build and maintain relationships?',
    description: 'Consider interpersonal skills, trust-building, and the ability to connect with diverse individuals.',
  },
  {
    text: 'How well does this person handle stress and pressure?',
    description: 'Evaluate resilience, composure, and the ability to maintain performance under challenging conditions.',
  },
]

// Multiple choice anchors (5-point scale)
const ANCHORS = [
  { id: '1', name: 'Below Expectations', value: 1, practice: false },
  { id: '2', name: 'Partially Meets Expectations', value: 2, practice: false },
  { id: '3', name: 'Meets Expectations', value: 3, practice: false },
  { id: '4', name: 'Exceeds Expectations', value: 4, practice: false },
  { id: '5', name: 'Significantly Exceeds Expectations', value: 5, practice: false },
]

// Anchor insights (one row per anchor)
const ANCHOR_INSIGHTS = [
  ['This person consistently falls short of expected performance standards in this area.'],
  ['This person shows some capability but needs significant development to meet expectations.'],
  ['This person demonstrates solid performance that aligns with role expectations.'],
  ['This person consistently performs above expectations and adds significant value.'],
  ['This person demonstrates exceptional performance that serves as a model for others.'],
]

// Sample text feedback responses
const TEXT_FEEDBACK_RESPONSES = [
  'This person demonstrates strong communication skills and is always clear and concise.',
  'I appreciate their willingness to help others and contribute to team success.',
  'They could improve their time management and prioritization skills.',
  'Excellent leadership qualities and ability to inspire the team.',
  'Sometimes struggles with giving constructive feedback but is working on it.',
  'Very reliable and always follows through on commitments.',
  'Great problem-solving abilities and creative thinking.',
  'Could benefit from more strategic thinking and long-term planning.',
  'Shows strong emotional intelligence and empathy in interactions.',
  'Needs to work on adapting to change and handling ambiguity.',
]

// Industry benchmark values (on 5-point scale)
const INDUSTRY_BENCHMARKS = [3.2, 3.4, 3.3, 3.1, 3.0, 3.2, 3.3, 3.5, 3.4]

// User data
const USERS = [
  { name: 'Sarah Johnson', email: 'sarah.johnson@demo.com', username: 'sjohnson', position: 'Supervisor', leader: true },
  { name: 'Michael Chen', email: 'michael.chen@demo.com', username: 'mchen', position: null, leader: false }, // Target/Self
  { name: 'Emily Rodriguez', email: 'emily.rodriguez@demo.com', username: 'erodriguez', position: 'Subordinate', leader: false },
  { name: 'David Kim', email: 'david.kim@demo.com', username: 'dkim', position: 'Subordinate', leader: false },
  { name: 'Jessica Williams', email: 'jessica.williams@demo.com', username: 'jwilliams', position: 'Subordinate', leader: false },
]

async function main() {
  console.log('🌱 Starting 360 Survey Demo Seeder...\n')

  try {
    // Step 1: Create or get demo client
    console.log('📋 Step 1: Creating demo client...')
    // eslint-disable-next-line prefer-const
    let { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id')
      .eq('name', 'Demo Client - 360 Survey')
      .single()

    if (clientError && clientError.code !== 'PGRST116') {
      throw clientError
    }

    if (!client) {
      const { data: newClient, error: createError } = await supabase
        .from('clients')
        .insert({
          name: 'Demo Client - 360 Survey',
        })
        .select('id')
        .single()

      if (createError) throw createError
      client = newClient
      console.log('  ✓ Created new demo client')
    } else {
      console.log('  ✓ Using existing demo client')
    }

    const clientId = client.id

    // Step 2: Create or get industry
    console.log('\n📋 Step 2: Creating industry...')
    // eslint-disable-next-line prefer-const
    let { data: industry, error: industryError } = await supabase
      .from('industries')
      .select('id')
      .eq('name', 'Technology')
      .single()

    if (industryError && industryError.code !== 'PGRST116') {
      throw industryError
    }

    if (!industry) {
      const { data: newIndustry, error: createError } = await supabase
        .from('industries')
        .insert({ name: 'Technology' })
        .select('id')
        .single()

      if (createError) throw createError
      industry = newIndustry
      console.log('  ✓ Created new industry')
    } else {
      console.log('  ✓ Using existing industry')
    }

    const industryId = industry.id

    // Step 3: Create admin user (if needed) or get existing
    console.log('\n📋 Step 3: Setting up admin user...')
    const { data: { users: authUsers } } = await supabase.auth.admin.listUsers()
    let adminUser = authUsers.find(u => u.email === 'admin@demo.com')

    if (!adminUser) {
      const { data: newAdmin, error: createError } = await supabase.auth.admin.createUser({
        email: 'admin@demo.com',
        password: 'DemoAdmin123!',
        email_confirm: true,
      })
      if (createError) throw createError
      adminUser = newAdmin.user
      console.log('  ✓ Created admin auth user')
    } else {
      console.log('  ✓ Using existing admin auth user')
    }

    // Create or update admin profile
    // eslint-disable-next-line prefer-const
    let { data: adminProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('auth_user_id', adminUser.id)
      .single()

    if (profileError && profileError.code !== 'PGRST116') {
      throw profileError
    }

    if (!adminProfile) {
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          auth_user_id: adminUser.id,
          email: 'admin@demo.com',
          name: 'Demo Admin',
          username: 'admin',
          client_id: clientId,
          role: 'admin',
          access_level: 'super_admin',
        })
        .select('id')
        .single()

      if (createError) throw createError
      adminProfile = newProfile
      console.log('  ✓ Created admin profile')
    } else {
      await supabase
        .from('profiles')
        .update({ client_id: clientId })
        .eq('id', adminProfile.id)
      console.log('  ✓ Updated admin profile')
    }

    // Step 4: Create demo users
    console.log('\n📋 Step 4: Creating demo users...')
    const userIds: string[] = []

    for (const userData of USERS) {
      // Check if profile exists by email
      const { data: existingProfile, error: lookupError } = await supabase
        .from('profiles')
        .select('id, auth_user_id')
        .eq('email', userData.email)
        .maybeSingle()

      if (lookupError && lookupError.code !== 'PGRST116') {
        throw lookupError
      }

      let userProfileId: string
      if (!existingProfile) {
        // Check if auth user exists first
        const { data: { users: authUsers } } = await supabase.auth.admin.listUsers()
        let authUser = authUsers.find(u => u.email === userData.email)

        if (!authUser) {
          // Create auth user (trigger will automatically create profile)
          const { data: newAuthUser, error: authError } = await supabase.auth.admin.createUser({
            email: userData.email,
            password: 'DemoUser123!',
            email_confirm: true,
          })
          if (authError) throw authError
          authUser = newAuthUser.user
          
          // Wait a moment for trigger to create profile
          await new Promise(resolve => setTimeout(resolve, 500))
        }

        // Check if profile was created by trigger (or already exists)
        const { data: triggerProfile, error: triggerError } = await supabase
          .from('profiles')
          .select('id')
          .eq('auth_user_id', authUser.id)
          .maybeSingle()

        if (triggerError && triggerError.code !== 'PGRST116') {
          throw triggerError
        }

        if (triggerProfile) {
          // Profile exists (created by trigger or previously), update it
          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              email: userData.email,
              name: userData.name,
              username: userData.username,
              client_id: clientId,
              industry_id: industryId,
              role: 'user',
              access_level: 'member',
            })
            .eq('id', triggerProfile.id)

          if (updateError) throw updateError
          userProfileId = triggerProfile.id
          console.log(`  ✓ Created/updated user: ${userData.name}`)
        } else {
          // Profile wasn't created by trigger, create it manually
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .insert({
              auth_user_id: authUser.id,
              email: userData.email,
              name: userData.name,
              username: userData.username,
              client_id: clientId,
              industry_id: industryId,
              role: 'user',
              access_level: 'member',
            })
            .select('id')
            .single()

          if (profileError) {
            // If it's a duplicate key error, the profile was created between our check and insert
            if (profileError.code === '23505') {
              // Fetch the existing profile
              const { data: existingByAuth, error: fetchError } = await supabase
                .from('profiles')
                .select('id')
                .eq('auth_user_id', authUser.id)
                .single()

              if (fetchError) throw fetchError
              userProfileId = existingByAuth.id
              
              // Update the existing profile
              await supabase
                .from('profiles')
                .update({
                  email: userData.email,
                  name: userData.name,
                  username: userData.username,
                  client_id: clientId,
                  industry_id: industryId,
                  role: 'user',
                  access_level: 'member',
                })
                .eq('id', userProfileId)
              
              console.log(`  ✓ Found and updated existing user: ${userData.name}`)
            } else {
              throw profileError
            }
          } else {
            userProfileId = profile.id
            console.log(`  ✓ Created user: ${userData.name}`)
          }
        }
      } else {
        // Update existing user to ensure they're in the right client
        await supabase
          .from('profiles')
          .update({ client_id: clientId, industry_id: industryId })
          .eq('id', existingProfile.id)
        userProfileId = existingProfile.id
        console.log(`  ✓ Using existing user: ${userData.name}`)
      }

      userIds.push(userProfileId)
    }

    const [supervisorId, targetId] = userIds

    // Step 5: Create 360 assessment
    console.log('\n📋 Step 5: Creating 360 assessment...')
    const { data: assessment, error: assessmentError } = await supabase
      .from('assessments')
      .insert({
        title: '360-Degree Leadership Assessment - Demo',
        description: 'Comprehensive 360-degree assessment covering 9 key leadership dimensions with 30 questions.',
        type: '360',
        is_360: true,
        status: 'active',
        created_by: adminUser.id,
        use_custom_fields: true,
        custom_fields: {
          type: ['name', 'email', 'position'],
          default: ['', '', ''],
        },
      })
      .select('id')
      .single()

    if (assessmentError) throw assessmentError
    console.log('  ✓ Created assessment')
    const assessmentId = assessment.id

    // Step 6: Create dimensions
    console.log('\n📋 Step 6: Creating dimensions...')
    const dimensionIds: string[] = []

    for (const dim of DIMENSIONS) {
      const { data: dimension, error: dimError } = await supabase
        .from('dimensions')
        .insert({
          assessment_id: assessmentId,
          name: dim.name,
          code: dim.code,
        })
        .select('id')
        .single()

      if (dimError) throw dimError
      dimensionIds.push(dimension.id)
      console.log(`  ✓ Created dimension: ${dim.name}`)
    }

    // Step 7: Create industry benchmarks
    console.log('\n📋 Step 7: Creating industry benchmarks...')
    for (let i = 0; i < dimensionIds.length; i++) {
      const { error: benchError } = await supabase
        .from('benchmarks')
        .upsert({
          dimension_id: dimensionIds[i],
          industry_id: industryId,
          value: INDUSTRY_BENCHMARKS[i],
        }, {
          onConflict: 'dimension_id,industry_id',
        })

      if (benchError) throw benchError
    }
    console.log('  ✓ Created industry benchmarks for all dimensions')

    // Step 8: Create fields (questions)
    console.log('\n📋 Step 8: Creating questions...')
    const fieldIds: string[] = [] // Multiple choice field IDs
    const textFieldIds: string[] = [] // Text input field IDs
    let order = 1

    for (let dimIndex = 0; dimIndex < DIMENSIONS.length; dimIndex++) {
      const dimensionId = dimensionIds[dimIndex]
      const questionNumbers = QUESTIONS_PER_DIMENSION[dimIndex]

      for (let qIndex = 0; qIndex < questionNumbers.length; qIndex++) {
        const questionNum = questionNumbers[qIndex]
        const template = QUESTION_TEMPLATES[questionNum - 1]

        // Description field
        const { error: descError } = await supabase
          .from('fields')
          .insert({
            assessment_id: assessmentId,
            dimension_id: dimensionId,
            type: 'rich_text',
            content: template.description,
            order: order++,
            number: order - 1,
            required: false,
          })

        if (descError) throw descError

        // Multiple choice question
        const { data: mcField, error: mcError } = await supabase
          .from('fields')
          .insert({
            assessment_id: assessmentId,
            dimension_id: dimensionId,
            type: 'multiple_choice',
            content: template.text,
            order: order++,
            number: order - 1,
            required: true,
            anchors: ANCHORS,
            insights_table: [ANCHOR_INSIGHTS],
          })
          .select('id')
          .single()

        if (mcError) throw mcError
        fieldIds.push(mcField.id)

        // Text input field
        const { data: textField, error: textError } = await supabase
          .from('fields')
          .insert({
            assessment_id: assessmentId,
            dimension_id: dimensionId,
            type: 'text_input',
            content: `Please provide specific examples or additional feedback regarding ${template.text.toLowerCase()}`,
            order: order++,
            number: order - 1,
            required: false,
          })
          .select('id')
          .single()

        if (textError) throw textError
        textFieldIds.push(textField.id)

        // Page break (except for last question)
        if (questionNum < 30) {
          const { error: pageBreakError } = await supabase
            .from('fields')
            .insert({
              assessment_id: assessmentId,
              dimension_id: null,
              type: 'page_break',
              content: '',
              order: order++,
              number: order - 1,
              required: false,
            })

          if (pageBreakError) throw pageBreakError
        }

        console.log(`  ✓ Created question ${questionNum}: ${template.text.substring(0, 50)}...`)
      }
    }

    // Step 9: Create group
    console.log('\n📋 Step 9: Creating group...')
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .insert({
        client_id: clientId,
        name: '360 Assessment Group - Demo',
        description: 'Demo group for 360-degree assessment testing',
        target_id: targetId,
      })
      .select('id')
      .single()

    if (groupError) throw groupError
    console.log('  ✓ Created group')
    const groupId = group.id

    // Step 10: Add members to group
    console.log('\n📋 Step 10: Adding members to group...')
    // Delete existing members first to avoid conflicts
    await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)

    const memberInserts = USERS.map((user, index) => ({
      group_id: groupId,
      profile_id: userIds[index],
      position: user.position,
      leader: user.leader || false,
    }))

    const { error: membersError } = await supabase
      .from('group_members')
      .insert(memberInserts)

    if (membersError) throw membersError
    console.log('  ✓ Added all members to group')

    // Step 11: Create assignments
    console.log('\n📋 Step 11: Creating assignments...')
    const assignmentIds: string[] = []
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    for (const userId of userIds) {
      const { data: assignment, error: assignError } = await supabase
        .from('assignments')
        .insert({
          user_id: userId,
          assessment_id: assessmentId,
          target_id: targetId,
          custom_fields: {
            type: ['name', 'email', 'position'],
            value: [
              USERS[userIds.indexOf(userId)]?.name || '',
              USERS[userIds.indexOf(userId)]?.email || '',
              USERS[userIds.indexOf(userId)]?.position || '',
            ],
          },
          expires: expiresAt.toISOString(),
          completed: true,
          started_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
          completed_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
        })
        .select('id')
        .single()

      if (assignError) throw assignError
      assignmentIds.push(assignment.id)
    }
    console.log('  ✓ Created assignments for all users')

    // Step 12: Create answers
    console.log('\n📋 Step 12: Creating answers...')
    let answerCount = 0

    for (let assignIndex = 0; assignIndex < assignmentIds.length; assignIndex++) {
      const assignmentId = assignmentIds[assignIndex]
      const userId = userIds[assignIndex]
      const isTarget = userId === targetId
      const isSupervisor = userId === supervisorId

      // Generate answers for each multiple choice question
      for (let fieldIndex = 0; fieldIndex < fieldIds.length; fieldIndex++) {
        const fieldId = fieldIds[fieldIndex]
        const textFieldId = textFieldIds[fieldIndex]

        // Generate organic score (slightly biased based on rater type)
        let baseScore = 3.0 // Meets expectations
        if (isTarget) {
          baseScore = 3.5 // Self-assessment slightly higher
        } else if (isSupervisor) {
          baseScore = 3.2 // Supervisor slightly more critical
        } else {
          baseScore = 3.3 // Subordinates slightly positive
        }

        // Add some variation
        const variation = (Math.random() - 0.5) * 0.8 // ±0.4
        const score = Math.max(1, Math.min(5, Math.round((baseScore + variation) * 10) / 10))
        const anchorValue = Math.round(score)

        // Multiple choice answer
        const { error: mcAnswerError } = await supabase
          .from('answers')
          .insert({
            assignment_id: assignmentId,
            field_id: fieldId,
            user_id: userId,
            value: anchorValue.toString(),
            time: Math.floor(Math.random() * 30) + 10, // 10-40 seconds
          })

        if (mcAnswerError) throw mcAnswerError
        answerCount++

        // Text input answer (70% chance of providing feedback)
        if (Math.random() < 0.7 && textFieldId) {
          const feedbackText = TEXT_FEEDBACK_RESPONSES[
            Math.floor(Math.random() * TEXT_FEEDBACK_RESPONSES.length)
          ]

          const { error: textAnswerError } = await supabase
            .from('answers')
            .insert({
              assignment_id: assignmentId,
              field_id: textFieldId,
              user_id: userId,
              value: feedbackText,
              time: Math.floor(Math.random() * 60) + 20, // 20-80 seconds
            })

          if (textAnswerError) throw textAnswerError
          answerCount++
        }
      }
    }

    console.log(`  ✓ Created ${answerCount} answers`)

    // Step 13: Summary
    console.log('\n✅ Seeder completed successfully!\n')
    console.log('📊 Summary:')
    console.log(`  • Client: Demo Client - 360 Survey`)
    console.log(`  • Assessment: 360-Degree Leadership Assessment - Demo`)
    console.log(`  • Dimensions: ${DIMENSIONS.length}`)
    console.log(`  • Questions: ${fieldIds.length} multiple choice questions`)
    console.log(`  • Users: ${USERS.length} (1 supervisor, 1 target, 3 subordinates)`)
    console.log(`  • Assignments: ${assignmentIds.length} (all completed)`)
    console.log(`  • Answers: ${answerCount}`)
    console.log(`\n🔗 Next steps:`)
    console.log(`  1. Log in as admin@demo.com / DemoAdmin123!`)
    console.log(`  2. Navigate to the demo client`)
    console.log(`  3. View the assessment and group`)
    console.log(`  4. Generate a 360 report for ${USERS[1].name} (target)`)
    console.log(`\n👥 Demo Users:`)
    USERS.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.name} (${user.email}) - ${user.position || 'Target'}`)
    })

  } catch (error) {
    console.error('\n❌ Error during seeding:')
    console.error(error)
    process.exit(1)
  }
}

main()
