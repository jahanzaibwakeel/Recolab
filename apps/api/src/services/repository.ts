import type { CatalogItem, UserProfile } from "@recolab/shared";
import { query } from "../db/pool.js";
import type { InteractionRow, ItemFeatureRow, RatingRow, UserFeatureRow } from "../recommender/types.js";

export function mapItem(row: any): CatalogItem {
  return {
    id: row.id,
    domain: row.domain,
    title: row.title,
    description: row.description,
    genres: row.genres ?? [],
    tags: row.tags ?? [],
    provider: row.provider,
    releaseYear: row.release_year ?? undefined
  };
}

function mapUser(row: any): UserProfile {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    preferredGenres: row.preferred_genres ?? [],
    preferredSkills: row.preferred_skills ?? [],
    blockedGenres: row.blocked_genres ?? [],
    boostedProviders: row.boosted_providers ?? [],
    boostedTags: row.boosted_tags ?? [],
    personalExploration: Number(row.personal_exploration ?? 0.08)
  };
}

export async function listUsers() {
  const result = await query("SELECT * FROM users ORDER BY created_at");
  return result.rows.map(mapUser);
}

export async function getUser(id: string) {
  const result = await query("SELECT * FROM users WHERE id = $1", [id]);
  return result.rows[0] ? mapUser(result.rows[0]) : null;
}

export async function listItems() {
  const result = await query("SELECT * FROM items ORDER BY title");
  return result.rows.map(mapItem);
}

export async function getItem(id: string) {
  const result = await query("SELECT * FROM items WHERE id = $1", [id]);
  return result.rows[0] ? mapItem(result.rows[0]) : null;
}

export async function listRatings(): Promise<RatingRow[]> {
  const result = await query("SELECT user_id, item_id, rating FROM ratings");
  return result.rows.map((row) => ({ userId: row.user_id, itemId: row.item_id, rating: Number(row.rating) }));
}

export async function listInteractions(): Promise<InteractionRow[]> {
  const result = await query("SELECT user_id, item_id, event_type, weight FROM interactions");
  return result.rows.map((row) => ({ userId: row.user_id, itemId: row.item_id, eventType: row.event_type, weight: Number(row.weight) }));
}

export async function itemFeatureMap(): Promise<Map<string, ItemFeatureRow>> {
  const result = await query("SELECT * FROM item_features");
  return new Map(result.rows.map((row) => [
    row.item_id,
    {
      itemId: row.item_id,
      ratingCount: Number(row.rating_count),
      avgRating: Number(row.avg_rating),
      popularityScore: Number(row.popularity_score),
      saveRate: Number(row.save_rate),
      dislikeRate: Number(row.dislike_rate)
    }
  ]));
}

export async function userFeatureMap(): Promise<Map<string, UserFeatureRow>> {
  const result = await query("SELECT * FROM user_features");
  return new Map(result.rows.map((row) => [
    row.user_id,
    {
      userId: row.user_id,
      ratingCount: Number(row.rating_count),
      avgRating: Number(row.avg_rating),
      preferredGenreScores: row.preferred_genre_scores ?? {},
      lastInteractionAt: row.last_interaction_at
    }
  ]));
}

export async function activeModelVersion() {
  const result = await query("SELECT * FROM model_versions WHERE status = 'active' ORDER BY activated_at DESC NULLS LAST, created_at DESC LIMIT 1");
  return result.rows[0]?.version ?? "local-dev-v0";
}

export async function activeWeightConfig() {
  const result = await query("SELECT * FROM model_weight_configs WHERE is_active = true ORDER BY created_at DESC LIMIT 1");
  const row = result.rows[0];
  return {
    name: row?.name ?? "balanced-semantic-hybrid",
    weights: row?.weights ?? { popularity: 0.15, content: 0.3, collaborative: 0.3, semantic: 0.25 },
    diversityLambda: Number(row?.diversity_lambda ?? 0.08),
    explorationRate: Number(row?.exploration_rate ?? 0.08)
  };
}

export async function listModelRegistry() {
  const [versions, configs, embeddings] = await Promise.all([
    query(`
      SELECT
        version,
        status,
        approval_status,
        algorithm_weights,
        metrics,
        artifact_path,
        governance_notes,
        rejection_reason,
        created_at,
        activated_at,
        approved_at,
        rejected_at
      FROM model_versions
      ORDER BY created_at DESC
      LIMIT 20
    `),
    query("SELECT id, name, weights, diversity_lambda, exploration_rate, is_active, created_at FROM model_weight_configs ORDER BY created_at DESC"),
    query(`
      SELECT
        count(*) AS embedding_count,
        max(updated_at) AS last_embedding_at,
        max(qdrant_synced_at) AS last_qdrant_sync_at,
        max(embedding_model) AS embedding_model
      FROM item_embeddings
    `)
  ]);
  return {
    versions: versions.rows,
    weightConfigs: configs.rows,
    embeddings: embeddings.rows[0]
  };
}
