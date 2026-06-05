CREATE TABLE IF NOT EXISTS item_embeddings (
  item_id UUID PRIMARY KEY REFERENCES items(id) ON DELETE CASCADE,
  embedding_model TEXT NOT NULL,
  dimensions INT NOT NULL,
  vector REAL[] NOT NULL,
  text_hash TEXT NOT NULL,
  qdrant_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS model_weight_configs (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  weights JSONB NOT NULL,
  diversity_lambda NUMERIC(10,6) NOT NULL DEFAULT 0.08,
  exploration_rate NUMERIC(10,6) NOT NULL DEFAULT 0.08,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO model_weight_configs(id, name, weights, diversity_lambda, exploration_rate, is_active)
VALUES (
  '99999999-9999-4999-8999-999999999999',
  'balanced-semantic-hybrid',
  '{"popularity":0.15,"content":0.30,"collaborative":0.30,"semantic":0.25}',
  0.08,
  0.08,
  true
)
ON CONFLICT (name) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_item_embeddings_model ON item_embeddings(embedding_model);
CREATE INDEX IF NOT EXISTS idx_model_weight_configs_active ON model_weight_configs(is_active);

