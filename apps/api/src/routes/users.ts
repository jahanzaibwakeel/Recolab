import { Router } from "express";
import { z } from "zod";
import { query } from "../db/pool.js";
import { getUser, listUsers } from "../services/repository.js";
import { requireSelfOrRole, type AuthenticatedRequest } from "../auth/middleware.js";
import { userHistory } from "../services/userHistoryService.js";
import { invalidateRecommendationCache } from "../services/cache.js";
import { anonymizeUserData, exportUserData } from "../services/privacyService.js";

export const usersRouter = Router();

usersRouter.get("/", async (_req, res, next) => {
  try {
    res.json(await listUsers());
  } catch (error) {
    next(error);
  }
});

usersRouter.get("/:id/history", requireSelfOrRole("id", "admin"), async (req, res, next) => {
  try {
    const id = z.string().uuid().parse(req.params.id);
    res.json(await userHistory(id));
  } catch (error) {
    next(error);
  }
});

usersRouter.get("/:id/privacy/export", requireSelfOrRole("id", "admin"), async (req: AuthenticatedRequest, res, next) => {
  try {
    const id = z.string().uuid().parse(req.params.id);
    res.json(await exportUserData(id, req.auth?.sub ?? null));
  } catch (error) {
    next(error);
  }
});

usersRouter.post("/:id/privacy/anonymize", requireSelfOrRole("id", "admin"), async (req: AuthenticatedRequest, res, next) => {
  try {
    const id = z.string().uuid().parse(req.params.id);
    const body = z.object({
      reason: z.string().min(3).max(500).default("User requested local data deletion")
    }).parse(req.body ?? {});
    res.json(await anonymizeUserData(id, req.auth?.sub ?? null, body.reason));
  } catch (error) {
    next(error);
  }
});

usersRouter.get("/:id", async (req, res, next) => {
  try {
    const id = z.string().uuid().parse(req.params.id);
    const user = await getUser(id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (error) {
    next(error);
  }
});

usersRouter.patch("/:id/preferences", requireSelfOrRole("id", "admin"), async (req, res, next) => {
  try {
    const id = z.string().uuid().parse(req.params.id);
    const body = z.object({
      preferredGenres: z.array(z.string()).optional(),
      preferredSkills: z.array(z.string()).optional(),
      blockedGenres: z.array(z.string()).optional(),
      boostedProviders: z.array(z.string()).optional(),
      boostedTags: z.array(z.string()).optional(),
      personalExploration: z.number().min(0).max(0.4).optional()
    }).parse(req.body);
    const current = await getUser(id);
    if (!current) return res.status(404).json({ error: "User not found" });
    await query(
      `UPDATE users
       SET preferred_genres = $1,
           preferred_skills = $2,
           blocked_genres = $3,
           boosted_providers = $4,
           boosted_tags = $5,
           personal_exploration = $6
       WHERE id = $7`,
      [
        body.preferredGenres ?? current.preferredGenres,
        body.preferredSkills ?? current.preferredSkills,
        body.blockedGenres ?? current.blockedGenres,
        body.boostedProviders ?? current.boostedProviders,
        body.boostedTags ?? current.boostedTags,
        body.personalExploration ?? current.personalExploration,
        id
      ]
    );
    await invalidateRecommendationCache(id);
    res.json(await getUser(id));
  } catch (error) {
    next(error);
  }
});
