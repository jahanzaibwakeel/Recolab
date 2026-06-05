import { Router } from "express";
import { query } from "../db/pool.js";
import { modelQueue } from "../jobs/queues.js";
import { importMovieLens } from "../datasets/importMovieLens.js";
import { refreshFeatureStore } from "../features/refreshFeatureStore.js";
import { rebuildItemEmbeddings } from "../semantic/embeddingService.js";
import { evaluateAll, latestEvaluation } from "../services/evaluationService.js";
import { experimentReport } from "../services/experimentService.js";
import { previewWeights } from "../services/recommendationService.js";
import { compareModels } from "../services/modelComparisonService.js";
import { activeModelVersion, listModelRegistry } from "../services/repository.js";
import { randomUUID } from "node:crypto";
import { invalidateAllRecommendationCache } from "../services/cache.js";
import { metricsSnapshot } from "../observability/metrics.js";
import { observabilityHistory } from "../services/observabilityHistoryService.js";
import { observabilityAlerts } from "../services/alertService.js";
import { dataQualityReport } from "../services/dataQualityService.js";
import { activateModelVersion, approveModelVersion, modelGovernanceReport, rejectModelVersion } from "../services/modelGovernanceService.js";
import { privacyAudit } from "../services/privacyService.js";
import { canaryRolloutReport, createCanaryRollout, updateCanaryRollout } from "../services/canaryRolloutService.js";
import { captureFeatureDriftBaselines, driftReport } from "../services/driftMonitoringService.js";
import { runTraceRetentionCleanup, traceRetentionReport, updateTraceRetentionPolicy } from "../services/traceRetentionService.js";
import { z } from "zod";
import type { RecommendationAlgorithm } from "@recolab/shared";
import { queueStatus } from "../services/queueService.js";
import type { AuthenticatedRequest } from "../auth/middleware.js";

export const adminRouter = Router();

adminRouter.get("/metrics", async (_req, res, next) => {
  try {
    const [evaluation, modelVersion, counts] = await Promise.all([
      latestEvaluation(),
      activeModelVersion(),
      query(`
        SELECT
          (SELECT count(*) FROM users) AS users,
          (SELECT count(*) FROM items) AS items,
          (SELECT count(*) FROM ratings) AS ratings,
          (SELECT count(*) FROM interactions) AS interactions,
          (SELECT count(*) FROM explanation_logs) AS explanations
      `)
    ]);
    res.json({ modelVersion, evaluation, counts: counts.rows[0] });
  } catch (error) {
    next(error);
  }
});

adminRouter.get("/observability", async (_req, res, next) => {
  try {
    res.json(metricsSnapshot());
  } catch (error) {
    next(error);
  }
});

adminRouter.get("/observability/history", async (req, res, next) => {
  try {
    res.json(await observabilityHistory(Number(req.query.limit ?? 60)));
  } catch (error) {
    next(error);
  }
});

adminRouter.get("/observability/alerts", async (_req, res, next) => {
  try {
    res.json(await observabilityAlerts());
  } catch (error) {
    next(error);
  }
});

adminRouter.get("/model-registry", async (_req, res, next) => {
  try {
    res.json(await listModelRegistry());
  } catch (error) {
    next(error);
  }
});

adminRouter.get("/model-governance", async (_req, res, next) => {
  try {
    res.json(await modelGovernanceReport());
  } catch (error) {
    next(error);
  }
});

adminRouter.get("/model-canaries", async (_req, res, next) => {
  try {
    res.json(await canaryRolloutReport());
  } catch (error) {
    next(error);
  }
});

adminRouter.post("/model-canaries", async (req: AuthenticatedRequest, res, next) => {
  try {
    const body = z.object({
      candidateVersion: z.string().min(1),
      trafficPercent: z.number().min(1).max(100).default(10),
      notes: z.string().max(1000).optional()
    }).parse(req.body ?? {});
    res.status(201).json(await createCanaryRollout(body.candidateVersion, body.trafficPercent, req.auth!.sub, body.notes));
  } catch (error) {
    next(error);
  }
});

