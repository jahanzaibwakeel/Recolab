import { createHash, randomBytes } from "node:crypto";
import { query } from "../db/pool.js";

const refreshTokenDays = 14;
const resetTokenMinutes = 30;

export function hashOpaqueToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function opaqueToken() {
  return randomBytes(32).toString("base64url");
}

export async function createRefreshToken(userId: string, userAgent?: string) {
  const token = opaqueToken();
  const expiresAt = new Date(Date.now() + refreshTokenDays * 24 * 60 * 60 * 1000);
  await query(
    `INSERT INTO auth_refresh_tokens(user_id, token_hash, user_agent, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [userId, hashOpaqueToken(token), userAgent ?? null, expiresAt]
  );
  return { refreshToken: token, refreshTokenExpiresAt: expiresAt.toISOString() };
}

export async function rotateRefreshToken(refreshToken: string, userAgent?: string) {
  const tokenHash = hashOpaqueToken(refreshToken);
  const result = await query(
    `SELECT rt.id, rt.user_id, u.email, u.name, u.role, u.preferred_genres, u.preferred_skills,
            u.blocked_genres, u.boosted_providers, u.boosted_tags, u.personal_exploration
     FROM auth_refresh_tokens rt
     JOIN users u ON u.id = rt.user_id
     WHERE rt.token_hash = $1 AND rt.revoked_at IS NULL AND rt.expires_at > now()`,
    [tokenHash]
  );
  const row = result.rows[0];
  if (!row) return null;
  await query("UPDATE auth_refresh_tokens SET revoked_at = now() WHERE id = $1", [row.id]);
  const next = await createRefreshToken(row.user_id, userAgent);
  return {
    user: {
      id: row.user_id,
      email: row.email,
      name: row.name,
      role: row.role,
      preferredGenres: row.preferred_genres,
      preferredSkills: row.preferred_skills,
      blockedGenres: row.blocked_genres ?? [],
      boostedProviders: row.boosted_providers ?? [],
      boostedTags: row.boosted_tags ?? [],
      personalExploration: Number(row.personal_exploration ?? 0.08)
    },
    ...next
  };
}

export async function revokeRefreshToken(refreshToken: string) {
  await query("UPDATE auth_refresh_tokens SET revoked_at = now() WHERE token_hash = $1", [hashOpaqueToken(refreshToken)]);
}

export async function createPasswordResetToken(email: string) {
  const user = await query("SELECT id, email FROM users WHERE email = $1", [email]);
  const row = user.rows[0];
  if (!row) return null;
  const token = opaqueToken();
  const expiresAt = new Date(Date.now() + resetTokenMinutes * 60 * 1000);
  await query(
    `INSERT INTO password_reset_tokens(user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [row.id, hashOpaqueToken(token), expiresAt]
  );
  return { resetToken: token, expiresAt: expiresAt.toISOString() };
}

export async function consumePasswordResetToken(resetToken: string) {
  const result = await query(
    `SELECT prt.id, prt.user_id
     FROM password_reset_tokens prt
     WHERE prt.token_hash = $1 AND prt.used_at IS NULL AND prt.expires_at > now()`,
    [hashOpaqueToken(resetToken)]
  );
  const row = result.rows[0];
  if (!row) return null;
  await query("UPDATE password_reset_tokens SET used_at = now() WHERE id = $1", [row.id]);
  await query("UPDATE auth_refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL", [row.user_id]);
  return { userId: row.user_id };
}
