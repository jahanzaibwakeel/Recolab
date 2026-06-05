import { createServer } from "node:http";
import { pathToFileURL } from "node:url";

const port = Number(process.env.MOCK_API_PORT ?? 4010);

const user = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "ada@recolab.local",
  name: "Ada",
  role: "admin",
  preferredGenres: ["Sci-Fi"],
  preferredSkills: ["systems"],
  blockedGenres: ["Horror"],
  boostedProviders: ["MovieLens"],
  boostedTags: ["cyberpunk"],
  personalExploration: 0.12
};

const item = {
  id: "aaaaaaaa-0001-4000-8000-000000000001",
  domain: "movies",
  title: "The Matrix",
  description: "A hacker discovers a simulated reality.",
  genres: ["Action", "Sci-Fi"],
  tags: ["simulation", "cyberpunk"],
  provider: "MovieLens",
  releaseYear: 1999
};

function json(res, body, status = 200) {
  res.writeHead(status, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Content-Type": "application/json"
  });
  res.end(JSON.stringify(body));
}

function text(res, body, contentType = "text/plain") {
  res.writeHead(200, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Content-Type": contentType
  });
  res.end(body);
}

function catalogSearch() {
  return {
    rows: [item],
    total: 1,
    limit: 24,
    offset: 0,
    facets: {
      domains: [{ value: "movies", count: 1 }],
      genres: [{ value: "Sci-Fi", count: 1 }],
      tags: [{ value: "simulation", count: 1 }]
    }
  };
}

function recommendation() {
  return {
    item,
    score: 0.91,
    algorithm: "hybrid",
    modelVersion: "test",
    explanation: {
      generatedText: "Recommended because it matches Sci-Fi and semantic profile signals.",
      reasonCodes: ["semantic-profile-match"],
      modelContributions: { content: 0.8, semantic: 0.7 },
      matchedAttributes: ["Sci-Fi"],
      coldStart: false,
      pipeline: [{ stage: "candidate_generation", inputCount: 12, outputCount: 8, notes: [] }]
    }
  };
}

function trace() {
  return {
    user,
    item,
    algorithm: "hybrid",
    modelVersion: "test",
    diversityLambda: 0.08,
    explorationRate: 0.08,
    seenItemIds: [],
    pipeline: [{ stage: "candidate_generation", inputCount: 12, outputCount: 8, notes: ["demo"] }],
    selectedCandidate: {
      score: 0.91,
      modelContributions: { content: 0.8, semantic: 0.7 },
      matchedAttributes: ["Sci-Fi"],
      reasonCodes: ["semantic-profile-match"]
    },
    featureValues: { semanticScore: 0.72, semanticCandidate: true },
    candidatePreview: [{ itemId: item.id, title: item.title, score: 0.91 }],
    similarCandidates: [{ itemId: "2", title: "Inception", overlapCount: 2 }]
  };
}

