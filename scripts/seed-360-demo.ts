/**
 * Comprehensive Demo Seeder
 * 
 * This script creates foundational data for testing:
 * - A demo client (idempotent)
 * - 20-25 demo users across 3-4 groups (idempotent)
 * - 360 assessment with improved questions
 * - Leaders assessment with hierarchical dimensions
 * - Blockers assessment with flat dimensions
 * - Industry benchmarks for all dimensions
 * - Multiple groups with different compositions
 * 
 * Note: Assignment/answer/report generation is handled by the survey simulator interface.
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

// ============================================================================
// 360 ASSESSMENT DATA
// ============================================================================

const DIMENSIONS_360 = [
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

const QUESTIONS_360 = [
  // Communication (4 questions)
  {
    text: 'How clearly and effectively does this person articulate complex ideas to diverse audiences?',
    description: 'Consider their ability to break down complicated concepts, use appropriate language for the audience, and ensure understanding through clear explanations.',
  },
  {
    text: 'How well does this person actively listen and demonstrate understanding of others\' perspectives?',
    description: 'Evaluate their engagement in conversations, ability to ask clarifying questions, and show genuine interest in what others are saying.',
  },
  {
    text: 'How effectively does this person provide constructive, actionable feedback that helps others improve?',
    description: 'Assess the quality, specificity, and delivery of feedback. Consider whether it\'s timely, balanced, and focused on growth.',
  },
  {
    text: 'How well does this person adapt their communication style to different situations and audiences?',
    description: 'Consider their flexibility in tone, format, and approach based on context, audience needs, and communication goals.',
  },
  // Leadership (3 questions)
  {
    text: 'How effectively does this person inspire and energize their team toward achieving shared goals?',
    description: 'Evaluate their ability to create vision, build enthusiasm, and motivate others through both words and actions.',
  },
  {
    text: 'How well does this person make timely, well-informed decisions under pressure?',
    description: 'Assess their decision-making process, ability to gather necessary information, and willingness to make tough calls when needed.',
  },
  {
    text: 'How effectively does this person delegate responsibilities while providing appropriate support and oversight?',
    description: 'Consider their ability to match tasks with people\'s capabilities, provide clear direction, and balance autonomy with guidance.',
  },
  // Teamwork (4 questions)
  {
    text: 'How well does this person collaborate with others to achieve collective objectives?',
    description: 'Evaluate their willingness to share information, contribute to group efforts, and prioritize team success over individual recognition.',
  },
  {
    text: 'How effectively does this person mediate conflicts and facilitate productive resolutions?',
    description: 'Assess their ability to understand multiple perspectives, find common ground, and help parties reach mutually beneficial outcomes.',
  },
  {
    text: 'How well does this person support colleagues and contribute to a positive team environment?',
    description: 'Consider their availability to help others, willingness to share knowledge, and efforts to create an inclusive, supportive atmosphere.',
  },
  {
    text: 'How effectively does this person contribute valuable insights and ideas during team discussions?',
    description: 'Evaluate the quality of their contributions, their ability to build on others\' ideas, and their engagement in collaborative problem-solving.',
  },
  // Problem Solving (3 questions)
  {
    text: 'How well does this person identify root causes of problems rather than just addressing symptoms?',
    description: 'Assess their analytical thinking, ability to ask probing questions, and commitment to understanding underlying issues.',
  },
  {
    text: 'How effectively does this person develop creative, practical solutions to complex challenges?',
    description: 'Evaluate their ability to think outside the box, consider multiple approaches, and design solutions that are both innovative and feasible.',
  },
  {
    text: 'How well does this person execute solutions and persist through obstacles to achieve results?',
    description: 'Consider their follow-through, resilience when facing setbacks, and ability to adapt plans while maintaining focus on outcomes.',
  },
  // Adaptability (3 questions)
  {
    text: 'How effectively does this person adjust their approach when circumstances change unexpectedly?',
    description: 'Evaluate their flexibility, ability to pivot quickly, and comfort with changing course when new information emerges.',
  },
  {
    text: 'How well does this person maintain performance and composure in ambiguous or uncertain situations?',
    description: 'Assess their tolerance for ambiguity, ability to make progress with incomplete information, and resilience under uncertainty.',
  },
  {
    text: 'How effectively does this person learn from new experiences and apply those lessons to future situations?',
    description: 'Consider their openness to feedback, reflection on outcomes, and ability to continuously improve their approach.',
  },
  // Innovation (3 questions)
  {
    text: 'How well does this person generate original ideas and creative approaches to challenges?',
    description: 'Evaluate their creativity, ability to see connections others miss, and willingness to explore unconventional solutions.',
  },
  {
    text: 'How effectively does this person translate innovative ideas into actionable plans and implementations?',
    description: 'Assess their ability to bridge creativity and execution, making abstract concepts concrete and achievable.',
  },
  {
    text: 'How well does this person foster an environment that encourages and rewards innovative thinking in others?',
    description: 'Consider their ability to create psychological safety, celebrate experimentation, and support others in taking creative risks.',
  },
  // Accountability (3 questions)
  {
    text: 'How effectively does this person take ownership of outcomes, both successes and failures?',
    description: 'Evaluate their willingness to accept responsibility, acknowledge mistakes, and learn from both positive and negative results.',
  },
  {
    text: 'How well does this person consistently deliver on commitments and meet deadlines?',
    description: 'Assess their reliability, time management, and ability to follow through on promises made to others.',
  },
  {
    text: 'How effectively does this person maintain high standards for their own work and hold themselves accountable?',
    description: 'Consider their self-discipline, attention to detail, and commitment to quality without external pressure.',
  },
  // Strategic Thinking (3 questions)
  {
    text: 'How well does this person think beyond immediate concerns to consider long-term implications and opportunities?',
    description: 'Evaluate their ability to see the big picture, anticipate future trends, and balance short-term needs with long-term goals.',
  },
  {
    text: 'How effectively does this person align their actions and decisions with broader organizational strategy?',
    description: 'Assess their understanding of strategic priorities and ability to connect daily work to larger organizational objectives.',
  },
  {
    text: 'How well does this person identify emerging challenges and opportunities before they become critical?',
    description: 'Consider their forward-thinking ability, pattern recognition, and proactive approach to planning and preparation.',
  },
  // Emotional Intelligence (4 questions)
  {
    text: 'How effectively does this person recognize and manage their own emotions, especially under stress?',
    description: 'Evaluate their self-awareness, emotional regulation, and ability to maintain composure and clear thinking under pressure.',
  },
  {
    text: 'How well does this person understand and respond appropriately to others\' emotional states and needs?',
    description: 'Assess their empathy, social awareness, and ability to read emotional cues and adjust their approach accordingly.',
  },
  {
    text: 'How effectively does this person build and maintain trusting, productive relationships with diverse individuals?',
    description: 'Consider their interpersonal skills, ability to connect with different personality types, and investment in relationship-building.',
  },
  {
    text: 'How well does this person navigate emotionally charged situations while maintaining professionalism and effectiveness?',
    description: 'Evaluate their ability to stay calm in conflicts, manage difficult conversations, and help others manage their emotions constructively.',
  },
]

const QUESTIONS_PER_DIMENSION_360 = [
  [0, 1, 2, 3],      // Communication (4 questions)
  [4, 5, 6],         // Leadership (3 questions)
  [7, 8, 9, 10],     // Teamwork (4 questions)
  [11, 12, 13],      // Problem Solving (3 questions)
  [14, 15, 16],      // Adaptability (3 questions)
  [17, 18, 19],      // Innovation (3 questions)
  [20, 21, 22],      // Accountability (3 questions)
  [23, 24, 25],      // Strategic Thinking (3 questions)
  [26, 27, 28, 29],  // Emotional Intelligence (4 questions)
]

const INDUSTRY_BENCHMARKS_360 = [3.2, 3.4, 3.3, 3.1, 3.0, 3.2, 3.3, 3.5, 3.4]

// ============================================================================
// LEADERS ASSESSMENT DATA
// ============================================================================

const LEADERS_PARENT_DIMENSIONS = [
  { name: 'Involving-Stakeholders', code: 'INV_STAKE' },
  { name: 'Involving-Self', code: 'INV_SELF' },
]

const LEADERS_SUBDIMENSIONS = [
  // Involving-Stakeholders subdimensions
  { name: 'Empowerment', code: 'EMP', parentIndex: 0 },
  { name: 'Communication', code: 'COMM', parentIndex: 0 },
  { name: 'Rewards', code: 'REW', parentIndex: 0 },
  { name: 'Relationships', code: 'REL', parentIndex: 0 },
  { name: 'Conflict Resolution', code: 'CONF', parentIndex: 0 },
  // Involving-Self subdimensions
  { name: 'Authenticity', code: 'AUTH', parentIndex: 1 },
  { name: 'Servitude', code: 'SERV', parentIndex: 1 },
  { name: 'Change', code: 'CHG', parentIndex: 1 },
  { name: 'Ethical', code: 'ETH', parentIndex: 1 },
  { name: 'Analytical', code: 'ANAL', parentIndex: 1 },
]

// Questions for Leaders assessment - 8-10 per subdimension (80-100 total)
const LEADERS_QUESTIONS = [
  // Empowerment (8 questions)
  { text: 'How effectively do you delegate meaningful responsibilities that allow others to grow and develop?', subdimensionIndex: 0 },
  { text: 'How well do you provide others with the autonomy and authority needed to succeed in their roles?', subdimensionIndex: 0 },
  { text: 'How effectively do you trust team members to make decisions within their areas of expertise?', subdimensionIndex: 0 },
  { text: 'How well do you remove barriers that prevent others from performing at their best?', subdimensionIndex: 0 },
  { text: 'How effectively do you create opportunities for others to take on challenging assignments?', subdimensionIndex: 0 },
  { text: 'How well do you support others when they take calculated risks?', subdimensionIndex: 0 },
  { text: 'How effectively do you help others develop the skills and confidence needed for greater responsibility?', subdimensionIndex: 0 },
  { text: 'How well do you recognize and leverage the unique strengths of each team member?', subdimensionIndex: 0 },
  // Communication (8 questions)
  { text: 'How effectively do you share information transparently and keep others informed about relevant developments?', subdimensionIndex: 1 },
  { text: 'How well do you listen actively and seek to understand others\' perspectives before responding?', subdimensionIndex: 1 },
  { text: 'How effectively do you provide clear, actionable feedback that helps others improve?', subdimensionIndex: 1 },
  { text: 'How well do you adapt your communication style to connect with different audiences?', subdimensionIndex: 1 },
  { text: 'How effectively do you facilitate open dialogue and encourage diverse viewpoints?', subdimensionIndex: 1 },
  { text: 'How well do you communicate your vision and strategic direction in ways that inspire others?', subdimensionIndex: 1 },
  { text: 'How effectively do you address difficult topics directly and constructively?', subdimensionIndex: 1 },
  { text: 'How well do you ensure important messages are understood and not lost in translation?', subdimensionIndex: 1 },
  // Rewards (8 questions)
  { text: 'How effectively do you recognize and celebrate others\' contributions and achievements?', subdimensionIndex: 2 },
  { text: 'How well do you provide meaningful rewards that align with what individuals truly value?', subdimensionIndex: 2 },
  { text: 'How effectively do you create a culture where effort and results are appropriately acknowledged?', subdimensionIndex: 2 },
  { text: 'How well do you ensure recognition is timely, specific, and genuinely felt?', subdimensionIndex: 2 },
  { text: 'How effectively do you balance individual recognition with team accomplishments?', subdimensionIndex: 2 },
  { text: 'How well do you provide both formal and informal recognition for contributions?', subdimensionIndex: 2 },
  { text: 'How effectively do you link rewards to behaviors and outcomes that matter most?', subdimensionIndex: 2 },
  { text: 'How well do you create opportunities for others to be recognized by peers and leadership?', subdimensionIndex: 2 },
  // Relationships (8 questions)
  { text: 'How effectively do you build genuine, trusting relationships with those you work with?', subdimensionIndex: 3 },
  { text: 'How well do you invest time in understanding others\' goals, challenges, and motivations?', subdimensionIndex: 3 },
  { text: 'How effectively do you create connections between people that strengthen the overall team?', subdimensionIndex: 3 },
  { text: 'How well do you maintain professional relationships even during disagreements or conflicts?', subdimensionIndex: 3 },
  { text: 'How effectively do you show appreciation for others\' contributions and value their input?', subdimensionIndex: 3 },
  { text: 'How well do you balance being approachable with maintaining appropriate professional boundaries?', subdimensionIndex: 3 },
  { text: 'How effectively do you repair relationships when they become strained?', subdimensionIndex: 3 },
  { text: 'How well do you create an environment where people feel valued and respected?', subdimensionIndex: 3 },
  // Conflict Resolution (8 questions)
  { text: 'How effectively do you address conflicts early before they escalate into larger problems?', subdimensionIndex: 4 },
  { text: 'How well do you help conflicting parties understand each other\'s perspectives?', subdimensionIndex: 4 },
  { text: 'How effectively do you facilitate solutions that address the underlying concerns of all parties?', subdimensionIndex: 4 },
  { text: 'How well do you remain neutral and fair when mediating disputes?', subdimensionIndex: 4 },
  { text: 'How effectively do you help others develop skills to resolve conflicts independently?', subdimensionIndex: 4 },
  { text: 'How well do you create processes and norms that prevent conflicts from arising?', subdimensionIndex: 4 },
  { text: 'How effectively do you turn conflicts into opportunities for growth and improved understanding?', subdimensionIndex: 4 },
  { text: 'How well do you balance assertiveness with collaboration when resolving disagreements?', subdimensionIndex: 4 },
  // Authenticity (8 questions)
  { text: 'How well do you stay true to your values and principles, even when it\'s difficult?', subdimensionIndex: 5 },
  { text: 'How effectively do you show your genuine self rather than presenting a false persona?', subdimensionIndex: 5 },
  { text: 'How well do you acknowledge your limitations and areas for growth openly?', subdimensionIndex: 5 },
  { text: 'How effectively do you align your actions with your stated beliefs and commitments?', subdimensionIndex: 5 },
  { text: 'How well do you maintain consistency in your behavior across different situations?', subdimensionIndex: 5 },
  { text: 'How effectively do you build trust through transparency and honesty?', subdimensionIndex: 5 },
  { text: 'How well do you admit mistakes and take responsibility without making excuses?', subdimensionIndex: 5 },
  { text: 'How effectively do you create space for others to be authentic as well?', subdimensionIndex: 5 },
  // Servitude (8 questions)
  { text: 'How effectively do you prioritize others\' needs and success alongside your own?', subdimensionIndex: 6 },
  { text: 'How well do you use your position and resources to help others succeed?', subdimensionIndex: 6 },
  { text: 'How effectively do you put the team\'s or organization\'s interests ahead of personal gain?', subdimensionIndex: 6 },
  { text: 'How well do you actively look for ways to support and assist others?', subdimensionIndex: 6 },
  { text: 'How effectively do you share credit and recognition rather than seeking it for yourself?', subdimensionIndex: 6 },
  { text: 'How well do you invest time in developing others without expecting immediate returns?', subdimensionIndex: 6 },
  { text: 'How effectively do you create opportunities for others to shine and succeed?', subdimensionIndex: 6 },
  { text: 'How well do you balance serving others with maintaining healthy boundaries?', subdimensionIndex: 6 },
  // Change (8 questions)
  { text: 'How effectively do you embrace change and help others navigate transitions?', subdimensionIndex: 7 },
  { text: 'How well do you adapt your approach when circumstances require a different strategy?', subdimensionIndex: 7 },
  { text: 'How effectively do you champion necessary changes even when they\'re unpopular?', subdimensionIndex: 7 },
  { text: 'How well do you help others understand the rationale and benefits of change?', subdimensionIndex: 7 },
  { text: 'How effectively do you manage your own resistance to change and model flexibility?', subdimensionIndex: 7 },
  { text: 'How well do you create a culture that views change as an opportunity rather than a threat?', subdimensionIndex: 7 },
  { text: 'How effectively do you prepare others for change and provide support during transitions?', subdimensionIndex: 7 },
  { text: 'How well do you learn from change experiences and apply those lessons going forward?', subdimensionIndex: 7 },
  // Ethical (8 questions)
  { text: 'How effectively do you make decisions that align with ethical principles and values?', subdimensionIndex: 8 },
  { text: 'How well do you consider the ethical implications of your actions on all stakeholders?', subdimensionIndex: 8 },
  { text: 'How effectively do you stand up for what\'s right, even when it\'s personally costly?', subdimensionIndex: 8 },
  { text: 'How well do you create an environment where ethical behavior is expected and rewarded?', subdimensionIndex: 8 },
  { text: 'How effectively do you address unethical behavior when you observe it?', subdimensionIndex: 8 },
  { text: 'How well do you balance competing ethical considerations when making difficult decisions?', subdimensionIndex: 8 },
  { text: 'How effectively do you model ethical behavior in both visible and behind-the-scenes actions?', subdimensionIndex: 8 },
  { text: 'How well do you help others develop their own ethical reasoning and judgment?', subdimensionIndex: 8 },
  // Analytical (8 questions)
  { text: 'How effectively do you gather and analyze relevant data before making important decisions?', subdimensionIndex: 9 },
  { text: 'How well do you identify patterns and trends that others might miss?', subdimensionIndex: 9 },
  { text: 'How effectively do you break down complex problems into manageable components?', subdimensionIndex: 9 },
  { text: 'How well do you question assumptions and validate information before acting?', subdimensionIndex: 9 },
  { text: 'How effectively do you use both quantitative and qualitative information to inform decisions?', subdimensionIndex: 9 },
  { text: 'How well do you balance analysis with the need for timely action?', subdimensionIndex: 9 },
  { text: 'How effectively do you help others develop their analytical thinking skills?', subdimensionIndex: 9 },
  { text: 'How well do you learn from outcomes and adjust your analytical approach based on results?', subdimensionIndex: 9 },
]

const LEADERS_BENCHMARKS = [
  // Parent dimensions
  3.3, 3.4,
  // Subdimensions (Involving-Stakeholders)
  3.2, 3.4, 3.3, 3.5, 3.1,
  // Subdimensions (Involving-Self)
  3.4, 3.3, 3.2, 3.5, 3.4,
]

// ============================================================================
// BLOCKERS ASSESSMENT DATA
// ============================================================================

const BLOCKERS_DIMENSIONS = [
  { name: 'Communication Barriers', code: 'COMM_BAR' },
  { name: 'Process Inefficiencies', code: 'PROC_INEF' },
  { name: 'Resource Constraints', code: 'RES_CON' },
  { name: 'Team Dynamics', code: 'TEAM_DYN' },
  { name: 'Strategic Alignment', code: 'STRAT_ALIGN' },
]

const BLOCKERS_QUESTIONS = [
  // Communication Barriers (8 questions)
  { text: 'To what extent do unclear or inconsistent messages create confusion in your work?', dimensionIndex: 0 },
  { text: 'How often do you experience breakdowns in communication that delay or derail projects?', dimensionIndex: 0 },
  { text: 'To what degree do information silos prevent you from accessing what you need?', dimensionIndex: 0 },
  { text: 'How frequently do miscommunications lead to rework or missed expectations?', dimensionIndex: 0 },
  { text: 'To what extent do communication gaps between departments create obstacles?', dimensionIndex: 0 },
  { text: 'How often do you find yourself unclear about priorities or expectations?', dimensionIndex: 0 },
  { text: 'To what degree do language or cultural differences create communication challenges?', dimensionIndex: 0 },
  { text: 'How frequently do you experience a lack of feedback that hinders your performance?', dimensionIndex: 0 },
  // Process Inefficiencies (8 questions)
  { text: 'To what extent do bureaucratic processes slow down your ability to get work done?', dimensionIndex: 1 },
  { text: 'How often do you encounter redundant or unnecessary steps in your workflows?', dimensionIndex: 1 },
  { text: 'To what degree do outdated systems or tools create inefficiencies?', dimensionIndex: 1 },
  { text: 'How frequently do you experience bottlenecks that prevent progress?', dimensionIndex: 1 },
  { text: 'To what extent do unclear processes create confusion and delays?', dimensionIndex: 1 },
  { text: 'How often do you find yourself working around broken or ineffective processes?', dimensionIndex: 1 },
  { text: 'To what degree do approval processes create unnecessary delays?', dimensionIndex: 1 },
  { text: 'How frequently do process changes create more problems than they solve?', dimensionIndex: 1 },
  // Resource Constraints (8 questions)
  { text: 'To what extent do insufficient resources (budget, time, people) limit your effectiveness?', dimensionIndex: 2 },
  { text: 'How often do you lack the tools or technology needed to perform at your best?', dimensionIndex: 2 },
  { text: 'To what degree do staffing shortages create excessive workload or missed opportunities?', dimensionIndex: 2 },
  { text: 'How frequently do budget constraints prevent you from pursuing valuable initiatives?', dimensionIndex: 2 },
  { text: 'To what extent do you lack access to necessary information or data?', dimensionIndex: 2 },
  { text: 'How often do time constraints force you to compromise on quality?', dimensionIndex: 2 },
  { text: 'To what degree do resource allocation decisions seem unfair or poorly prioritized?', dimensionIndex: 2 },
  { text: 'How frequently do resource limitations prevent you from meeting expectations?', dimensionIndex: 2 },
  // Team Dynamics (8 questions)
  { text: 'To what extent do personality conflicts or interpersonal issues disrupt team effectiveness?', dimensionIndex: 3 },
  { text: 'How often do you experience a lack of trust or collaboration within your team?', dimensionIndex: 3 },
  { text: 'To what degree do unclear roles and responsibilities create confusion or conflict?', dimensionIndex: 3 },
  { text: 'How frequently do competing priorities or agendas create friction?', dimensionIndex: 3 },
  { text: 'To what extent do team members not pulling their weight affect overall performance?', dimensionIndex: 3 },
  { text: 'How often do you experience a lack of accountability within the team?', dimensionIndex: 3 },
  { text: 'To what degree do differences in work styles create challenges?', dimensionIndex: 3 },
  { text: 'How frequently do team dynamics prevent you from achieving your goals?', dimensionIndex: 3 },
  // Strategic Alignment (8 questions)
  { text: 'To what extent do conflicting priorities or unclear direction create confusion?', dimensionIndex: 4 },
  { text: 'How often do you find yourself working on initiatives that don\'t align with stated goals?', dimensionIndex: 4 },
  { text: 'To what degree do frequent strategy changes disrupt your ability to make progress?', dimensionIndex: 4 },
  { text: 'How frequently do you lack clarity about how your work connects to larger objectives?', dimensionIndex: 4 },
  { text: 'To what extent do misaligned incentives create counterproductive behaviors?', dimensionIndex: 4 },
  { text: 'How often do you experience a disconnect between stated values and actual practices?', dimensionIndex: 4 },
  { text: 'To what degree do short-term pressures conflict with long-term strategic goals?', dimensionIndex: 4 },
  { text: 'How frequently do you feel your efforts are not contributing to meaningful outcomes?', dimensionIndex: 4 },
]

const BLOCKERS_BENCHMARKS = [3.1, 3.0, 2.9, 3.2, 3.1]

// ============================================================================
// FEEDBACK LIBRARY DATA
// ============================================================================

// Leaders feedback - organized by dimension name
const LEADERS_FEEDBACK: Record<string, { overall: string; specific: string[] }> = {
  // Parent dimensions (no feedback, only subdimensions have feedback)
  'Involving-Stakeholders': {
    overall: '',
    specific: [],
  },
  'Involving-Self': {
    overall: '',
    specific: [],
  },
  // Subdimensions
  'Empowerment': {
    overall: 'Enabling stakeholders to have ownership over their work is one of the biggest workplace trends over the past few decades. It allows stakeholders to feel they are part of something larger than their job and in turn, they are more motivated to engage in work, and stay engaged for longer periods of \'peak\' time. Here are some proven tips you can use:',
    specific: [
      'Ownership of one\'s job is highly personal with substantial variation across stakeholders. Engage in meaningful dialogue with your subordinates to figure out what each and every member of your team views as \'having ownership\' over his/her job; then adapt your leadership to meet them at their personal view of job ownership.',
      'Share/explain how you have developed ownership over your own job. For example, what does \'meaningfulness of work\' mean to you, how do you expect leadership to be shared, how do you like to be involved in decision-making, and what has allowed you to build confidence in your own work.',
      'Have periodic \'ownership pulse checks\' to see how everyone is doing with empowerment - this could be a short survey, virtual meeting, fire-side chat, or sub-group meetings over coffee. Regardless of the medium, you, as the leader, must take action on the feedback you receive.',
      'You do not always need to be in the middle of every project - thinking it is \'yours\' because you are the leader. Empower others to lead and guide (including leading you) the project. This will increase stakeholder confidence, allow increased efficiencies, and provide an opportunity for others to develop leadership skills.',
      'When team members come to you with a problem requesting guidance, ask them to provide a possible solution and work to incorporate that into your guidance.',
    ],
  },
  'Communication': {
    overall: 'You cannot over communicate. Work on providing the information everyone needs in a timely, proactive fashion. Here are some more detailed steps to help with communication:',
    specific: [
      'Recognize that you are the primary conduit for ideas and information between your subordinates and upper management, try to make sure both sides know what the other is concerned about.',
      'In addition to telling "what" employees should do, tell them "why" they should be doing it, especially if the reason isn\'t obvious.',
      'Do not delay in providing feedback - whether it is positive or negative - but make sure to begin and end with positives.',
      'When you learn something new that effects your team, make sure to timely and accurately relay the information.',
      'Periodically check in with your team (in person, virtually, digitally) to make sure your communication is having its intended effect (i.e., make sure there is no confusion).',
    ],
  },
  'Rewards': {
    overall: 'Everyone likes to be rewarded for a good job - make sure you are doing so by making rewards more meaningful to each person. More specific actions to boost rewards (and thereby performance and well-being) could include:',
    specific: [
      'Ask subordinates how they would like to be rewarded, and attempt to provide them with desired rewards for great work (as long as it is within reason).',
      'Reward fatigue is a real thing. Find the balance between under and over rewarding to ensure the rewards have true meaning.',
      'Routinely commend your top performers for their work.',
      'Sometimes even small recognitions of a subordinate\'s hard work can go a long way - what are some small, but powerful things you can do to recognize outstanding performance.',
      'Some of the most important rewards are those which have personal, not necessarily monetary meaning, but personal meaning. Find a way to incorporate a "personal touch" with every reward provided.',
    ],
  },
  'Relationships': {
    overall: 'Relationships might be the single biggest lever you have to work with as a leader - work on building meaningful relationships with your team members. Such as:',
    specific: [
      'If you can\'t return an email immediately, send a confirmation you received the message and let them know you will get back to them as soon as you can.',
      'Listen & internalize suggestions/feedback from stakeholders and either accept the feedback, or explain why you believe it to be inaccurate.',
      'Try to find solutions that satisfy as many stakeholders as possible.',
      'When there is a disagreement, try to hear out both parties before making a decision or passing judgement.',
      'Schedule one on one conversations with stakeholders as well as having impromptu meetings (e.g., taking them to lunch, buy them a cup of coffee, invite them to an open-room virtual meeting).',
    ],
  },
  'Conflict Resolution': {
    overall: 'We are all humans and conflict is inevitable. Managers \'baby-sit\', while leaders resolve conflict. Focus on resolution so all parties can move forward.',
    specific: [
      'Try to find solutions that satisfy as many parties as possible.',
      'Create dialogue among conflicted parties - use data & facts to arrive at dialogue and stay away from rumors & hearsay.',
      'Recognize and teach others to recognize that most conflict comes down to a few pieces of truth that everyone can agree on - we get into conflict because we exponentially amplify these few pieces of truth into wild \'stories\'.',
      'Do not run from conflict. We often see conflict as a bad thing, but this is not always the case. Conflict is often the most authentic form of conversation co-workers can have with one another. The important thing however is to manage it well.',
      'Do not react immediately or take "sides". Have an open mind and open ears and listen to what the parties involved in the conflict are saying. Document these conversations and keep them confidential.',
    ],
  },
  'Authenticity': {
    overall: 'Being self-aware and authentic might not work in the short-term, but over the long-haul, doing so will open doors to many positives at work (and help you work through many negatives). In fact, authenticity and self-awareness are hallmarks of great leaders, but you need to make sure there is alignment between your own self-views and how others see you - work to close any perceptional gap that might be discovered.',
    specific: [
      'If you find yourself in a unique, and possibly uncomfortable position, always fall back on your values.',
      'Do not hide your real-self, let others see the real you everyday across all your actions - both face-to-face and virtually.',
      'As a leader, it is critical to be authentic - provide examples of how your real-self has helped you at work.',
      'If someone asks you to deviate from your guiding principles, try to find out why, but never stray from who you really are.',
      'Remember, authenticity is not about being fake, but honestly showing who you are - good and bad - and effectively managing the real you.',
    ],
  },
  'Servitude': {
    overall: 'Servant leadership is about prioritizing others\' needs and success alongside your own. Effective leaders use their position and resources to help others succeed, creating a culture where everyone can thrive.',
    specific: [
      'Prioritize others\' needs and success alongside your own. Look for opportunities to support team members in achieving their goals.',
      'Use your position and resources to help others succeed. Share knowledge, provide opportunities, and remove obstacles.',
      'Put the team\'s or organization\'s interests ahead of personal gain. Make decisions that benefit the collective.',
      'Actively look for ways to support and assist others. Be proactive in offering help before it\'s requested.',
      'Share credit and recognition rather than seeking it for yourself. Celebrate others\' successes publicly.',
    ],
  },
  'Change': {
    overall: 'Change is constant in today\'s workplace. Effective leaders embrace change and help others navigate transitions successfully. They create a culture that views change as an opportunity rather than a threat.',
    specific: [
      'Embrace change and help others navigate transitions. Be a stabilizing force during uncertain times.',
      'Adapt your approach when circumstances require a different strategy. Be flexible and open to new methods.',
      'Champion necessary changes even when they\'re unpopular. Help others understand the rationale and benefits.',
      'Help others understand the rationale and benefits of change. Communicate clearly about why change is needed.',
      'Manage your own resistance to change and model flexibility. Show others how to adapt positively.',
    ],
  },
  'Ethical': {
    overall: 'Ethical leadership is foundational to building trust and creating a positive organizational culture. Leaders who consistently demonstrate ethical behavior inspire others to do the same.',
    specific: [
      'Make decisions that align with ethical principles and values. Consider the ethical implications of your actions on all stakeholders.',
      'Stand up for what\'s right, even when it\'s personally costly. Demonstrate courage in ethical decision-making.',
      'Create an environment where ethical behavior is expected and rewarded. Set clear ethical standards.',
      'Address unethical behavior when you observe it. Don\'t turn a blind eye to misconduct.',
      'Model ethical behavior in both visible and behind-the-scenes actions. Consistency is key.',
    ],
  },
  'Analytical': {
    overall: 'Strong analytical thinking helps leaders make better decisions and solve complex problems. Effective leaders gather relevant data, identify patterns, and use both quantitative and qualitative information to inform their choices.',
    specific: [
      'Gather and analyze relevant data before making important decisions. Don\'t rely solely on intuition.',
      'Identify patterns and trends that others might miss. Look for connections between seemingly unrelated information.',
      'Break down complex problems into manageable components. Use structured problem-solving approaches.',
      'Question assumptions and validate information before acting. Verify facts and challenge conventional wisdom.',
      'Use both quantitative and qualitative information to inform decisions. Balance data with human insights.',
    ],
  },
}

// Blockers feedback - organized by dimension name
const BLOCKERS_FEEDBACK: Record<string, { overall: string; specific: string[] }> = {
  'Communication Barriers': {
    overall: 'Communication barriers can significantly impact team effectiveness and productivity. Addressing these obstacles requires a systematic approach to improving information flow, clarity, and accessibility across the organization.',
    specific: [
      'Establish clear communication protocols and channels. Ensure everyone knows how and when to share important information.',
      'Create regular check-ins to verify message understanding. Ask team members to summarize key points to confirm clarity.',
      'Break down information silos by creating cross-functional communication opportunities. Encourage knowledge sharing between departments.',
      'Address miscommunications immediately when they occur. Use them as learning opportunities to improve future communication.',
      'Provide training on effective communication techniques, especially for virtual and cross-cultural contexts.',
    ],
  },
  'Process Inefficiencies': {
    overall: 'Inefficient processes waste time, resources, and energy. Identifying and eliminating unnecessary steps, bottlenecks, and outdated procedures can dramatically improve organizational effectiveness.',
    specific: [
      'Regularly review and audit existing processes to identify redundancies and bottlenecks. Involve team members who actually use the processes.',
      'Streamline approval processes by establishing clear criteria and delegating authority appropriately. Reduce unnecessary layers of review.',
      'Update or replace outdated systems and tools that create inefficiencies. Invest in technology that supports your team\'s work.',
      'Create process documentation that is clear, accessible, and regularly updated. Ensure everyone understands the "why" behind processes.',
      'Empower team members to suggest process improvements. Create a culture where process optimization is everyone\'s responsibility.',
    ],
  },
  'Resource Constraints': {
    overall: 'Resource constraints can limit your team\'s ability to achieve goals and deliver quality work. Effective resource management involves strategic planning, creative problem-solving, and clear prioritization.',
    specific: [
      'Conduct regular resource audits to understand current capacity and constraints. Be transparent about resource limitations with your team.',
      'Prioritize initiatives based on strategic value and available resources. Learn to say no to low-priority requests.',
      'Explore creative solutions to resource constraints, such as cross-training, flexible staffing, or partnerships.',
      'Advocate for necessary resources with clear business cases. Document the impact of resource constraints on outcomes.',
      'Help team members work more efficiently with existing resources. Provide tools, training, and support to maximize productivity.',
    ],
  },
  'Team Dynamics': {
    overall: 'Team dynamics significantly impact collaboration, productivity, and job satisfaction. Addressing interpersonal challenges, building trust, and creating a positive team culture are essential for high performance.',
    specific: [
      'Foster open communication and create safe spaces for team members to express concerns and ideas. Address conflicts early before they escalate.',
      'Build trust through consistency, transparency, and follow-through. Keep commitments and be honest about challenges.',
      'Recognize and leverage diverse strengths and perspectives. Create opportunities for different team members to contribute.',
      'Establish clear team norms and expectations. Ensure everyone understands their roles and how they contribute to team success.',
      'Invest in team-building activities that strengthen relationships and improve collaboration. Regular check-ins help maintain positive dynamics.',
    ],
  },
  'Strategic Alignment': {
    overall: 'Strategic alignment ensures that individual efforts contribute to organizational goals. When teams understand how their work connects to the bigger picture, they can make better decisions and stay focused on what matters most.',
    specific: [
      'Clearly communicate organizational strategy and how team goals connect to broader objectives. Help team members see the "why" behind their work.',
      'Regularly review and adjust team priorities to ensure alignment with changing strategic needs. Be flexible when strategy evolves.',
      'Create opportunities for team members to provide input on strategic direction. Their insights can improve alignment and buy-in.',
      'Measure and track progress toward strategic goals. Share results regularly so teams can see their impact.',
      'Address misalignment quickly when it occurs. Help teams understand when and why priorities shift.',
    ],
  },
}

// ============================================================================
// USER DATA (20-25 users across 3-4 groups)
// ============================================================================

const USERS = [
  // Group 1
  { name: 'Sarah Johnson', email: 'sarah.johnson@demo.com', username: 'sjohnson', position: 'Supervisor', leader: true, groupIndex: 0 },
  { name: 'Michael Chen', email: 'michael.chen@demo.com', username: 'mchen', position: null, leader: false, groupIndex: 0 }, // Target
  { name: 'Emily Rodriguez', email: 'emily.rodriguez@demo.com', username: 'erodriguez', position: 'Subordinate', leader: false, groupIndex: 0 },
  { name: 'David Kim', email: 'david.kim@demo.com', username: 'dkim', position: 'Subordinate', leader: false, groupIndex: 0 },
  { name: 'Jessica Williams', email: 'jessica.williams@demo.com', username: 'jwilliams', position: 'Subordinate', leader: false, groupIndex: 0 },
  
  // Group 2
  { name: 'Robert Martinez', email: 'robert.martinez@demo.com', username: 'rmartinez', position: 'Supervisor', leader: true, groupIndex: 1 },
  { name: 'Amanda Thompson', email: 'amanda.thompson@demo.com', username: 'athompson', position: null, leader: false, groupIndex: 1 }, // Target
  { name: 'James Wilson', email: 'james.wilson@demo.com', username: 'jwilson', position: 'Subordinate', leader: false, groupIndex: 1 },
  { name: 'Lisa Anderson', email: 'lisa.anderson@demo.com', username: 'landerson', position: 'Subordinate', leader: false, groupIndex: 1 },
  { name: 'Christopher Brown', email: 'christopher.brown@demo.com', username: 'cbrown', position: 'Subordinate', leader: false, groupIndex: 1 },
  { name: 'Michelle Davis', email: 'michelle.davis@demo.com', username: 'mdavis', position: 'Subordinate', leader: false, groupIndex: 1 },
  
  // Group 3
  { name: 'Daniel Garcia', email: 'daniel.garcia@demo.com', username: 'dgarcia', position: 'Supervisor', leader: true, groupIndex: 2 },
  { name: 'Jennifer Lee', email: 'jennifer.lee@demo.com', username: 'jlee', position: null, leader: false, groupIndex: 2 }, // Target
  { name: 'Matthew Taylor', email: 'matthew.taylor@demo.com', username: 'mtaylor', position: 'Subordinate', leader: false, groupIndex: 2 },
  { name: 'Nicole White', email: 'nicole.white@demo.com', username: 'nwhite', position: 'Subordinate', leader: false, groupIndex: 2 },
  { name: 'Ryan Moore', email: 'ryan.moore@demo.com', username: 'rmoore', position: 'Subordinate', leader: false, groupIndex: 2 },
  
  // Group 4
  { name: 'Patricia Jackson', email: 'patricia.jackson@demo.com', username: 'pjackson', position: 'Supervisor', leader: true, groupIndex: 3 },
  { name: 'Kevin Harris', email: 'kevin.harris@demo.com', username: 'kharris', position: null, leader: false, groupIndex: 3 }, // Target
  { name: 'Stephanie Clark', email: 'stephanie.clark@demo.com', username: 'sclark', position: 'Subordinate', leader: false, groupIndex: 3 },
  { name: 'Andrew Lewis', email: 'andrew.lewis@demo.com', username: 'alewis', position: 'Subordinate', leader: false, groupIndex: 3 },
  { name: 'Rachel Walker', email: 'rachel.walker@demo.com', username: 'rwalker', position: 'Subordinate', leader: false, groupIndex: 3 },
  { name: 'Thomas Hall', email: 'thomas.hall@demo.com', username: 'thall', position: 'Subordinate', leader: false, groupIndex: 3 },
]

const GROUPS = [
  { name: '360 Assessment Group 1 - Demo', description: 'Demo group for 360-degree assessment testing - Team Alpha' },
  { name: '360 Assessment Group 2 - Demo', description: 'Demo group for 360-degree assessment testing - Team Beta' },
  { name: '360 Assessment Group 3 - Demo', description: 'Demo group for 360-degree assessment testing - Team Gamma' },
  { name: '360 Assessment Group 4 - Demo', description: 'Demo group for 360-degree assessment testing - Team Delta' },
]

// ============================================================================
// COMMON DATA
// ============================================================================

const ANCHORS = [
  { id: '1', name: 'Below Expectations', value: 1, practice: false },
  { id: '2', name: 'Partially Meets Expectations', value: 2, practice: false },
  { id: '3', name: 'Meets Expectations', value: 3, practice: false },
  { id: '4', name: 'Exceeds Expectations', value: 4, practice: false },
  { id: '5', name: 'Significantly Exceeds Expectations', value: 5, practice: false },
]

const ANCHOR_INSIGHTS = [
  ['This person consistently falls short of expected performance standards in this area.'],
  ['This person shows some capability but needs significant development to meet expectations.'],
  ['This person demonstrates solid performance that aligns with role expectations.'],
  ['This person consistently performs above expectations and adds significant value.'],
  ['This person demonstrates exceptional performance that serves as a model for others.'],
]

// ============================================================================
// MAIN FUNCTION
// ============================================================================

async function main() {
  console.log('🌱 Starting Demo Seeder...\n')

  try {
    // Step 1: Create or get demo client (idempotent)
    console.log('📋 Step 1: Setting up demo client...')
    let { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id')
      .eq('name', 'Demo Client - 360 Survey')
      .maybeSingle()

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

    // Step 2: Create or get industry (idempotent)
    console.log('\n📋 Step 2: Setting up industry...')
    let { data: industry, error: industryError } = await supabase
      .from('industries')
      .select('id')
      .eq('name', 'Technology')
      .maybeSingle()

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

    // Step 3: Create or get admin user (idempotent)
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

    // Create or update admin profile (idempotent)
    let { data: adminProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('auth_user_id', adminUser.id)
      .maybeSingle()

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

    // Step 4: Create demo users (idempotent)
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
        const { data: { users: allAuthUsers } } = await supabase.auth.admin.listUsers()
        let authUser = allAuthUsers.find(u => u.email === userData.email)

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
          .update({ 
            client_id: clientId, 
            industry_id: industryId,
            name: userData.name,
            username: userData.username,
          })
          .eq('id', existingProfile.id)
        userProfileId = existingProfile.id
        console.log(`  ✓ Using existing user: ${userData.name}`)
      }

      userIds.push(userProfileId)
    }

    // Step 5: Create 360 assessment (idempotent - check by title)
    console.log('\n📋 Step 5: Creating 360 assessment...')
    let { data: assessment360, error: assessment360Error } = await supabase
      .from('assessments')
      .select('id')
      .eq('title', '360-Degree Leadership Assessment - Demo')
      .maybeSingle()

    if (assessment360Error && assessment360Error.code !== 'PGRST116') {
      throw assessment360Error
    }

    let assessment360Id: string
    if (!assessment360) {
      const { data: newAssessment, error: createError } = await supabase
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

      if (createError) throw createError
      assessment360Id = newAssessment.id
      console.log('  ✓ Created 360 assessment')
    } else {
      assessment360Id = assessment360.id
      console.log('  ✓ Using existing 360 assessment')
    }

    // Step 6: Create 360 dimensions and questions
    console.log('\n📋 Step 6: Creating 360 dimensions and questions...')
    const dimension360Ids: string[] = []

    // Get existing dimensions for this assessment
    const { data: existingDimensions360 } = await supabase
      .from('dimensions')
      .select('id, name')
      .eq('assessment_id', assessment360Id)

    const existingDimMap360 = new Map<string, string>()
    existingDimensions360?.forEach(d => existingDimMap360.set(d.name, d.id))

    for (let i = 0; i < DIMENSIONS_360.length; i++) {
      const dim = DIMENSIONS_360[i]
      let dimensionId: string

      if (existingDimMap360.has(dim.name)) {
        dimensionId = existingDimMap360.get(dim.name)!
      } else {
      const { data: dimension, error: dimError } = await supabase
        .from('dimensions')
        .insert({
            assessment_id: assessment360Id,
          name: dim.name,
          code: dim.code,
        })
        .select('id')
        .single()

      if (dimError) throw dimError
        dimensionId = dimension.id
      console.log(`  ✓ Created dimension: ${dim.name}`)
    }

      dimension360Ids.push(dimensionId)
    }

    // Create questions for 360 assessment
    const { data: existingFields360 } = await supabase
      .from('fields')
      .select('id, content, dimension_id')
      .eq('assessment_id', assessment360Id)
      .eq('type', 'multiple_choice')

    let fieldCount360 = 0
    let order = 1

    for (let dimIndex = 0; dimIndex < DIMENSIONS_360.length; dimIndex++) {
      const dimensionId = dimension360Ids[dimIndex]
      const questionIndices = QUESTIONS_PER_DIMENSION_360[dimIndex]

      for (const qIndex of questionIndices) {
        const question = QUESTIONS_360[qIndex]
        
        // Check if question already exists
        const exists = existingFields360?.some(f => 
          f.dimension_id === dimensionId && 
          f.content === question.text
        )

        if (!exists) {
          const dimensionName = DIMENSIONS_360[dimIndex].name

        // Description field
          await supabase
          .from('fields')
          .insert({
              assessment_id: assessment360Id,
            dimension_id: dimensionId,
            type: 'rich_text',
              content: question.description,
            order: order++,
            number: order - 1,
            required: false,
          })

        // Multiple choice question
          await supabase
          .from('fields')
          .insert({
              assessment_id: assessment360Id,
            dimension_id: dimensionId,
            type: 'multiple_choice',
              content: question.text,
            order: order++,
            number: order - 1,
            required: true,
            anchors: ANCHORS,
            insights_table: [ANCHOR_INSIGHTS],
          })

          // Text input field for developmental comments
          await supabase
          .from('fields')
          .insert({
              assessment_id: assessment360Id,
            dimension_id: dimensionId,
            type: 'text_input',
              content: `Developmental Comments for ${dimensionName}`,
            order: order++,
            number: order - 1,
            required: false,
            })

          fieldCount360++
        }
      }
    }

    if (fieldCount360 > 0) {
      console.log(`  ✓ Created ${fieldCount360} new questions for 360 assessment`)
    } else {
      console.log('  ✓ All 360 questions already exist')
    }

    // Step 7: Create industry benchmarks for 360
    console.log('\n📋 Step 7: Creating industry benchmarks for 360...')
    for (let i = 0; i < dimension360Ids.length; i++) {
      await supabase
        .from('benchmarks')
        .upsert({
          dimension_id: dimension360Ids[i],
          industry_id: industryId,
          value: INDUSTRY_BENCHMARKS_360[i],
        }, {
          onConflict: 'dimension_id,industry_id',
        })
    }
    console.log('  ✓ Created/updated industry benchmarks for 360 dimensions')

    // Step 8: Create Leaders assessment
    console.log('\n📋 Step 8: Creating Leaders assessment...')
    let { data: assessmentLeaders, error: assessmentLeadersError } = await supabase
      .from('assessments')
      .select('id')
      .eq('title', 'Leaders Assessment - Demo')
      .maybeSingle()

    if (assessmentLeadersError && assessmentLeadersError.code !== 'PGRST116') {
      throw assessmentLeadersError
    }

    let assessmentLeadersId: string
    if (!assessmentLeaders) {
      const { data: newAssessment, error: createError } = await supabase
        .from('assessments')
        .insert({
          title: 'Leaders Assessment - Demo',
          description: 'Leadership assessment with hierarchical dimensions (Involving-Stakeholders and Involving-Self) and their subdimensions.',
          type: 'custom',
          is_360: false,
          status: 'active',
          created_by: adminUser.id,
          number_of_questions: 20, // Randomly select 20 questions per participant
          })
          .select('id')
          .single()

      if (createError) throw createError
      assessmentLeadersId = newAssessment.id
      console.log('  ✓ Created Leaders assessment')
    } else {
      assessmentLeadersId = assessmentLeaders.id
      console.log('  ✓ Using existing Leaders assessment')
    }

    // Step 9: Create Leaders dimensions (parent and child)
    console.log('\n📋 Step 9: Creating Leaders dimensions...')
    const leadersParentDimIds: string[] = []
    const leadersSubdimIds: string[] = []

    const { data: existingLeadersDims } = await supabase
      .from('dimensions')
      .select('id, name, parent_id')
      .eq('assessment_id', assessmentLeadersId)

    const existingLeadersDimMap = new Map<string, string>()
    existingLeadersDims?.forEach(d => existingLeadersDimMap.set(d.name, d.id))

    // Create parent dimensions
    for (const parentDim of LEADERS_PARENT_DIMENSIONS) {
      let parentId: string

      if (existingLeadersDimMap.has(parentDim.name)) {
        parentId = existingLeadersDimMap.get(parentDim.name)!
      } else {
        const { data: dimension, error: dimError } = await supabase
          .from('dimensions')
          .insert({
            assessment_id: assessmentLeadersId,
            name: parentDim.name,
            code: parentDim.code,
            parent_id: null,
          })
          .select('id')
          .single()

        if (dimError) throw dimError
        parentId = dimension.id
        console.log(`  ✓ Created parent dimension: ${parentDim.name}`)
      }

      leadersParentDimIds.push(parentId)
    }

    // Create subdimensions
    for (const subdim of LEADERS_SUBDIMENSIONS) {
      const parentId = leadersParentDimIds[subdim.parentIndex]
      let subdimId: string

      if (existingLeadersDimMap.has(subdim.name)) {
        subdimId = existingLeadersDimMap.get(subdim.name)!
      } else {
        const { data: dimension, error: dimError } = await supabase
          .from('dimensions')
          .insert({
            assessment_id: assessmentLeadersId,
            name: subdim.name,
            code: subdim.code,
            parent_id: parentId,
          })
          .select('id')
          .single()

        if (dimError) throw dimError
        subdimId = dimension.id
        console.log(`  ✓ Created subdimension: ${subdim.name}`)
      }

      leadersSubdimIds.push(subdimId)
    }

    // Step 10: Create Leaders questions
    console.log('\n📋 Step 10: Creating Leaders questions...')
    const { data: existingLeadersFields } = await supabase
      .from('fields')
      .select('id, content, dimension_id')
      .eq('assessment_id', assessmentLeadersId)
      .eq('type', 'multiple_choice')

    let leadersFieldCount = 0
    let leadersOrder = 1

    // Group questions by subdimension
    const questionsBySubdim = new Map<number, typeof LEADERS_QUESTIONS>()
    LEADERS_QUESTIONS.forEach(q => {
      if (!questionsBySubdim.has(q.subdimensionIndex)) {
        questionsBySubdim.set(q.subdimensionIndex, [])
      }
      questionsBySubdim.get(q.subdimensionIndex)!.push(q)
    })

    for (let subdimIndex = 0; subdimIndex < leadersSubdimIds.length; subdimIndex++) {
      const subdimId = leadersSubdimIds[subdimIndex]
      const questions = questionsBySubdim.get(subdimIndex) || []

      for (const question of questions) {
        const exists = existingLeadersFields?.some(f => 
          f.dimension_id === subdimId && 
          f.content === question.text
        )

        if (!exists) {
          await supabase
            .from('fields')
            .insert({
              assessment_id: assessmentLeadersId,
              dimension_id: subdimId,
              type: 'multiple_choice',
              content: question.text,
              order: leadersOrder++,
              number: leadersOrder - 1,
              required: true,
              anchors: ANCHORS,
              insights_table: [ANCHOR_INSIGHTS],
            })

          leadersFieldCount++
        }
      }
    }

    if (leadersFieldCount > 0) {
      console.log(`  ✓ Created ${leadersFieldCount} new questions for Leaders assessment`)
    } else {
      console.log('  ✓ All Leaders questions already exist')
    }

    // Update dimension_question_counts for Leaders (2-3 questions per subdimension)
    const dimensionQuestionCounts: Record<string, number> = {}
    leadersSubdimIds.forEach(subdimId => {
      dimensionQuestionCounts[subdimId] = 2 // 2 questions per subdimension = 20 total
    })

    await supabase
      .from('assessments')
      .update({ dimension_question_counts: dimensionQuestionCounts })
      .eq('id', assessmentLeadersId)

    console.log('  ✓ Set dimension_question_counts for Leaders assessment')

    // Step 11: Create industry benchmarks for Leaders
    console.log('\n📋 Step 11: Creating industry benchmarks for Leaders...')
    const allLeadersDimIds = [...leadersParentDimIds, ...leadersSubdimIds]
    for (let i = 0; i < allLeadersDimIds.length; i++) {
      await supabase
        .from('benchmarks')
        .upsert({
          dimension_id: allLeadersDimIds[i],
          industry_id: industryId,
          value: LEADERS_BENCHMARKS[i],
        }, {
          onConflict: 'dimension_id,industry_id',
        })
    }
    console.log('  ✓ Created/updated industry benchmarks for Leaders dimensions')

    // Step 12: Create Blockers assessment
    console.log('\n📋 Step 12: Creating Blockers assessment...')
    let { data: assessmentBlockers, error: assessmentBlockersError } = await supabase
      .from('assessments')
      .select('id')
      .eq('title', 'Blockers Assessment - Demo')
      .maybeSingle()

    if (assessmentBlockersError && assessmentBlockersError.code !== 'PGRST116') {
      throw assessmentBlockersError
    }

    let assessmentBlockersId: string
    if (!assessmentBlockers) {
      const { data: newAssessment, error: createError } = await supabase
        .from('assessments')
        .insert({
          title: 'Blockers Assessment - Demo',
          description: 'Assessment identifying organizational blockers across 5 key dimensions.',
          type: 'custom',
          is_360: false,
          status: 'active',
          created_by: adminUser.id,
          number_of_questions: 20, // Randomly select 20 questions from ~40 question pool
        })
        .select('id')
        .single()

      if (createError) throw createError
      assessmentBlockersId = newAssessment.id
      console.log('  ✓ Created Blockers assessment')
    } else {
      assessmentBlockersId = assessmentBlockers.id
      console.log('  ✓ Using existing Blockers assessment')
    }

    // Step 13: Create Blockers dimensions
    console.log('\n📋 Step 13: Creating Blockers dimensions...')
    const blockersDimIds: string[] = []

    const { data: existingBlockersDims } = await supabase
      .from('dimensions')
      .select('id, name')
      .eq('assessment_id', assessmentBlockersId)

    const existingBlockersDimMap = new Map<string, string>()
    existingBlockersDims?.forEach(d => existingBlockersDimMap.set(d.name, d.id))

    for (const dim of BLOCKERS_DIMENSIONS) {
      let dimensionId: string

      if (existingBlockersDimMap.has(dim.name)) {
        dimensionId = existingBlockersDimMap.get(dim.name)!
      } else {
        const { data: dimension, error: dimError } = await supabase
          .from('dimensions')
          .insert({
            assessment_id: assessmentBlockersId,
            name: dim.name,
            code: dim.code,
            parent_id: null,
          })
          .select('id')
          .single()

        if (dimError) throw dimError
        dimensionId = dimension.id
        console.log(`  ✓ Created dimension: ${dim.name}`)
      }

      blockersDimIds.push(dimensionId)
    }

    // Step 14: Create Blockers questions
    console.log('\n📋 Step 14: Creating Blockers questions...')
    const { data: existingBlockersFields } = await supabase
      .from('fields')
      .select('id, content, dimension_id')
      .eq('assessment_id', assessmentBlockersId)
      .eq('type', 'multiple_choice')

    let blockersFieldCount = 0
    let blockersOrder = 1

    // Group questions by dimension
    const questionsByDim = new Map<number, typeof BLOCKERS_QUESTIONS>()
    BLOCKERS_QUESTIONS.forEach(q => {
      if (!questionsByDim.has(q.dimensionIndex)) {
        questionsByDim.set(q.dimensionIndex, [])
      }
      questionsByDim.get(q.dimensionIndex)!.push(q)
    })

    for (let dimIndex = 0; dimIndex < blockersDimIds.length; dimIndex++) {
      const dimId = blockersDimIds[dimIndex]
      const questions = questionsByDim.get(dimIndex) || []

      for (const question of questions) {
        const exists = existingBlockersFields?.some(f => 
          f.dimension_id === dimId && 
          f.content === question.text
        )

        if (!exists) {
          await supabase
            .from('fields')
            .insert({
              assessment_id: assessmentBlockersId,
              dimension_id: dimId,
              type: 'multiple_choice',
              content: question.text,
              order: blockersOrder++,
              number: blockersOrder - 1,
              required: true,
              anchors: ANCHORS,
              insights_table: [ANCHOR_INSIGHTS],
            })

          blockersFieldCount++
        }
      }
    }

    if (blockersFieldCount > 0) {
      console.log(`  ✓ Created ${blockersFieldCount} new questions for Blockers assessment`)
    } else {
      console.log('  ✓ All Blockers questions already exist')
    }

    // Step 15: Create industry benchmarks for Blockers
    console.log('\n📋 Step 15: Creating industry benchmarks for Blockers...')
    for (let i = 0; i < blockersDimIds.length; i++) {
      await supabase
        .from('benchmarks')
        .upsert({
          dimension_id: blockersDimIds[i],
          industry_id: industryId,
          value: BLOCKERS_BENCHMARKS[i],
        }, {
          onConflict: 'dimension_id,industry_id',
        })
    }
    console.log('  ✓ Created/updated industry benchmarks for Blockers dimensions')

    // Step 16: Create groups
    console.log('\n📋 Step 16: Creating groups...')
    const groupIds: string[] = []

    // Group users by groupIndex
    const usersByGroup = new Map<number, typeof USERS>()
    USERS.forEach(user => {
      if (!usersByGroup.has(user.groupIndex)) {
        usersByGroup.set(user.groupIndex, [])
      }
      usersByGroup.get(user.groupIndex)!.push(user)
    })

    for (let groupIndex = 0; groupIndex < GROUPS.length; groupIndex++) {
      const groupData = GROUPS[groupIndex]
      const groupUsers = usersByGroup.get(groupIndex) || []
      
      // Find target user (position is null)
      const targetUser = groupUsers.find(u => u.position === null)
      const targetUserId = targetUser ? userIds[USERS.indexOf(targetUser)] : null

      // Check if group exists
      let { data: existingGroup, error: groupLookupError } = await supabase
        .from('groups')
        .select('id')
        .eq('name', groupData.name)
        .maybeSingle()

      if (groupLookupError && groupLookupError.code !== 'PGRST116') {
        throw groupLookupError
      }

      let groupId: string
      if (!existingGroup) {
        const { data: newGroup, error: createError } = await supabase
      .from('groups')
      .insert({
        client_id: clientId,
            name: groupData.name,
            description: groupData.description,
            target_id: targetUserId,
      })
      .select('id')
      .single()

        if (createError) throw createError
        groupId = newGroup.id
        console.log(`  ✓ Created group: ${groupData.name}`)
      } else {
        groupId = existingGroup.id
        // Update target_id if needed
        if (targetUserId) {
          await supabase
            .from('groups')
            .update({ target_id: targetUserId })
            .eq('id', groupId)
        }
        console.log(`  ✓ Using existing group: ${groupData.name}`)
      }

      groupIds.push(groupId)

      // Add/update group members
    await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)

      const memberInserts = groupUsers.map(user => {
        const userIndex = USERS.indexOf(user)
        return {
      group_id: groupId,
          profile_id: userIds[userIndex],
      position: user.position,
      leader: user.leader || false,
        }
      })

      await supabase
      .from('group_members')
      .insert(memberInserts)

      console.log(`  ✓ Added ${memberInserts.length} members to ${groupData.name}`)
    }

    // Step 17: Create feedback library entries for Leaders and Blockers
    console.log('\n📋 Step 17: Creating feedback library entries...')
    
    // Get all dimensions for Leaders and Blockers assessments
    const { data: leadersDimensions } = await supabase
      .from('dimensions')
      .select('id, name, parent_id')
      .eq('assessment_id', assessmentLeadersId)
    
    const { data: blockersDimensions } = await supabase
      .from('dimensions')
      .select('id, name')
      .eq('assessment_id', assessmentBlockersId)
    
    // Check existing feedback to avoid duplicates
    const { data: existingFeedback } = await supabase
      .from('feedback_library')
      .select('id, assessment_id, dimension_id, type')
      .in('assessment_id', [assessmentLeadersId, assessmentBlockersId])
    
    const existingFeedbackMap = new Map<string, boolean>()
    existingFeedback?.forEach(f => {
      const key = `${f.assessment_id}-${f.dimension_id || 'null'}-${f.type}`
      existingFeedbackMap.set(key, true)
    })
    
    let feedbackCount = 0
    
    // Seed Leaders feedback (only for subdimensions, not parent dimensions)
    if (leadersDimensions) {
      for (const dimension of leadersDimensions) {
        // Skip parent dimensions (they don't have feedback)
        if (!dimension.parent_id) continue
        
        const feedbackData = LEADERS_FEEDBACK[dimension.name]
        if (!feedbackData || !feedbackData.overall) continue
        
        // Check if overall feedback exists
        const overallKey = `${assessmentLeadersId}-${dimension.id}-overall`
        if (!existingFeedbackMap.has(overallKey)) {
          await supabase
            .from('feedback_library')
          .insert({
              assessment_id: assessmentLeadersId,
              dimension_id: dimension.id,
              type: 'overall',
              feedback: feedbackData.overall,
              min_score: null,
              max_score: null,
              created_by: adminUser.id,
            })
          feedbackCount++
        }
        
        // Insert specific feedback entries
        for (const specificText of feedbackData.specific) {
          // Check if this specific feedback already exists (by content)
          const { data: existingSpecific } = await supabase
            .from('feedback_library')
            .select('id')
            .eq('assessment_id', assessmentLeadersId)
            .eq('dimension_id', dimension.id)
            .eq('type', 'specific')
            .eq('feedback', specificText)
            .maybeSingle()
          
          if (!existingSpecific) {
            await supabase
              .from('feedback_library')
              .insert({
                assessment_id: assessmentLeadersId,
                dimension_id: dimension.id,
                type: 'specific',
                feedback: specificText,
                min_score: null,
                max_score: null,
                created_by: adminUser.id,
              })
            feedbackCount++
          }
        }
      }
    }
    
    // Seed Blockers feedback
    if (blockersDimensions) {
      for (const dimension of blockersDimensions) {
        const feedbackData = BLOCKERS_FEEDBACK[dimension.name]
        if (!feedbackData || !feedbackData.overall) continue
        
        // Check if overall feedback exists
        const overallKey = `${assessmentBlockersId}-${dimension.id}-overall`
        if (!existingFeedbackMap.has(overallKey)) {
          await supabase
            .from('feedback_library')
            .insert({
              assessment_id: assessmentBlockersId,
              dimension_id: dimension.id,
              type: 'overall',
              feedback: feedbackData.overall,
              min_score: null,
              max_score: null,
              created_by: adminUser.id,
            })
          feedbackCount++
        }
        
        // Insert specific feedback entries
        for (const specificText of feedbackData.specific) {
          // Check if this specific feedback already exists (by content)
          const { data: existingSpecific } = await supabase
            .from('feedback_library')
            .select('id')
            .eq('assessment_id', assessmentBlockersId)
            .eq('dimension_id', dimension.id)
            .eq('type', 'specific')
            .eq('feedback', specificText)
            .maybeSingle()
          
          if (!existingSpecific) {
            await supabase
              .from('feedback_library')
              .insert({
                assessment_id: assessmentBlockersId,
                dimension_id: dimension.id,
                type: 'specific',
                feedback: specificText,
                min_score: null,
                max_score: null,
                created_by: adminUser.id,
              })
            feedbackCount++
          }
        }
      }
    }
    
    if (feedbackCount > 0) {
      console.log(`  ✓ Created ${feedbackCount} feedback library entries`)
    } else {
      console.log('  ✓ All feedback library entries already exist')
    }

    // Summary
    console.log('\n✅ Seeder completed successfully!\n')
    console.log('📊 Summary:')
    console.log(`  • Client: Demo Client - 360 Survey`)
    console.log(`  • Users: ${USERS.length} across ${GROUPS.length} groups`)
    console.log(`  • Assessments:`)
    console.log(`    - 360: ${DIMENSIONS_360.length} dimensions, ${QUESTIONS_360.length} questions`)
    console.log(`    - Leaders: ${LEADERS_PARENT_DIMENSIONS.length} parent dimensions, ${LEADERS_SUBDIMENSIONS.length} subdimensions, ${LEADERS_QUESTIONS.length} questions`)
    console.log(`    - Blockers: ${BLOCKERS_DIMENSIONS.length} dimensions, ${BLOCKERS_QUESTIONS.length} questions`)
    console.log(`  • Groups: ${GROUPS.length}`)
    console.log(`\n🔗 Next steps:`)
    console.log(`  1. Log in as admin@demo.com / DemoAdmin123!`)
    console.log(`  2. Navigate to the demo client`)
    console.log(`  3. Use the Survey Simulator to create assignments and generate reports`)
    console.log(`  4. Test with 360, Leaders, and Blockers assessments`)
    console.log(`\n👥 Demo Users (${USERS.length} total):`)
    USERS.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.name} (${user.email}) - ${user.position || 'Target'} - Group ${user.groupIndex + 1}`)
    })

  } catch (error) {
    console.error('\n❌ Error during seeding:')
    console.error(error)
    process.exit(1)
  }
}

main()
