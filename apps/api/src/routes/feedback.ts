import { randomUUID } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { query } from "../db/pool.js";
import { invalidateRecommendationCache } from "../services/cache.js";
import { logExperimentEvent } from "../services/experimentService.js";

export const feedbackRouter = Router();

const weights = { like: 2, dislike: -2, save: 3 };

feedbackRouter.post("/", async (req, res, next) => {
  try {
    const body = z.object({
      userId: z.string().uuid(),
      itemId: z.string().uuid(),
      action: z.enum(["like", "dislike", "save"])
    }).parse(req.body);
    await query(
      "INSERT INTO interactions(id, user_id, item_id, event_type, weight) VALUES ($1, $2, $3, $4, $5)",
      [randomUUID(), body.userId, body.itemId, body.action, weights[body.action]]
    );
    await logExperimentEvent(body.userId, body.itemId, body.action, weights[body.action]);
    await invalidateRecommendationCache(body.userId);
    res.status(201).json({ status: "recorded", action: body.action });
  } catch (error) {
    next(error);
  }
});
