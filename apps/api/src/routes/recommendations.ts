import { Router } from "express";
import { z } from "zod";
import { abTestSimulation, getRecommendations } from "../services/recommendationService.js";
import { recommendationTrace } from "../services/traceService.js";
import { recommendationTraceExport } from "../services/traceExportService.js";
import { assertTraceExportAllowed, recordTraceAccess } from "../services/traceRetentionService.js";
import { archiveTraceExport } from "../services/traceArchiveService.js";

export const recommendationsRouter = Router();

recommendationsRouter.get("/:userId/trace/:itemId/export", async (req, res, next) => {
  try {
    const query = z.object({
      algorithm: z.enum(["popularity", "content", "collaborative", "semantic", "hybrid"]).default("hybrid"),
      k: z.coerce.number().int().min(1).max(100).default(20),
      format: z.enum(["json", "html"]).default("json")
    }).parse(req.query);
    const policy = await assertTraceExportAllowed(query.format);
    const exported = await recommendationTraceExport(req.params.userId, req.params.itemId, query.algorithm, query.k, query.format, policy.include_feature_values !== false);
    const archive = policy.storage_mode === "local_file"
      ? await archiveTraceExport(exported.body, exported.extension, { userId: req.params.userId, itemId: req.params.itemId, algorithm: query.algorithm, format: query.format })
      : null;
    await recordTraceAccess(req.params.userId, req.params.itemId, query.algorithm, query.format === "html" ? "export_html" : "export_json", { k: query.k });
    res.setHeader("Content-Type", exported.contentType);
    res.setHeader("Content-Disposition", `attachment; filename="recolab-trace-${req.params.itemId}.${exported.extension}"`);
    if (archive) res.setHeader("X-RecoLab-Trace-Archive", archive.filename);
    res.send(exported.body);
  } catch (error) {
    next(error);
  }
});

recommendationsRouter.get("/:userId/trace/:itemId", async (req, res, next) => {
  try {
    const query = z.object({
      algorithm: z.enum(["popularity", "content", "collaborative", "semantic", "hybrid"]).default("hybrid"),
      k: z.coerce.number().int().min(1).max(100).default(20)
    }).parse(req.query);
    const trace = await recommendationTrace(req.params.userId, req.params.itemId, query.algorithm, query.k);
    await recordTraceAccess(req.params.userId, req.params.itemId, query.algorithm, "view", { k: query.k });
    res.json(trace);
  } catch (error) {
    next(error);
  }
});

recommendationsRouter.get("/:userId/ab-test", async (req, res, next) => {
  try {
    res.json(await abTestSimulation(req.params.userId, Number(req.query.k ?? 5)));
  } catch (error) {
    next(error);
  }
});

recommendationsRouter.get("/:userId", async (req, res, next) => {
  try {
    const query = z.object({
      algorithm: z.enum(["popularity", "content", "collaborative", "semantic", "hybrid"]).default("hybrid"),
      k: z.coerce.number().int().min(1).max(50).default(8)
    }).parse(req.query);
    res.json(await getRecommendations(req.params.userId, query.algorithm, query.k));
  } catch (error) {
    next(error);
  }
});
