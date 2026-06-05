import { query } from "../db/pool.js";

export async function userHistory(userId: string) {
  const [saved, interactions, ratings, recommendations] = await Promise.all([
    query(`
      SELECT DISTINCT ON (items.id)
        items.id, items.title, items.domain, items.description, items.genres, items.tags, items.provider, items.release_year,
        interactions.created_at AS saved_at
      FROM interactions
      JOIN items ON items.id = interactions.item_id
      WHERE interactions.user_id = $1 AND interactions.event_type = 'save'
      ORDER BY items.id, interactions.created_at DESC
      LIMIT 50
    `, [userId]),
    query(`
      SELECT interactions.id, interactions.event_type, interactions.weight, interactions.created_at,
        items.id AS item_id, items.title, items.domain, items.genres
      FROM interactions
      JOIN items ON items.id = interactions.item_id
      WHERE interactions.user_id = $1
      ORDER BY interactions.created_at DESC
      LIMIT 50
    `, [userId]),
    query(`
      SELECT ratings.id, ratings.rating, ratings.created_at,
        items.id AS item_id, items.title, items.domain, items.genres
      FROM ratings
      JOIN items ON items.id = ratings.item_id
      WHERE ratings.user_id = $1
      ORDER BY ratings.created_at DESC
      LIMIT 50
    `, [userId]),
    query(`
      SELECT recommendation_results.id, recommendation_results.algorithm, recommendation_results.score,
        recommendation_results.model_version, recommendation_results.explanation, recommendation_results.created_at,
        items.id AS item_id, items.title, items.domain, items.genres
      FROM recommendation_results
      JOIN items ON items.id = recommendation_results.item_id
      WHERE recommendation_results.user_id = $1
      ORDER BY recommendation_results.created_at DESC
      LIMIT 50
    `, [userId])
  ]);

  return {
    userId,
    savedItems: saved.rows.map((row) => ({
      id: row.id,
      title: row.title,
      domain: row.domain,
      description: row.description,
      genres: row.genres ?? [],
      tags: row.tags ?? [],
      provider: row.provider,
      releaseYear: row.release_year,
      savedAt: row.saved_at
    })),
    interactions: interactions.rows.map((row) => ({
      id: row.id,
      eventType: row.event_type,
      weight: Number(row.weight),
      createdAt: row.created_at,
      item: { id: row.item_id, title: row.title, domain: row.domain, genres: row.genres ?? [] }
    })),
    ratings: ratings.rows.map((row) => ({
      id: row.id,
      rating: Number(row.rating),
      createdAt: row.created_at,
      item: { id: row.item_id, title: row.title, domain: row.domain, genres: row.genres ?? [] }
    })),
    recommendations: recommendations.rows.map((row) => ({
      id: row.id,
      algorithm: row.algorithm,
      score: Number(row.score),
      modelVersion: row.model_version,
      explanation: row.explanation,
      createdAt: row.created_at,
      item: { id: row.item_id, title: row.title, domain: row.domain, genres: row.genres ?? [] }
    }))
  };
}

