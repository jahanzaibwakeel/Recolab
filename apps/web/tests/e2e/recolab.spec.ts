import { expect, test } from "@playwright/test";

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

test.beforeEach(async ({ page }) => {
  await page.route("http://localhost:4000/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    if (path === "/users") return route.fulfill({ json: [user] });
    if (path.endsWith("/history")) return route.fulfill({ json: { userId: user.id, savedItems: [item], interactions: [], ratings: [], recommendations: [] } });
    if (path.endsWith("/privacy/export")) return route.fulfill({ json: { generatedAt: "now", user, ratings: [], interactions: [], recommendationResults: [], explanationLogs: [] } });
    if (path.endsWith("/privacy/anonymize")) return route.fulfill({ json: { status: "anonymized", user: { id: user.id, name: "Deleted user" } } });
    if (path === "/auth/login") return route.fulfill({ json: { token: "demo-token", refreshToken: "demo-refresh-token", refreshTokenExpiresAt: "2099-01-01T00:00:00.000Z", user } });
    if (path === "/auth/refresh") return route.fulfill({ json: { token: "demo-token-2", refreshToken: "demo-refresh-token-2", refreshTokenExpiresAt: "2099-01-01T00:00:00.000Z", user } });
    if (path === "/auth/logout") return route.fulfill({ json: { status: "signed-out" } });
    if (path === "/auth/password-reset/request") return route.fulfill({ json: { status: "reset-requested", resetToken: "local-reset-token", expiresAt: "2099-01-01T00:00:00.000Z" } });
    if (path === "/auth/password-reset/confirm") return route.fulfill({ json: { status: "password-updated" } });
    if (path === "/items" && url.searchParams.size > 0) {
      return route.fulfill({
        json: {
          rows: [item],
          total: 1,
          limit: 24,
          offset: 0,
          facets: {
            domains: [{ value: "movies", count: 1 }],
            genres: [{ value: "Sci-Fi", count: 1 }],
            tags: [{ value: "simulation", count: 1 }]
          }
        }
      });
    }
    if (path === "/items") return route.fulfill({ json: [item] });
    if (path.startsWith("/recommendations/") && path.includes("/trace/")) {
      if (path.endsWith("/export")) {
        return route.fulfill({
          body: url.searchParams.get("format") === "html" ? "<html><body>RecoLab Trace</body></html>" : JSON.stringify({ item }),
          headers: { "Content-Type": url.searchParams.get("format") === "html" ? "text/html" : "application/json" }
        });
      }
      return route.fulfill({
        json: {
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
        }
      });
    }
    if (path.startsWith("/recommendations/") && path.includes("/ab-test")) {
      return route.fulfill({ json: { simulatedWinner: "hybrid", hypothesis: "Hybrid improves relevance.", variantA: { name: "hybrid", recommendations: [{ item }] }, variantB: { name: "semantic", recommendations: [{ item }] } } });
    }
    if (path.startsWith("/recommendations/")) {
      return route.fulfill({
        json: [{
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
        }]
      });
    }
    if (path === "/admin/metrics") return route.fulfill({ json: { modelVersion: "test", evaluation: [], counts: { users: 1, items: 1, ratings: 1, interactions: 0, explanations: 0 } } });
    if (path === "/admin/observability") return route.fulfill({ json: { timers: { api: { avgMs: 22 }, recommendation: { avgMs: 45 }, ollama_explanation: { avgMs: 120 } }, counters: {}, derived: { cacheHitRate: 0.6, explanationFallbackRate: 0.1 }, startedAt: "now" } });
    if (path === "/admin/observability/alerts") return route.fulfill({ json: { status: "ok", alerts: [{ key: "api_latency", label: "API latency", severity: "ok", value: 22, threshold: 500, unit: "ms", message: "API latency should stay below 500ms." }] } });
    if (path === "/admin/observability/history") {
      return route.fulfill({
        json: [
          { capturedAt: "2026-06-04T10:00:00.000Z", timers: { api: { avgMs: 20 }, recommendation: { avgMs: 40 }, ollama_explanation: { avgMs: 100 } }, counters: {}, derived: { cacheHitRate: 0.5, explanationFallbackRate: 0.2 } },
          { capturedAt: "2026-06-04T10:01:00.000Z", timers: { api: { avgMs: 22 }, recommendation: { avgMs: 45 }, ollama_explanation: { avgMs: 120 } }, counters: {}, derived: { cacheHitRate: 0.6, explanationFallbackRate: 0.1 } }
        ]
      });
    }
    if (path === "/admin/model-registry") return route.fulfill({ json: { versions: [], weightConfigs: [], embeddings: { embedding_count: 1, embedding_model: "nomic-embed-text" } } });
    if (path === "/admin/model-governance") {
      return route.fulfill({
        json: {
          summary: { pending: 1, approved: 0, rejected: 0, active: 1 },
          versions: [{ version: "local-candidate", status: "training", approval_status: "pending", artifact_path: "artifacts/models/local-candidate.json", metrics: [{ precisionAtK: 0.4, recallAtK: 0.3, ndcgAtK: 0.5 }] }]
        }
      });
    }
    if (path.startsWith("/admin/model-governance/")) return route.fulfill({ json: { status: "ok" } });
    if (path === "/admin/model-canaries") {
      return route.fulfill({
        json: {
          activeModelVersion: "test",
          summary: { running: 1, paused: 0, promoted: 0 },
          rollouts: [{
            id: "11111111-1111-4111-8111-111111111111",
            candidate_version: "local-candidate",
            candidate_approval_status: "approved",
            status: "running",
            live_routing_enabled: false,
            traffic_percent: 10,
            assignedUsers: 1,
            totalEligibleUsers: 1,
            simulation: { recommendation: "expand", ndcgDelta: 0.02, precisionDelta: 0.01 }
          }]
        }
      });
    }
    if (path.startsWith("/admin/model-canaries/") || path === "/admin/model-canaries") return route.fulfill({ json: { status: "ok" } });
    if (path === "/admin/experiments") return route.fulfill({ json: [{ experimentKey: "x", name: "Hybrid vs Semantic", variant: "A", algorithm: "hybrid", assignedUsers: 1, events: 10, positiveRate: 0.3, dislikeRate: 0.1, lift: 0, relativeLift: 0, confidenceInterval95: { low: 0, high: 0 }, significance: "baseline", recommendation: "baseline" }] });
    if (path === "/admin/queues") return route.fulfill({ json: { queue: "model-refresh", status: "connected", counts: { waiting: 0, active: 0, completed: 1, failed: 0, delayed: 0, paused: 0 }, recent: [], failed: [] } });
    if (path === "/admin/data-quality") return route.fulfill({ json: { summary: { sparseUsers: 1, coldStartItems: 1, coldStartItemRate: 0.1, metadataGapItems: 0 }, sparseUsers: [{ id: "u1", name: "Ada", ratingCount: 1, avgRating: 4.5 }], coldStartItems: [{ id: "i1", title: "New Catalog Item", domain: "movies", ratingCount: 0 }], domainCoverage: [{ domain: "movies", itemCount: 10 }], genreCoverage: [{ genre: "Sci-Fi", itemCount: 4 }], metadataGaps: [] } });
    if (path === "/admin/drift-report") return route.fulfill({ json: { status: "ok", volumes: { recentRatings: 1, baselineRatings: 10, recentFeedback: 2, recentRecommendations: 3 }, signals: [{ key: "avg_rating", label: "Average rating drift", recent: 4.1, baseline: 4, delta: 0.1, severity: "ok" }], featureBaselines: [{ key: "avg_item_popularity", label: "Average item popularity", value: 0.4, baseline: 0.5, delta: -0.1, severity: "ok" }] } });
    if (path === "/admin/drift-report/baselines") return route.fulfill({ json: [] });
    if (path === "/admin/trace-retention") return route.fulfill({ json: { policy: { sample_rate: 0.25, retention_days: 30, export_format: "both", storage_mode: "download_only", include_feature_values: true }, sampledTraceEvents: { sampled: 1, total: 2 }, explanationLogs: { total: 1 }, recommendationResults: { total: 1 } } });
    if (path === "/admin/trace-retention/policy" || path === "/admin/trace-retention/cleanup") return route.fulfill({ json: { deletedTraceEvents: 1 } });
    if (path === "/admin/privacy-audit") return route.fulfill({ json: [{ id: "p1", action: "export", target_name: "Ada", actor_name: "Ada", created_at: "2026-06-05T00:00:00.000Z" }] });
    if (path === "/admin/explanation-logs") return route.fulfill({ json: [] });
    if (path === "/admin/weights/preview") return route.fulfill({ json: { recommendations: [{ item, score: 0.91 }], weights: { semantic: 0.4 } } });
    if (path === "/admin/model-comparison") return route.fulfill({ json: { rows: [{ algorithm: "hybrid", summary: { averageScore: 0.91, diversityRatio: 0.5, uniqueGenreCount: 2, contributionAverages: { semantic: 0.7 } }, recommendations: [{ itemId: item.id, title: item.title }] }], pairwiseOverlap: [], notes: ["demo"] } });
    if (path === "/admin/datasets/movielens") return route.fulfill({ json: { importedUsers: 1, importedItems: 1, importedRatings: 1 } });
    if (["/admin/feature-refresh", "/admin/embeddings/rebuild", "/admin/evaluate", "/admin/weights", "/admin/model-refresh", "/feedback"].includes(path)) return route.fulfill({ json: { status: "ok" } });
    return route.fulfill({ json: {} });
  });
});

