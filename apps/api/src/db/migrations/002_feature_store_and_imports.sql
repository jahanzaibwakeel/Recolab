CREATE TABLE IF NOT EXISTS dataset_imports (
  id UUID PRIMARY KEY,
  source TEXT NOT NULL,
  source_path TEXT NOT NULL,
  imported_users INT NOT NULL DEFAULT 0,
  imported_items INT NOT NULL DEFAULT 0,
  imported_ratings INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('running','completed','failed')),
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS user_features (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  rating_count INT NOT NULL DEFAULT 0,
  avg_rating NUMERIC(10,4) NOT NULL DEFAULT 0,
  preferred_genre_scores JSONB NOT NULL DEFAULT '{}',
  last_interaction_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS item_features (
  item_id UUID PRIMARY KEY REFERENCES items(id) ON DELETE CASCADE,
  rating_count INT NOT NULL DEFAULT 0,
  avg_rating NUMERIC(10,4) NOT NULL DEFAULT 0,
  popularity_score NUMERIC(10,6) NOT NULL DEFAULT 0,
  save_rate NUMERIC(10,6) NOT NULL DEFAULT 0,
  dislike_rate NUMERIC(10,6) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_item_features_popularity ON item_features(popularity_score DESC);
CREATE INDEX IF NOT EXISTS idx_dataset_imports_created ON dataset_imports(created_at DESC);

