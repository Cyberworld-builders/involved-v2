-- Survey Snapshots: preserves full survey state for data recovery
-- Snapshots capture assessment structure, answers, scores, and reports at a point in time.

CREATE TABLE IF NOT EXISTS survey_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id TEXT NOT NULL,
  client_id UUID NOT NULL REFERENCES clients(id),
  assessment_id UUID NOT NULL REFERENCES assessments(id),
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  label TEXT,
  storage_path TEXT NOT NULL,
  pdf_paths JSONB DEFAULT '[]'::jsonb,
  size_bytes BIGINT,
  pdf_count INT DEFAULT 0,
  assignment_count INT DEFAULT 0,
  answer_count INT DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'creating',
  error_message TEXT
);

CREATE INDEX idx_survey_snapshots_survey_id ON survey_snapshots(survey_id);
CREATE INDEX idx_survey_snapshots_client_id ON survey_snapshots(client_id);

-- RLS
ALTER TABLE survey_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view snapshots for their client"
  ON survey_snapshots FOR SELECT
  USING (
    client_id IN (
      SELECT client_id FROM profiles
      WHERE auth_user_id = auth.uid()
        AND access_level IN ('client_admin', 'super_admin')
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE auth_user_id = auth.uid()
        AND access_level = 'super_admin'
    )
  );

CREATE POLICY "Service role can manage snapshots"
  ON survey_snapshots FOR ALL
  USING (true)
  WITH CHECK (true);

-- Storage bucket for snapshots
INSERT INTO storage.buckets (id, name, public)
VALUES ('survey-snapshots', 'survey-snapshots', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Admins can read snapshots"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'survey-snapshots'
    AND (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE auth_user_id = auth.uid()
          AND access_level IN ('client_admin', 'super_admin')
      )
    )
  );

CREATE POLICY "Service role can write snapshots"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'survey-snapshots');

CREATE POLICY "Service role can delete snapshots"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'survey-snapshots');
