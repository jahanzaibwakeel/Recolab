import "dotenv/config";

export const config = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: process.env.DATABASE_URL ?? "postgres://recolab:recolab@localhost:5432/recolab",
  jwtSecret: process.env.JWT_SECRET ?? "recolab-local-development-secret-change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "8h",
  demoPassword: process.env.DEMO_PASSWORD ?? "recolab-demo",
  valkeyUrl: process.env.VALKEY_URL ?? "redis://localhost:6379",
  ollamaUrl: process.env.OLLAMA_URL ?? "http://localhost:11434",
  ollamaModel: process.env.OLLAMA_MODEL ?? "llama3.2",
  ollamaEmbeddingModel: process.env.OLLAMA_EMBEDDING_MODEL ?? "nomic-embed-text",
  qdrantUrl: process.env.QDRANT_URL ?? "http://localhost:6333",
  qdrantCollection: process.env.QDRANT_COLLECTION ?? "recolab_items",
  embeddingDimensions: Number(process.env.EMBEDDING_DIMENSIONS ?? 128),
  artifactDir: process.env.ARTIFACT_DIR ?? "../../artifacts",
  traceArchiveDir: process.env.TRACE_ARCHIVE_DIR ?? "../../artifacts/trace-exports",
  cacheTtlSeconds: Number(process.env.CACHE_TTL_SECONDS ?? 180),
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000),
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX ?? 240),
  alertApiAvgMs: Number(process.env.ALERT_API_AVG_MS ?? 500),
  alertRecommendationAvgMs: Number(process.env.ALERT_RECOMMENDATION_AVG_MS ?? 1200),
  alertOllamaAvgMs: Number(process.env.ALERT_OLLAMA_AVG_MS ?? 3500),
  alertMinCacheHitRate: Number(process.env.ALERT_MIN_CACHE_HIT_RATE ?? 0.35),
  alertMaxExplanationFallbackRate: Number(process.env.ALERT_MAX_EXPLANATION_FALLBACK_RATE ?? 0.5),
  alertMaxEmbeddingFallbackRate: Number(process.env.ALERT_MAX_EMBEDDING_FALLBACK_RATE ?? 0.5)
};
