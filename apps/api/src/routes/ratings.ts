import { randomUUID } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { query } from "../db/pool.js";
import { invalidateRecommendationCache } from "../services/cache.js";

export const ratingsRouter = Router();

ratingsRouter.post("/", async (req, res, next) => {
  try {
    const body = z.object({
      userId: z.string().uuid(),
      itemId: z.string().uuid(),
      rating: z.number().min(0).max(5)
    }).parse(req.body);
    await query(
      `INSERT INTO ratings(id, user_id, item_id, rating)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, item_id) DO UPDATE SET rating = EXCLUDED.rating, created_at = now()`,
      [randomUUID(), body.userId, body.itemId, body.rating]
    );
    await invalidateRecommendationCache(body.userId);
    res.status(201).json({ status: "recorded" });
  } catch (error) {
    next(error);
  }
});