test("runs the recruiter demo flow", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("AI Recommendation Engine")).toBeVisible();
  await expect(page.getByText("Guided Walkthrough")).toBeVisible();
  await page.getByTitle("Mark Open recommendations").click();
  await expect(page.getByText("1/4")).toBeVisible();
  await expect(page.getByText("The Matrix")).toBeVisible();

  await page.getByRole("link", { name: "Catalog" }).click();
  await expect(page.getByText("Catalog Explorer")).toBeVisible();
  await expect(page.getByText("The Matrix")).toBeVisible();
  await page.getByRole("link", { name: "Feed" }).click();

  await page.getByRole("link", { name: "History" }).click();
  await expect(page.getByText("Saved Items and History")).toBeVisible();
  await expect(page.getByText("The Matrix")).toBeVisible();
  await page.getByRole("link", { name: "Feed" }).click();

  await page.getByRole("link", { name: "Profile" }).click();
  await expect(page.getByText("Data Export and Deletion")).toBeVisible();
  await page.getByRole("button", { name: "Export data" }).click();
  await expect(page.getByText("Privacy export generated")).toBeVisible();
  await page.getByRole("link", { name: "Feed" }).click();

  await page.getByTitle("Debug trace").click();
  await expect(page.getByText("Recommendation trace")).toBeVisible();
  await expect(page.getByText("Score Breakdown")).toBeVisible();
  await expect(page.getByTitle("Export JSON")).toBeVisible();
  await expect(page.getByTitle("Export HTML report")).toBeVisible();
  await page.getByTitle("Close").click();

  await page.getByRole("link", { name: "Admin" }).click();
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByText(/Signed in as Ada/)).toBeVisible();
  await page.getByTitle("Refresh session").click();
  await expect(page.getByText(/Session refreshed for Ada/)).toBeVisible();
  await page.getByRole("button", { name: "Request reset" }).click();
  await expect(page.getByText("Local reset token generated")).toBeVisible();
  await page.getByRole("button", { name: "Set password" }).click();
  await expect(page.getByText("Password reset locally")).toBeVisible();

  await expect(page.getByText("Observability")).toBeVisible();
  await expect(page.getByText("Cache hit %")).toBeVisible();
  await expect(page.getByText("Alert Thresholds")).toBeVisible();
  await expect(page.getByText("Weight Tuning Playground")).toBeVisible();
  await page.getByRole("button", { name: "Preview" }).click();
  await expect(page.getByText("Preview ready")).toBeVisible();

  await page.getByRole("button", { name: "Compare models" }).click();
  await expect(page.getByText("Pairwise overlap")).toBeVisible();

  await expect(page.getByText("Import Pipeline UI")).toBeVisible();
  await page.getByRole("button", { name: "Import only" }).click();
  await expect(page.getByText("Import complete")).toBeVisible();

  await expect(page.getByText("Queue Operations")).toBeVisible();
  await page.getByRole("button", { name: "Queue model refresh" }).click();
  await expect(page.getByText("Queue connected")).toBeVisible();
  await expect(page.getByText("Coverage and Cold-Start Gaps")).toBeVisible();
  await expect(page.getByText("Drift Monitoring")).toBeVisible();
  await page.getByRole("button", { name: "Capture baselines" }).click();
  await expect(page.getByText("Feature baselines captured")).toBeVisible();
  await expect(page.getByText("Trace Sampling and Retention")).toBeVisible();
  await page.getByRole("button", { name: "Run cleanup" }).click();
  await expect(page.getByText("Cleanup removed 1 trace events")).toBeVisible();
  await expect(page.getByText("Model Governance")).toBeVisible();
  await page.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByText("Model approved")).toBeVisible();
  await expect(page.getByText("Canary Rollouts")).toBeVisible();
  await page.getByRole("button", { name: "Enable live" }).click();
  await expect(page.getByText("Canary enable_live")).toBeVisible();
  await page.getByRole("button", { name: "Expand" }).click();
  await expect(page.getByText("Canary expand")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Privacy Audit" })).toBeVisible();
});

test("captures admin visual smoke across desktop and mobile", async ({ page }, testInfo) => {
  for (const viewport of [{ width: 1440, height: 1100 }, { width: 390, height: 1100 }]) {
    await page.setViewportSize(viewport);
    await page.goto("/admin");
    await page.getByRole("button", { name: "Login" }).click();
    await expect(page.getByText("Model Evaluation Dashboard")).toBeVisible();
    await expect(page.getByText("Drift Monitoring")).toBeVisible();
    await expect(page.getByText("Trace Sampling and Retention")).toBeVisible();
    await expect(page.getByText("Canary Rollouts")).toBeVisible();
    await testInfo.attach(`admin-${viewport.width}x${viewport.height}`, {
      body: await page.screenshot({ fullPage: true }),
      contentType: "image/png"
    });
  }
});
