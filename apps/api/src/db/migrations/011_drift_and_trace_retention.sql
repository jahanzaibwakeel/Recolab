CREATE TABLE IF NOT EXISTS trace_retention_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  sample_rate NUMERIC(5,4) NOT NULL CHECK (sample_rate >= 0 AND sample_rate <= 1),
  retention_days INT NOT NULL CHECK (retention_days >= 1 AND retention_days <= 3650),
  is_active BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sampled_trace_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  item_id UUID REFERENCES items(id) ON DELETE SET NULL,
  algorithm TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('view','export_json','export_html')),
  sampled BOOLEAN NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO trace_retention_policies(name, sample_rate, retention_days, is_active)
VALUES ('default-local-policy', 0.25, 30, true)
ON CONFLICT (name) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_sampled_trace_events_created ON sampled_trace_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trace_retention_policies_active ON trace_retention_policies(is_active);
