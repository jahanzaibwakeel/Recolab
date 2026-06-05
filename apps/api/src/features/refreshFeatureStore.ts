import { pool, query } from "../db/pool.js";
import { migrate } from "../db/migrate.js";

export async function refreshFeatureStore() {
  await migrate();
  await query(`
    WITH rating_stats AS (
      SELECT
        item_id,
        count(*)::int AS rating_count,
        avg(rating) AS avg_rating
      FROM ratings
      GROUP BY item_id
    ),
    interaction_stats AS (
      SELECT
        item_id,
        sum(CASE WHEN event_type = 'save' THEN 1 ELSE 0 END)::numeric / NULLIF(count(*), 0) AS save_rate,
        sum(CASE WHEN event_type = 'dislike' THEN 1 ELSE 0 END)::numeric / NULLIF(count(*), 0) AS dislike_rate
      FROM interactions
      GROUP BY item_id
    ),
    global_stats AS (
      SELECT COALESCE(avg(rating), 3.5) AS global_avg FROM ratings
    )
    INSERT INTO item_features(item_id, rating_count, avg_rating, popularity_score, save_rate, dislike_rate, updated_at)
    SELECT
      items.id,
      COALESCE(rating_stats.rating_count, 0),
      COALESCE(rating_stats.avg_rating, 0),
      COALESCE(((rating_stats.avg_rating * rating_stats.rating_count) + (global_stats.global_avg * 8)) / NULLIF(rating_stats.rating_count + 8, 0), 0),
      COALESCE(interaction_stats.save_rate, 0),
      COALESCE(interaction_stats.dislike_rate, 0),
      now()
    FROM items
    LEFT JOIN rating_stats ON rating_stats.item_id = items.id
    LEFT JOIN interaction_stats ON interaction_stats.item_id = items.id
    CROSS JOIN global_stats
    ON CONFLICT (item_id) DO UPDATE SET
      rating_count = EXCLUDED.rating_count,
      avg_rating = EXCLUDED.avg_rating,
      popularity_score = EXCLUDED.popularity_score,
      save_rate = EXCLUDED.save_rate,
      dislike_rate = EXCLUDED.dislike_rate,
      updated_at = now()
  `);

  await query(`
    WITH user_rating_stats AS (
      SELECT
        user_id,
        count(*)::int AS rating_count,
        avg(rating) AS avg_rating
      FROM ratings
      GROUP BY user_id
    ),
    user_activity AS (
      SELECT user_id, max(created_at) AS last_interaction_at
      FROM interactions
      GROUP BY user_id
    ),
    genre_scores AS (
      SELECT
        ratings.user_id,
        genre,
        avg(ratings.rating)::numeric(10,4) AS score
      FROM ratings
      JOIN items ON items.id = ratings.item_id
      CROSS JOIN unnest(items.genres) AS genre
      GROUP BY ratings.user_id, genre
    ),
    genre_json AS (
      SELECT user_id, jsonb_object_agg(genre, score) AS preferred_genre_scores
      FROM genre_scores
      GROUP BY user_id
    )
    INSERT INTO user_features(user_id, rating_count, avg_rating, preferred_genre_scores, last_interaction_at, updated_at)
    SELECT
      users.id,
      COALESCE(user_rating_stats.rating_count, 0),
      COALESCE(user_rating_stats.avg_rating, 0),
      COALESCE(genre_json.preferred_genre_scores, '{}'),
      user_activity.last_interaction_at,
      now()
    FROM users
    LEFT JOIN user_rating_stats ON user_rating_stats.user_id = users.id
    LEFT JOIN user_activity ON user_activity.user_id = users.id
    LEFT JOIN genre_json ON genre_json.user_id = users.id
    ON CONFLICT (user_id) DO UPDATE SET
      rating_count = EXCLUDED.rating_count,
      avg_rating = EXCLUDED.avg_rating,
      preferred_genre_scores = EXCLUDED.preferred_genre_scores,
      last_interaction_at = EXCLUDED.last_interaction_at,
      updated_at = now()
  `);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  refreshFeatureStore().finally(() => pool.end());
}
