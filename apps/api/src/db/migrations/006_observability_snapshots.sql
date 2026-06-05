CREATE TABLE IF NOT EXISTS observability_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  timers JSONB NOT NULL DEFAULT '{}'::jsonb,
  counters JSONB NOT NULL DEFAULT '{}'::jsonb,
  derived JSONB NOT NULL DEFAULT '{}'::jsonb,
  uptime_seconds INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_observability_snapshots_captured_at
  ON observability_snapshots(captured_at DESC);
