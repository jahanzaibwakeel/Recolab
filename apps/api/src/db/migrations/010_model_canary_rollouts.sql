CREATE TABLE IF NOT EXISTS model_canary_rollouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_version TEXT NOT NULL REFERENCES model_versions(version) ON DELETE CASCADE,
  baseline_version TEXT NOT NULL,
  traffic_percent NUMERIC(5,2) NOT NULL CHECK (traffic_percent >= 0 AND traffic_percent <= 100),
  status TEXT NOT NULL CHECK (status IN ('draft','running','paused','rolled_back','promoted')) DEFAULT 'draft',
  guardrail_metrics JSONB NOT NULL DEFAULT '{}',
  notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_model_canary_rollouts_status ON model_canary_rollouts(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_model_canary_rollouts_candidate ON model_canary_rollouts(candidate_version);
