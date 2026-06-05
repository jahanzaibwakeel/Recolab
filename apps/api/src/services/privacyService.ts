import { pool, query } from "../db/pool.js";
import { invalidateRecommendationCache } from "./cache.js";

async function recordPrivacyEvent(actorUserId: string | null, targetUserId: string, action: "export" | "anonymize" | "consent", metadata: Record<string, unknown> = {}) {
  await query(
    `INSERT INTO privacy_events(actor_user_id, target_user_id, action, metadata)
     VALUES ($1, $2, $3, $4)`,
    [actorUserId, targetUserId, action, metadata]
  );
}

export async function exportUserData(userId: string, actorUserId: string | null) {
  const [profile, ratings, interactions, recommendations, explanations] = await Promise.all([
    query("SELECT id, email, name, role, preferred_genres, preferred_skills, blocked_genres, boosted_providers, boosted_tags, personal_exploration, created_at, privacy_consent_at, data_deleted_at FROM users WHERE id = $1", [userId]),
    query("SELECT item_id, rating, created_at FROM ratings WHERE user_id = $1 ORDER BY created_at DESC", [userId]),
    query("SELECT item_id, event_type, weight, created_at FROM interactions WHERE user_id = $1 ORDER BY created_at DESC", [userId]),
    query("SELECT item_id, algorithm, score, model_version, explanation, created_at FROM recommendation_results WHERE user_id = $1 ORDER BY created_at DESC LIMIT 200", [userId]),
    query("SELECT item_id, provider, model, latency_ms, created_at FROM explanation_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 200", [userId])
  ]);

  if (!profile.rows[0]) throw new Error("User not found");
  await recordPrivacyEvent(actorUserId, userId, "export", {
    ratings: ratings.rowCount,
    interactions: interactions.rowCount,
    recommendations: recommendations.rowCount,
    explanations: explanations.rowCount
  });

  return {
    generatedAt: new Date().toISOString(),
    user: profile.rows[0],
    ratings: ratings.rows,
    interactions: interactions.rows,
    recommendationResults: recommendations.rows,
    explanationLogs: explanations.rows
  };
}

export async function anonymizeUserData(userId: string, actorUserId: string | null, reason: string) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const existing = await client.query("SELECT id FROM users WHERE id = $1 FOR UPDATE", [userId]);
    if (!existing.rows[0]) throw new Error("User not found");

    await client.query("DELETE FROM auth_refresh_tokens WHERE user_id = $1", [userId]);
    await client.query("DELETE FROM password_reset_tokens WHERE user_id = $1", [userId]);
    await client.query("DELETE FROM explanation_logs WHERE user_id = $1", [userId]);
    await client.query("DELETE FROM recommendation_results WHERE user_id = $1", [userId]);
    await client.query("DELETE FROM interactions WHERE user_id = $1", [userId]);
    await client.query("DELETE FROM ratings WHERE user_id = $1", [userId]);
    await client.query("DELETE FROM user_features WHERE user_id = $1", [userId]);
    const updated = await client.query(
      `UPDATE users
       SET email = $2,
           name = 'Deleted user',
           password_hash = 'deleted',
           preferred_genres = '{}',
           preferred_skills = '{}',
           blocked_genres = '{}',
           boosted_providers = '{}',
           boosted_tags = '{}',
           personal_exploration = 0,
           data_deleted_at = now()
       WHERE id = $1
       RETURNING id, email, name, role, data_deleted_at`,
      [userId, `deleted-${userId}@recolab.local`]
    );
    await client.query(
      `INSERT INTO privacy_events(actor_user_id, target_user_id, action, metadata)
       VALUES ($1, $2, 'anonymize', $3)`,
      [actorUserId, userId, { reason }]
    );
    await client.query("COMMIT");
    await invalidateRecommendationCache(userId);
    return { status: "anonymized", user: updated.rows[0] };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function privacyAudit(limit = 50) {
  const result = await query(`
    SELECT
      pe.id,
      pe.action,
      pe.metadata,
      pe.created_at,
      actor.name AS actor_name,
      target.name AS target_name,
      target.email AS target_email
    FROM privacy_events pe
    LEFT JOIN users actor ON actor.id = pe.actor_user_id
    LEFT JOIN users target ON target.id = pe.target_user_id
    ORDER BY pe.created_at DESC
    LIMIT $1
  `, [Math.min(Math.max(limit, 1), 100)]);
  return result.rows;
}
