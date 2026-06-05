import { Router } from "express";
import { z } from "zod";
import { buildContext } from "../services/recommendationService.js";
import { runRecommendationPipeline } from "../recommender/pipeline.js";
import { generateExplanation } from "../services/ollama.js";

export const aiRouter = Router();

aiRouter.post("/explanations", async (req, res, next) => {
  try {
    const body = z.object({
      userId: z.string().uuid(),
      itemId: z.string().uuid(),
      algorithm: z.enum(["popularity", "content", "collaborative", "semantic", "hybrid"]).default("hybrid")
    }).parse(req.body);
    const ctx = await buildContext(body.userId);
    const candidate = runRecommendationPipeline(ctx, body.algorithm, ctx.items.length).candidates.find((row) => row.item.id === body.itemId);
    if (!candidate) return res.status(404).json({ error: "No explanation candidate found" });
    res.json({ explanation: await generateExplanation(body.userId, candidate) });
  } catch (error) {
    next(error);
  }
});