function route(req, res) {
  const url = new URL(req.url ?? "/", `http://localhost:${port}`);
  const path = url.pathname;

  if (req.method === "OPTIONS") return text(res, "");
  if (path === "/health") return json(res, { status: "ok" });
  if (path === "/users") return json(res, [user]);
  if (path === `/users/${user.id}`) return json(res, user);
  if (path.endsWith("/preferences")) return json(res, user);
  if (path.endsWith("/history")) return json(res, { userId: user.id, savedItems: [item], interactions: [], ratings: [], recommendations: [] });
  if (path.endsWith("/privacy/export")) return json(res, { generatedAt: "now", user, ratings: [], interactions: [], recommendationResults: [], explanationLogs: [] });
  if (path.endsWith("/privacy/anonymize")) return json(res, { status: "anonymized", user: { id: user.id, name: "Deleted user" } });
  if (path === "/auth/login") return json(res, { token: "demo-token", refreshToken: "demo-refresh-token", refreshTokenExpiresAt: "2099-01-01T00:00:00.000Z", user });
  if (path === "/auth/refresh") return json(res, { token: "demo-token-2", refreshToken: "demo-refresh-token-2", refreshTokenExpiresAt: "2099-01-01T00:00:00.000Z", user });
  if (path === "/auth/logout") return json(res, { status: "signed-out" });
  if (path === "/auth/password-reset/request") return json(res, { status: "reset-requested", resetToken: "local-reset-token", expiresAt: "2099-01-01T00:00:00.000Z" });
  if (path === "/auth/password-reset/confirm") return json(res, { status: "password-updated" });
  if (path === "/items" && url.searchParams.size > 0) return json(res, catalogSearch());
  if (path === "/items") return json(res, [item]);
  if (path === `/items/${item.id}`) return json(res, item);
  if (path.endsWith("/similar")) return json(res, [{ item, similarity: 0.8, matchedAttributes: ["Sci-Fi"] }]);

  if (path.startsWith("/recommendations/") && path.includes("/trace/")) {
    if (path.endsWith("/export")) {
      return text(res, url.searchParams.get("format") === "html" ? "<html><body>RecoLab Trace</body></html>" : JSON.stringify({ item }), url.searchParams.get("format") === "html" ? "text/html" : "application/json");
    }
    return json(res, trace());
  }
  if (path.startsWith("/recommendations/") && path.includes("/ab-test")) {
    return json(res, { simulatedWinner: "hybrid", hypothesis: "Hybrid improves relevance.", variantA: { name: "hybrid", recommendations: [{ item }] }, variantB: { name: "semantic", recommendations: [{ item }] } });
  }
  if (path.startsWith("/recommendations/")) return json(res, [recommendation()]);

  if (path === "/admin/metrics") return json(res, { modelVersion: "test", evaluation: [], counts: { users: 1, items: 1, ratings: 1, interactions: 0, explanations: 0 } });
  if (path === "/admin/observability") return json(res, { timers: { api: { avgMs: 22 }, recommendation: { avgMs: 45 }, ollama_explanation: { avgMs: 120 } }, counters: {}, derived: { cacheHitRate: 0.6, explanationFallbackRate: 0.1 }, startedAt: "now" });
  if (path === "/admin/observability/alerts") return json(res, { status: "ok", alerts: [{ key: "api_latency", label: "API latency", severity: "ok", value: 22, threshold: 500, unit: "ms", message: "API latency should stay below 500ms." }] });
  if (path === "/admin/observability/history") return json(res, [
    { capturedAt: "2026-06-04T10:00:00.000Z", timers: { api: { avgMs: 20 }, recommendation: { avgMs: 40 }, ollama_explanation: { avgMs: 100 } }, counters: {}, derived: { cacheHitRate: 0.5, explanationFallbackRate: 0.2 } },
    { capturedAt: "2026-06-04T10:01:00.000Z", timers: { api: { avgMs: 22 }, recommendation: { avgMs: 45 }, ollama_explanation: { avgMs: 120 } }, counters: {}, derived: { cacheHitRate: 0.6, explanationFallbackRate: 0.1 } }
  ]);
  if (path === "/admin/model-registry") return json(res, { versions: [], weightConfigs: [], embeddings: { embedding_count: 1, embedding_model: "nomic-embed-text" } });
  if (path === "/admin/model-governance") return json(res, { summary: { pending: 1, approved: 0, rejected: 0, active: 1 }, versions: [{ version: "local-candidate", status: "training", approval_status: "pending", artifact_path: "artifacts/models/local-candidate.json", metrics: [{ precisionAtK: 0.4, recallAtK: 0.3, ndcgAtK: 0.5 }] }] });
  if (path.startsWith("/admin/model-governance/")) return json(res, { status: "ok" });
  if (path === "/admin/model-canaries" && req.method === "GET") return json(res, { activeModelVersion: "test", summary: { running: 1, paused: 0, promoted: 0 }, rollouts: [{ id: user.id, candidate_version: "local-candidate", candidate_approval_status: "approved", status: "running", live_routing_enabled: false, traffic_percent: 10, assignedUsers: 1, totalEligibleUsers: 1, simulation: { recommendation: "expand", ndcgDelta: 0.02, precisionDelta: 0.01 } }] });
  if (path.startsWith("/admin/model-canaries")) return json(res, { status: "ok" });
  if (path === "/admin/experiments") return json(res, [{ experimentKey: "x", name: "Hybrid vs Semantic", variant: "A", algorithm: "hybrid", assignedUsers: 1, events: 10, positiveRate: 0.3, dislikeRate: 0.1, lift: 0, relativeLift: 0, confidenceInterval95: { low: 0, high: 0 }, significance: "baseline", recommendation: "baseline" }]);
  if (path === "/admin/queues") return json(res, { queue: "model-refresh", status: "connected", counts: { waiting: 0, active: 0, completed: 1, failed: 0, delayed: 0, paused: 0 }, recent: [], failed: [] });
  if (path === "/admin/data-quality") return json(res, { summary: { sparseUsers: 1, coldStartItems: 1, coldStartItemRate: 0.1, metadataGapItems: 0 }, sparseUsers: [{ id: "u1", name: "Ada", ratingCount: 1, avgRating: 4.5 }], coldStartItems: [{ id: "i1", title: "New Catalog Item", domain: "movies", ratingCount: 0 }], domainCoverage: [{ domain: "movies", itemCount: 10 }], genreCoverage: [{ genre: "Sci-Fi", itemCount: 4 }], metadataGaps: [] });
  if (path === "/admin/drift-report") return json(res, { status: "ok", volumes: { recentRatings: 1, baselineRatings: 10, recentFeedback: 2, recentRecommendations: 3 }, signals: [{ key: "avg_rating", label: "Average rating drift", recent: 4.1, baseline: 4, delta: 0.1, severity: "ok" }], featureBaselines: [{ key: "avg_item_popularity", label: "Average item popularity", value: 0.4, baseline: 0.5, delta: -0.1, severity: "ok" }] });
  if (path === "/admin/drift-report/baselines") return json(res, []);
  if (path === "/admin/trace-retention") return json(res, { policy: { sample_rate: 0.25, retention_days: 30, export_format: "both", storage_mode: "download_only", include_feature_values: true }, sampledTraceEvents: { sampled: 1, total: 2 }, explanationLogs: { total: 1 }, recommendationResults: { total: 1 } });
  if (path === "/admin/trace-retention/policy" || path === "/admin/trace-retention/cleanup") return json(res, { deletedTraceEvents: 1 });
  if (path === "/admin/privacy-audit") return json(res, [{ id: "p1", action: "export", target_name: "Ada", actor_name: "Ada", created_at: "2026-06-05T00:00:00.000Z" }]);
  if (path === "/admin/explanation-logs") return json(res, []);
  if (path === "/admin/weights/preview") return json(res, { recommendations: [{ item, score: 0.91 }], weights: { semantic: 0.4 } });
  if (path === "/admin/model-comparison") return json(res, { rows: [{ algorithm: "hybrid", summary: { averageScore: 0.91, diversityRatio: 0.5, uniqueGenreCount: 2, contributionAverages: { semantic: 0.7 } }, recommendations: [{ itemId: item.id, title: item.title }] }], pairwiseOverlap: [], notes: ["demo"] });
  if (path === "/admin/datasets/movielens") return json(res, { importedUsers: 1, importedItems: 1, importedRatings: 1 });
  if (["/admin/feature-refresh", "/admin/embeddings/rebuild", "/admin/evaluate", "/admin/weights", "/admin/model-refresh", "/feedback"].includes(path)) return json(res, { status: "ok" });

  return json(res, {});
}

export function createMockApiServer() {
  return createServer(route);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  createMockApiServer().listen(port, () => {
    console.log(`RecoLab Playwright mock API listening on ${port}`);
  });
}
