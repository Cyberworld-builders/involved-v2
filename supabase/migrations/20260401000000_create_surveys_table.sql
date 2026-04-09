-- Create surveys table: first-class entity for survey rounds
-- Previously, surveys were just a UUID grouping on assignments.survey_id

CREATE TABLE IF NOT EXISTS surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE NOT NULL,
  name TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Index for client-scoped queries
CREATE INDEX idx_surveys_client_id ON surveys(client_id);
CREATE INDEX idx_surveys_assessment_id ON surveys(assessment_id);

-- Updated_at trigger
CREATE TRIGGER update_surveys_updated_at
  BEFORE UPDATE ON surveys
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;

-- RLS policies: same pattern as other client-scoped tables
CREATE POLICY "Service role has full access to surveys"
  ON surveys FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Users can view surveys for their client"
  ON surveys FOR SELECT
  USING (
    client_id IN (
      SELECT client_id FROM profiles WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage surveys for their client"
  ON surveys FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE auth_user_id = auth.uid()
      AND (role = 'admin' OR access_level = 'super_admin')
      AND (client_id = surveys.client_id OR access_level = 'super_admin')
    )
  );

-- Backfill: create survey rows from existing assignment data
-- Each distinct survey_id on assignments becomes a row in surveys
INSERT INTO surveys (id, client_id, assessment_id, created_at, updated_at)
SELECT DISTINCT ON (a.survey_id)
  a.survey_id,
  COALESCE(g.client_id, p.client_id),
  a.assessment_id,
  MIN(a.created_at) OVER (PARTITION BY a.survey_id),
  now()
FROM assignments a
LEFT JOIN groups g ON g.id = a.group_id
LEFT JOIN profiles p ON p.id = a.user_id
WHERE a.survey_id IS NOT NULL
ORDER BY a.survey_id, a.created_at ASC
ON CONFLICT (id) DO NOTHING;

-- Add FK constraint on assignments.survey_id
ALTER TABLE assignments
  ADD CONSTRAINT assignments_survey_id_fkey
  FOREIGN KEY (survey_id) REFERENCES surveys(id) ON DELETE SET NULL;

-- Fix survey_snapshots: change survey_id from TEXT to UUID and add FK
-- First drop the old column and recreate as UUID
ALTER TABLE survey_snapshots
  ALTER COLUMN survey_id TYPE UUID USING survey_id::uuid;

ALTER TABLE survey_snapshots
  ADD CONSTRAINT survey_snapshots_survey_id_fkey
  FOREIGN KEY (survey_id) REFERENCES surveys(id) ON DELETE CASCADE;
