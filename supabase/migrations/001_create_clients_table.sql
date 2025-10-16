-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  logo TEXT,
  background TEXT,
  primary_color TEXT,
  accent_color TEXT,
  require_profile BOOLEAN DEFAULT false,
  require_research BOOLEAN DEFAULT false,
  whitelabel BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_clients_updated_at 
  BEFORE UPDATE ON clients 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Create storage bucket for client assets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('client-assets', 'client-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS (Row Level Security) policies
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all clients
CREATE POLICY "Allow authenticated users to read clients" ON clients
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert clients
CREATE POLICY "Allow authenticated users to insert clients" ON clients
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to update clients
CREATE POLICY "Allow authenticated users to update clients" ON clients
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Allow authenticated users to delete clients
CREATE POLICY "Allow authenticated users to delete clients" ON clients
  FOR DELETE USING (auth.role() = 'authenticated');

-- Set up storage policies for client-assets bucket
CREATE POLICY "Allow authenticated users to upload client assets" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'client-assets' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Allow authenticated users to view client assets" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'client-assets' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Allow authenticated users to update client assets" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'client-assets' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Allow authenticated users to delete client assets" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'client-assets' 
    AND auth.role() = 'authenticated'
  );
