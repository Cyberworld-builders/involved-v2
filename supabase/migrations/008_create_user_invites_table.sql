-- Create user_invites table to track invite tokens and status
CREATE TABLE IF NOT EXISTS user_invites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  invited_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster token lookups
CREATE INDEX idx_user_invites_token ON user_invites(token);
CREATE INDEX idx_user_invites_profile_id ON user_invites(profile_id);
CREATE INDEX idx_user_invites_status ON user_invites(status);

-- Create updated_at trigger
CREATE TRIGGER update_user_invites_updated_at 
  BEFORE UPDATE ON user_invites 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Set up RLS (Row Level Security) policies
ALTER TABLE user_invites ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all invites
CREATE POLICY "Allow authenticated users to read user_invites" ON user_invites
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert invites
CREATE POLICY "Allow authenticated users to insert user_invites" ON user_invites
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to update invites
CREATE POLICY "Allow authenticated users to update user_invites" ON user_invites
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Allow authenticated users to delete invites
CREATE POLICY "Allow authenticated users to delete user_invites" ON user_invites
  FOR DELETE USING (auth.role() = 'authenticated');
