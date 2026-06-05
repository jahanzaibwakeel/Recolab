ALTER TABLE model_canary_rollouts
  ADD COLUMN IF NOT EXISTS live_routing_enabled BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE trace_retention_policies
  ADD COLUMN IF NOT EXISTS export_format TEXT NOT NULL DEFAULT 'both',
  ADD COLUMN IF NOT EXISTS storage_mode TEXT NOT NULL DEFAULT 'download_only',
  ADD COLUMN IF NOT EXISTS include_feature_values BOOLEAN NOT NULL DEFAULT true;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'trace_retention_policies_export_format_check'
  ) THEN
    ALTER TABLE trace_retention_policies
      ADD CONSTRAINT trace_retention_policies_export_format_check
      CHECK (export_format IN ('json','html','both'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'trace_retention_policies_storage_mode_check'
  ) THEN
    ALTER TABLE trace_retention_policies
      ADD CONSTRAINT trace_retention_policies_storage_mode_check
      CHECK (storage_mode IN ('download_only','local_file'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS drift_feature_baselines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key TEXT NOT NULL UNIQUE,
  feature_label TEXT NOT NULL,
  baseline_value NUMERIC(12,6) NOT NULL,
  baseline_window_days INT NOT NULL DEFAULT 30,
  metadata JSONB NOT NULL DEFAULT '{}',
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  captured_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_drift_feature_baselines_captured ON drift_feature_baselines(captured_at DESC);
