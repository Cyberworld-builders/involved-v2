-- Create assessments table
CREATE TABLE IF NOT EXISTS assessments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  logo TEXT, -- URL to logo image in storage
  background TEXT, -- URL to background image in storage
  primary_color TEXT DEFAULT '#2D2E30',
  accent_color TEXT DEFAULT '#FFBA00',
  split_questions BOOLEAN DEFAULT false,
  questions_per_page INTEGER DEFAULT 10,
  timed BOOLEAN DEFAULT false,
  time_limit INTEGER, -- Time limit in minutes
  target TEXT, -- Target user for the assessment
  is_360 BOOLEAN DEFAULT false, -- 360-degree assessment flag
  type TEXT NOT NULL DEFAULT 'custom' CHECK (type IN ('360', 'blockers', 'leader', 'custom')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'archived')),
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create dimensions table
CREATE TABLE IF NOT EXISTS dimensions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  parent_id UUID REFERENCES dimensions(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Ensure unique dimension names per assessment
  UNIQUE(assessment_id, name)
);

-- Create fields table (renamed from questions to match our form structure)
CREATE TABLE IF NOT EXISTS fields (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE NOT NULL,
  dimension_id UUID REFERENCES dimensions(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('rich_text', 'multiple_choice', 'slider')),
  content TEXT NOT NULL, -- Rich text content or question text
  "order" INTEGER NOT NULL, -- Display order
  anchors JSONB DEFAULT '[]'::jsonb, -- Array of anchor objects: [{id, name, value, practice}]
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_assessments_created_by ON assessments(created_by);
CREATE INDEX IF NOT EXISTS idx_assessments_status ON assessments(status);
CREATE INDEX IF NOT EXISTS idx_dimensions_assessment_id ON dimensions(assessment_id);
CREATE INDEX IF NOT EXISTS idx_dimensions_parent_id ON dimensions(parent_id);
CREATE INDEX IF NOT EXISTS idx_fields_assessment_id ON fields(assessment_id);
CREATE INDEX IF NOT EXISTS idx_fields_dimension_id ON fields(dimension_id);
CREATE INDEX IF NOT EXISTS idx_fields_order ON fields(assessment_id, "order");

-- Create updated_at triggers
CREATE TRIGGER update_assessments_updated_at 
  BEFORE UPDATE ON assessments 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dimensions_updated_at 
  BEFORE UPDATE ON dimensions 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fields_updated_at 
  BEFORE UPDATE ON fields 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE dimensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE fields ENABLE ROW LEVEL SECURITY;

-- Assessments RLS policies
-- Users can view assessments they created
CREATE POLICY "Users can view their own assessments" ON assessments
  FOR SELECT USING (auth.uid() = created_by);

-- Users can create assessments
CREATE POLICY "Users can create assessments" ON assessments
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Users can update their own assessments
CREATE POLICY "Users can update their own assessments" ON assessments
  FOR UPDATE USING (auth.uid() = created_by);

-- Users can delete their own assessments
CREATE POLICY "Users can delete their own assessments" ON assessments
  FOR DELETE USING (auth.uid() = created_by);

-- Dimensions RLS policies
-- Users can view dimensions for assessments they created
CREATE POLICY "Users can view dimensions for their assessments" ON dimensions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM assessments 
      WHERE assessments.id = dimensions.assessment_id 
      AND assessments.created_by = auth.uid()
    )
  );

-- Users can create dimensions for their assessments
CREATE POLICY "Users can create dimensions for their assessments" ON dimensions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM assessments 
      WHERE assessments.id = dimensions.assessment_id 
      AND assessments.created_by = auth.uid()
    )
  );

-- Users can update dimensions for their assessments
CREATE POLICY "Users can update dimensions for their assessments" ON dimensions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM assessments 
      WHERE assessments.id = dimensions.assessment_id 
      AND assessments.created_by = auth.uid()
    )
  );

-- Users can delete dimensions for their assessments
CREATE POLICY "Users can delete dimensions for their assessments" ON dimensions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM assessments 
      WHERE assessments.id = dimensions.assessment_id 
      AND assessments.created_by = auth.uid()
    )
  );

-- Fields RLS policies
-- Users can view fields for assessments they created
CREATE POLICY "Users can view fields for their assessments" ON fields
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM assessments 
      WHERE assessments.id = fields.assessment_id 
      AND assessments.created_by = auth.uid()
    )
  );

-- Users can create fields for their assessments
CREATE POLICY "Users can create fields for their assessments" ON fields
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM assessments 
      WHERE assessments.id = fields.assessment_id 
      AND assessments.created_by = auth.uid()
    )
  );

-- Users can update fields for their assessments
CREATE POLICY "Users can update fields for their assessments" ON fields
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM assessments 
      WHERE assessments.id = fields.assessment_id 
      AND assessments.created_by = auth.uid()
    )
  );

-- Users can delete fields for their assessments
CREATE POLICY "Users can delete fields for their assessments" ON fields
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM assessments 
      WHERE assessments.id = fields.assessment_id 
      AND assessments.created_by = auth.uid()
    )
  );

-- Create storage bucket for assessment assets (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public)
VALUES ('assessment-assets', 'assessment-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy for assessment assets
-- Allow authenticated users to upload assessment assets
CREATE POLICY "Allow authenticated users to upload assessment assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'assessment-assets');

-- Allow authenticated users to read assessment assets
CREATE POLICY "Allow authenticated users to read assessment assets"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'assessment-assets');

-- Allow authenticated users to update their assessment assets
CREATE POLICY "Allow authenticated users to update assessment assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'assessment-assets');

-- Allow authenticated users to delete their assessment assets
CREATE POLICY "Allow authenticated users to delete assessment assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'assessment-assets');


