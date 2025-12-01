# Involved Talent v2

A modern, fullstack talent assessment platform built with Next.js 14, TypeScript, Tailwind CSS, and Supabase.

## 🚀 Features

- **Modern Tech Stack**: Next.js 14 with App Router, TypeScript, Tailwind CSS
- **Authentication**: Supabase Auth with email/password and OAuth providers
- **Database**: PostgreSQL via Supabase with real-time subscriptions
- **Deployment**: Optimized for Vercel deployment
- **UI Components**: Custom component library with shadcn/ui
- **Type Safety**: Full TypeScript coverage with database types

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS, CSS Modules
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Deployment**: Vercel
- **Package Manager**: npm

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account
- Vercel account (for deployment)

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone git@github.com:Cyberworld-builders/involved-v2.git
cd involved-v2
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up Supabase

**Option A: Local Development (Recommended)**

The project includes a pre-configured `.env.local` for local Supabase:

```bash
# Local Supabase is already configured!
# Just make sure it's running:
npx supabase start
npm run dev
```

**Option B: Staging Supabase**

1. Create a staging project at [supabase.com](https://supabase.com)
2. Get your project URL and anon key from the project settings
3. Update `.env.staging` with your credentials, then switch to it:

```bash
# Edit .env.staging with your staging credentials
./switch-env.sh staging
# or manually: cp .env.staging .env.local
```

**Environment Files:**
- `.env.local` - Active config (local by default)
- `.env.staging` - Template for staging Supabase
- `.env.production` - Production config (coming after staging validation)
- `.env.example` - Example/template for reference

See [ENV_SETUP.md](./ENV_SETUP.md) for detailed environment configuration.

<details>
<summary>Manual .env.local setup</summary>

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME="Involved Talent"
```

</details>

### 4. Set up the database

Run the following SQL in your Supabase SQL editor to create the initial tables:

```sql
-- Create profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'client', 'user')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create assessments table
CREATE TABLE assessments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('360', 'blockers', 'leader', 'custom')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'archived')),
  created_by UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create questions table
CREATE TABLE questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE NOT NULL,
  text TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('multiple_choice', 'rating', 'text', 'boolean')),
  "order" INTEGER NOT NULL,
  required BOOLEAN DEFAULT true,
  options JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view assessments they created" ON assessments FOR SELECT USING (auth.uid() = created_by);
CREATE POLICY "Users can create assessments" ON assessments FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update their assessments" ON assessments FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can view questions for their assessments" ON questions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM assessments 
    WHERE assessments.id = questions.assessment_id 
    AND assessments.created_by = auth.uid()
  )
);
```

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Dashboard pages
│   └── ...
├── components/            # Reusable UI components
│   └── ui/               # Base UI components
├── lib/                  # Utility libraries
│   ├── supabase/         # Supabase client configuration
│   └── utils.ts          # Utility functions
├── types/                # TypeScript type definitions
└── hooks/                # Custom React hooks
```

## 🚀 Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add your environment variables in Vercel dashboard
4. Deploy!

The app will be automatically deployed on every push to the main branch.

## 🔧 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Code Style

- Use TypeScript for all new files
- Follow the existing component patterns
- Use Tailwind CSS for styling
- Write meaningful commit messages

## 📝 License

This project is proprietary software owned by Cyberworld Builders.

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## 📞 Support

For support, email support@cyberworldbuilders.com