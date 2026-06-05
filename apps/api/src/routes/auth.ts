import { Router } from "express";
import { z } from "zod";
import { query } from "../db/pool.js";
import { signAuthToken } from "../auth/jwt.js";
import { requireAuth, type AuthenticatedRequest } from "../auth/middleware.js";
import { hashPassword, verifyPassword } from "../auth/passwords.js";
import { consumePasswordResetToken, createPasswordResetToken, createRefreshToken, revokeRefreshToken, rotateRefreshToken } from "../auth/sessionTokens.js";

export const authRouter = Router();

authRouter.post("/login", async (req, res, next) => {
  try {
    const body = z.object({
      email: z.string().email(),
      password: z.string().min(1)
    }).parse(req.body);
    const result = await query("SELECT id, email, password_hash, name, role, preferred_genres, preferred_skills, blocked_genres, boosted_providers, boosted_tags, personal_exploration FROM users WHERE email = $1", [body.email]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: "Unknown local demo user" });
    const valid = await verifyPassword(body.password, user.password_hash);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });

    const token = signAuthToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name
    });
    const refresh = await createRefreshToken(user.id, req.header("user-agent") ?? undefined);

    return res.json({
      token,
      ...refresh,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        preferredGenres: user.preferred_genres,
        preferredSkills: user.preferred_skills,
        blockedGenres: user.blocked_genres ?? [],
        boostedProviders: user.boosted_providers ?? [],
        boostedTags: user.boosted_tags ?? [],
        personalExploration: Number(user.personal_exploration ?? 0.08)
      }
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/refresh", async (req, res, next) => {
  try {
    const body = z.object({ refreshToken: z.string().min(20) }).parse(req.body);
    const rotated = await rotateRefreshToken(body.refreshToken, req.header("user-agent") ?? undefined);
    if (!rotated) return res.status(401).json({ error: "Invalid or expired refresh token" });
    const token = signAuthToken({
      sub: rotated.user.id,
      email: rotated.user.email,
      role: rotated.user.role,
      name: rotated.user.name
    });
    return res.json({ token, refreshToken: rotated.refreshToken, refreshTokenExpiresAt: rotated.refreshTokenExpiresAt, user: rotated.user });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/logout", async (req, res, next) => {
  try {
    const body = z.object({ refreshToken: z.string().min(20).optional() }).parse(req.body);
    if (body.refreshToken) await revokeRefreshToken(body.refreshToken);
    return res.json({ status: "signed-out" });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/password-reset/request", async (req, res, next) => {
  try {
    const body = z.object({ email: z.string().email() }).parse(req.body);
    const reset = await createPasswordResetToken(body.email);
    return res.json({
      status: "reset-requested",
      delivery: "local-demo-response",
      resetToken: reset?.resetToken,
      expiresAt: reset?.expiresAt
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/password-reset/confirm", async (req, res, next) => {
  try {
    const body = z.object({
      resetToken: z.string().min(20),
      newPassword: z.string().min(8)
    }).parse(req.body);
    const reset = await consumePasswordResetToken(body.resetToken);
    if (!reset) return res.status(400).json({ error: "Invalid or expired reset token" });
    await query("UPDATE users SET password_hash = $1 WHERE id = $2", [await hashPassword(body.newPassword), reset.userId]);
    return res.json({ status: "password-updated" });
  } catch (error) {
    next(error);
  }
});

authRouter.get("/me", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const result = await query("SELECT id, email, name, role, preferred_genres, preferred_skills, blocked_genres, boosted_providers, boosted_tags, personal_exploration FROM users WHERE id = $1", [req.auth?.sub]);
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: "User not found" });
    return res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      preferredGenres: user.preferred_genres,
      preferredSkills: user.preferred_skills,
      blockedGenres: user.blocked_genres ?? [],
      boostedProviders: user.boosted_providers ?? [],
      boostedTags: user.boosted_tags ?? [],
      personalExploration: Number(user.personal_exploration ?? 0.08)
    });
  } catch (error) {
    next(error);
  }
});