adminRouter.post("/model-canaries/:id/action", async (req, res, next) => {
  try {
    const id = z.string().uuid().parse(req.params.id);
    const body = z.object({
      action: z.enum(["expand", "pause", "rollback", "promote", "enable_live", "disable_live"]),
      trafficPercent: z.number().min(1).max(100).optional()
    }).parse(req.body ?? {});
    res.json(await updateCanaryRollout(id, body.action, body.trafficPercent));
  } catch (error) {
    next(error);
  }
});

const governanceBody = z.object({
  notes: z.string().max(1000).optional(),
  reason: z.string().max(1000).optional()
});

adminRouter.post("/model-governance/:version/approve", async (req: AuthenticatedRequest, res, next) => {
  try {
    const version = z.string().min(1).parse(req.params.version);
    const body = governanceBody.parse(req.body ?? {});
    res.json(await approveModelVersion(version, req.auth!.sub, body.notes));
  } catch (error) {
    next(error);
  }
});

adminRouter.post("/model-governance/:version/reject", async (req: AuthenticatedRequest, res, next) => {
  try {
    const version = z.string().min(1).parse(req.params.version);
    const body = governanceBody.parse(req.body ?? {});
    res.json(await rejectModelVersion(version, req.auth!.sub, body.reason));
  } catch (error) {
    next(error);
  }
});

adminRouter.post("/model-governance/:version/activate", async (req: AuthenticatedRequest, res, next) => {
  try {
    const version = z.string().min(1).parse(req.params.version);
    const body = governanceBody.parse(req.body ?? {});
    res.json(await activateModelVersion(version, req.auth!.sub, body.notes));
  } catch (error) {
    next(error);
  }
});

adminRouter.get("/experiments", async (_req, res, next) => {
  try {
    res.json(await experimentReport());
  } catch (error) {
    next(error);
  }
});

adminRouter.get("/queues", async (_req, res, next) => {
  try {
    res.json(await queueStatus());
  } catch (error) {
    next(error);
  }
});

adminRouter.get("/data-quality", async (_req, res, next) => {
  try {
    res.json(await dataQualityReport());
  } catch (error) {
    next(error);
  }
});

adminRouter.get("/privacy-audit", async (req, res, next) => {
  try {
    res.json(await privacyAudit(Number(req.query.limit ?? 50)));
  } catch (error) {
    next(error);
  }
});

adminRouter.get("/drift-report", async (_req, res, next) => {
  try {
    res.json(await driftReport());
  } catch (error) {
    next(error);
  }
});

adminRouter.post("/drift-report/baselines", async (req: AuthenticatedRequest, res, next) => {
  try {
    const body = z.object({
      baselineWindowDays: z.number().int().min(7).max(365).default(30)
    }).parse(req.body ?? {});
    res.json(await captureFeatureDriftBaselines(req.auth?.sub ?? null, body.baselineWindowDays));
  } catch (error) {
    next(error);
  }
});

adminRouter.get("/trace-retention", async (_req, res, next) => {
  try {
    res.json(await traceRetentionReport());
  } catch (error) {
    next(error);
  }
});

adminRouter.post("/trace-retention/policy", async (req, res, next) => {
  try {
    const body = z.object({
      sampleRate: z.number().min(0).max(1),
      retentionDays: z.number().int().min(1).max(3650),
      exportFormat: z.enum(["json", "html", "both"]).default("both"),
      storageMode: z.enum(["download_only", "local_file"]).default("download_only"),
      includeFeatureValues: z.boolean().default(true)
    }).parse(req.body ?? {});
    res.json(await updateTraceRetentionPolicy(body.sampleRate, body.retentionDays, body.exportFormat, body.storageMode, body.includeFeatureValues));
  } catch (error) {
    next(error);
  }
});

adminRouter.post("/trace-retention/cleanup", async (_req, res, next) => {
  try {
    res.json(await runTraceRetentionCleanup());
  } catch (error) {
    next(error);
  }
});

