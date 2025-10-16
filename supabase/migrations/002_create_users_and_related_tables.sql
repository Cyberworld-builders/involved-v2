-- Create industries table
CREATE TABLE IF NOT EXISTS industries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create languages table
CREATE TABLE IF NOT EXISTS languages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  industry_id UUID REFERENCES industries(id) ON DELETE SET NULL,
  language_id UUID REFERENCES languages(id) ON DELETE SET NULL,
  last_login_at TIMESTAMP WITH TIME ZONE,
  completed_profile BOOLEAN DEFAULT false,
  accepted_terms BOOLEAN,
  accepted_at TIMESTAMP WITH TIME ZONE,
  accepted_signature TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create updated_at triggers for all tables
CREATE TRIGGER update_industries_updated_at 
  BEFORE UPDATE ON industries 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_languages_updated_at 
  BEFORE UPDATE ON languages 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Set up RLS (Row Level Security) policies
ALTER TABLE industries ENABLE ROW LEVEL SECURITY;
ALTER TABLE languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Industries policies
CREATE POLICY "Allow authenticated users to read industries" ON industries
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert industries" ON industries
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update industries" ON industries
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete industries" ON industries
  FOR DELETE USING (auth.role() = 'authenticated');

-- Languages policies
CREATE POLICY "Allow authenticated users to read languages" ON languages
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert languages" ON languages
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update languages" ON languages
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete languages" ON languages
  FOR DELETE USING (auth.role() = 'authenticated');

-- Users policies
CREATE POLICY "Allow authenticated users to read users" ON users
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert users" ON users
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update users" ON users
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete users" ON users
  FOR DELETE USING (auth.role() = 'authenticated');

-- Insert default industries
INSERT INTO industries (name) VALUES 
  ('Technology'),
  ('Healthcare'),
  ('Finance'),
  ('Education'),
  ('Manufacturing'),
  ('Retail'),
  ('Consulting'),
  ('Government'),
  ('Non-profit'),
  ('Other')
ON CONFLICT DO NOTHING;

-- Insert default languages
INSERT INTO languages (name, code) VALUES 
  ('English', 'en'),
  ('Spanish', 'es'),
  ('French', 'fr'),
  ('German', 'de'),
  ('Italian', 'it'),
  ('Portuguese', 'pt'),
  ('Chinese', 'zh'),
  ('Japanese', 'ja'),
  ('Korean', 'ko'),
  ('Arabic', 'ar')
ON CONFLICT (code) DO NOTHING;
