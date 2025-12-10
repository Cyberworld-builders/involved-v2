-- Create benchmarks table
CREATE TABLE IF NOT EXISTS benchmarks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dimension_id UUID REFERENCES dimensions(id) ON DELETE CASCADE NOT NULL,
  industry_id UUID REFERENCES industries(id) ON DELETE CASCADE NOT NULL,
  value DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Unique constraint to prevent duplicate benchmarks
  UNIQUE(dimension_id, industry_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_benchmarks_dimension_id ON benchmarks(dimension_id);
CREATE INDEX IF NOT EXISTS idx_benchmarks_industry_id ON benchmarks(industry_id);
CREATE INDEX IF NOT EXISTS idx_benchmarks_dimension_industry ON benchmarks(dimension_id, industry_id);

-- Create updated_at trigger
CREATE TRIGGER update_benchmarks_updated_at 
  BEFORE UPDATE ON benchmarks 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE benchmarks ENABLE ROW LEVEL SECURITY;

-- Benchmarks RLS policies
-- Users can view benchmarks for dimensions in assessments they created
CREATE POLICY "Users can view benchmarks for their assessments" ON benchmarks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM dimensions
      INNER JOIN assessments ON assessments.id = dimensions.assessment_id
      WHERE dimensions.id = benchmarks.dimension_id
      AND assessments.created_by = auth.uid()
    )
  );

-- Users can create benchmarks for dimensions in assessments they created
CREATE POLICY "Users can create benchmarks for their assessments" ON benchmarks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM dimensions
      INNER JOIN assessments ON assessments.id = dimensions.assessment_id
      WHERE dimensions.id = benchmarks.dimension_id
      AND assessments.created_by = auth.uid()
    )
  );

-- Users can update benchmarks for dimensions in assessments they created
CREATE POLICY "Users can update benchmarks for their assessments" ON benchmarks
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM dimensions
      INNER JOIN assessments ON assessments.id = dimensions.assessment_id
      WHERE dimensions.id = benchmarks.dimension_id
      AND assessments.created_by = auth.uid()
    )
  );

-- Users can delete benchmarks for dimensions in assessments they created
CREATE POLICY "Users can delete benchmarks for their assessments" ON benchmarks
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM dimensions
      INNER JOIN assessments ON assessments.id = dimensions.assessment_id
      WHERE dimensions.id = benchmarks.dimension_id
      AND assessments.created_by = auth.uid()
    )
  );

