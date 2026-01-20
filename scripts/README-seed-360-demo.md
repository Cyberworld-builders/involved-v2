# 360 Survey Demo Seeder

This script creates a comprehensive 360-degree assessment demo with:

- **1 Demo Client**: "Demo Client - 360 Survey"
- **1 Industry**: "Technology" (with benchmarks)
- **1 360 Assessment**: "360-Degree Leadership Assessment - Demo"
  - 9 dimensions (Communication, Leadership, Teamwork, Problem Solving, Adaptability, Innovation, Accountability, Strategic Thinking, Emotional Intelligence)
  - 30 multiple choice questions (3-4 per dimension)
  - 30 description fields (one per question)
  - 30 text input fields (one per question)
  - Page breaks between questions
  - Industry benchmarks for all dimensions
- **5 Demo Users**:
  - Sarah Johnson (Supervisor)
  - Michael Chen (Target/Self)
  - Emily Rodriguez (Subordinate)
  - David Kim (Subordinate)
  - Jessica Williams (Subordinate)
- **1 Group**: "360 Assessment Group - Demo" with all 5 users
- **5 Assignments**: One for each user, all completed
- **150+ Answers**: Multiple choice and text feedback answers

## Prerequisites

1. Supabase must be running locally or connected to remote
2. Environment variables must be set in `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

## Running the Seeder

```bash
npm run seed:360-demo
```

Or directly with tsx:

```bash
npx tsx scripts/seed-360-demo.ts
```

## What Gets Created

### Client & Industry
- Creates a demo client if it doesn't exist
- Creates "Technology" industry if it doesn't exist
- Sets up industry benchmarks for all 9 dimensions

### Users
- Creates 5 demo users with auth accounts
- All users have password: `DemoUser123!`
- Admin user: `admin@demo.com` / `DemoAdmin123!`

### Assessment Structure
Each question follows this pattern:
1. **Description field** (rich_text) - Context and guidance
2. **Multiple choice question** - 5-point scale with anchor insights
3. **Text input field** - For additional feedback
4. **Page break** (except after last question)

### Answers
- Multiple choice answers are generated with organic variation:
  - Self-assessment: Slightly higher scores (avg ~3.5)
  - Supervisor: Slightly more critical (avg ~3.2)
  - Subordinates: Slightly positive (avg ~3.3)
- Text feedback is provided for ~70% of questions
- All assignments are marked as completed

## After Seeding

1. Log in as `admin@demo.com` with password `DemoAdmin123!`
2. Navigate to the "Demo Client - 360 Survey" client
3. View the assessment: "360-Degree Leadership Assessment - Demo"
4. View the group: "360 Assessment Group - Demo"
5. Generate a 360 report for **Michael Chen** (the target)

## Notes

- The seeder is idempotent - it will reuse existing data if found
- Users are created with auth accounts, so you can log in as any of them
- All assignments are pre-completed with realistic answer data
- Industry benchmarks are set to realistic values (3.0-3.5 range)