adminRouter.post("/evaluate", async (req, res, next) => {
  try {
    res.json(await evaluateAll(Number(req.query.k ?? 5)));
  } catch (error) {
    next(error);
  }
});

adminRouter.post("/model-refresh", async (_req, res, next) => {
  try {
    const job = await modelQueue.add("refresh", {});
    res.status(202).json({ status: "queued", jobId: job.id });
  } catch (error) {
    next(error);
  }
});

adminRouter.post("/feature-refresh", async (_req, res, next) => {
  try {
    await refreshFeatureStore();
    await invalidateAllRecommendationCache();
    res.json({ status: "refreshed" });
  } catch (error) {
    next(error);
  }
});

adminRouter.post("/embeddings/rebuild", async (req, res, next) => {
  try {
    const syncQdrant = req.body?.syncQdrant !== false;
    const result = await rebuildItemEmbeddings(syncQdrant);
    await invalidateAllRecommendationCache();
    res.json(result);
  } catch (error) {
    next(error);
  }
});

adminRouter.post("/weights", async (req, res, next) => {
  try {
    const name = String(req.body?.name ?? `custom-${Date.now()}`);
    const weights = req.body?.weights ?? { popularity: 0.15, content: 0.3, collaborative: 0.3, semantic: 0.25 };
    const diversityLambda = Number(req.body?.diversityLambda ?? 0.08);
    const explorationRate = Number(req.body?.explorationRate ?? 0.08);
    await query("UPDATE model_weight_configs SET is_active = false");
    const result = await query(
      `INSERT INTO model_weight_configs(id, name, weights, diversity_lambda, exploration_rate, is_active)
       VALUES ($1, $2, $3, $4, $5, true)
       ON CONFLICT (name) DO UPDATE SET
         weights = EXCLUDED.weights,
         diversity_lambda = EXCLUDED.diversity_lambda,
         exploration_rate = EXCLUDED.exploration_rate,
         is_active = true
       RETURNING *`,
      [randomUUID(), name, weights, diversityLambda, explorationRate]
    );
    await invalidateAllRecommendationCache();
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

adminRouter.post("/weights/preview", async (req, res, next) => {
  try {
    const body = z.object({
      userId: z.string().uuid(),
      weights: z.object({
        popularity: z.number().min(0).max(1).optional(),
        content: z.number().min(0).max(1).optional(),
        collaborative: z.number().min(0).max(1).optional(),
        semantic: z.number().min(0).max(1).optional()
      }).default({}),
      diversityLambda: z.number().min(0).max(1).default(0.08),
      explorationRate: z.number().min(0).max(1).default(0.08),
      k: z.number().int().min(1).max(20).default(8)
    }).parse(req.body);
    res.json(await previewWeights(body.userId, body.weights, body.diversityLambda, body.explorationRate, body.k));
  } catch (error) {
    next(error);
  }
});

adminRouter.post("/model-comparison", async (req, res, next) => {
  try {
    const body = z.object({
      userId: z.string().uuid(),
      algorithms: z.array(z.enum(["popularity", "content", "collaborative", "semantic", "hybrid"])).default(["hybrid", "semantic", "content", "collaborative", "popularity"]),
      k: z.number().int().min(1).max(20).default(8)
    }).parse(req.body);
    res.json(await compareModels(body.userId, body.algorithms as RecommendationAlgorithm[], body.k));
  } catch (error) {
    next(error);
  }
});

adminRouter.post("/datasets/movielens", async (req, res, next) => {
  try {
    const sourceDir = String(req.body?.sourceDir ?? "../../data/ml-latest-small");
    const limitRatings = Number(req.body?.limitRatings ?? 20000);
    res.status(202).json(await importMovieLens(sourceDir, limitRatings));
  } catch (error) {
    next(error);
  }
});

adminRouter.get("/explanation-logs", async (_req, res, next) => {
  try {
    const result = await query(`
      SELECT explanation_logs.*, items.title
      FROM explanation_logs
      JOIN items ON items.id = explanation_logs.item_id
      ORDER BY explanation_logs.created_at DESC
      LIMIT 25
    `);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});
