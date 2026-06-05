CREATE TABLE IF NOT EXISTS experiments (
  id UUID PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  hypothesis TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft','running','paused','completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS experiment_variants (
  id UUID PRIMARY KEY,
  experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  algorithm TEXT NOT NULL,
  weight_config_id UUID REFERENCES model_weight_configs(id) ON DELETE SET NULL,
  traffic_percent NUMERIC(5,2) NOT NULL DEFAULT 50,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(experiment_id, key)
);

CREATE TABLE IF NOT EXISTS user_experiment_assignments (
  id UUID PRIMARY KEY,
  experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES experiment_variants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(experiment_id, user_id)
);

CREATE TABLE IF NOT EXISTS experiment_events (
  id UUID PRIMARY KEY,
  experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES experiment_variants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id UUID REFERENCES items(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  value NUMERIC(10,4) NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO experiments(id, key, name, hypothesis, status)
VALUES (
  '88888888-8888-4888-8888-888888888888',
  'hybrid-vs-semantic',
  'Hybrid vs Semantic Candidate Generation',
  'Semantic retrieval should improve discovery while hybrid ranking protects relevance.',
  'running'
)
ON CONFLICT (key) DO NOTHING;

INSERT INTO experiment_variants(id, experiment_id, key, algorithm, traffic_percent)
VALUES
  ('88888888-0001-4888-8888-888888888888', '88888888-8888-4888-8888-888888888888', 'A', 'hybrid', 50),
  ('88888888-0002-4888-8888-888888888888', '88888888-8888-4888-8888-888888888888', 'B', 'semantic', 50)
ON CONFLICT (experiment_id, key) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_experiment_events_experiment ON experiment_events(experiment_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_experiment_assignments_user ON user_experiment_assignments(user_id);

