-- Add report-level industry override to report_data.
--
-- Default behavior (NULL): the report uses benchmarks for the target's
-- profiles.industry_id. Setting this column overrides that selection for
-- this specific report — useful when an admin wants a target compared to
-- a different industry's norms (e.g. for cross-context interpretation).
--
-- The benchmark query in src/lib/reports/generate-360-report.ts uses
-- COALESCE(industry_id_override, target.industry_id) to decide which
-- industry's rows to filter on.

ALTER TABLE public.report_data
  ADD COLUMN IF NOT EXISTS industry_id_override UUID REFERENCES public.industries(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.report_data.industry_id_override IS
  'Optional override for which industry''s benchmarks the report uses. NULL means use the target profile''s industry_id (the default).';

CREATE INDEX IF NOT EXISTS idx_report_data_industry_id_override
  ON public.report_data(industry_id_override)
  WHERE industry_id_override IS NOT NULL;
