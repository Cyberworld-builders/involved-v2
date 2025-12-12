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

-- Allow authenticated users to read invites they sent or received
CREATE POLICY "Allow users to read their invites" ON user_invites
  FOR SELECT USING (
    auth.uid() IN (
      SELECT auth_user_id FROM profiles WHERE id = user_invites.profile_id
    )
    OR 
    auth.uid() IN (
      SELECT auth_user_id FROM profiles WHERE id = user_invites.invited_by
    )
  );

-- Allow authenticated users to insert invites for profiles in their client
-- Additional authorization is enforced at the application level
CREATE POLICY "Allow users to insert invites for their client" ON user_invites
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    AND (
      -- Allow if inviter has no client restriction (e.g., admin)
      (SELECT client_id FROM profiles WHERE auth_user_id = auth.uid()) IS NULL
      OR
      -- Allow if invitee is in the same client as inviter
      (SELECT client_id FROM profiles WHERE id = user_invites.profile_id) = 
      (SELECT client_id FROM profiles WHERE auth_user_id = auth.uid())
      OR
      -- Allow if invitee has no client restriction
      (SELECT client_id FROM profiles WHERE id = user_invites.profile_id) IS NULL
    )
  );

-- Allow users to update invites they sent or received
CREATE POLICY "Allow users to update their invites" ON user_invites
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT auth_user_id FROM profiles WHERE id = user_invites.profile_id
    )
    OR 
    auth.uid() IN (
      SELECT auth_user_id FROM profiles WHERE id = user_invites.invited_by
    )
  );

-- Allow users to delete invites they sent
CREATE POLICY "Allow senders to delete invites" ON user_invites
  FOR DELETE USING (
    auth.uid() IN (
      SELECT auth_user_id FROM profiles WHERE id = user_invites.invited_by
    )
  );
