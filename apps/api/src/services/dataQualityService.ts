import { query } from "../db/pool.js";

export async function dataQualityReport() {
  const [summary, sparseUsers, coldStartItems, domainCoverage, genreCoverage, metadataGaps] = await Promise.all([
    query(`
      SELECT
        (SELECT count(*)::int FROM users) AS users,
        (SELECT count(*)::int FROM items) AS items,
        (SELECT count(*)::int FROM ratings) AS ratings,
        (SELECT count(*)::int FROM interactions) AS interactions,
        (SELECT count(*)::int FROM users LEFT JOIN user_features ON user_features.user_id = users.id WHERE COALESCE(user_features.rating_count, 0) < 3) AS sparse_users,
        (SELECT count(*)::int FROM items LEFT JOIN item_features ON item_features.item_id = items.id WHERE COALESCE(item_features.rating_count, 0) = 0) AS cold_start_items,
        (SELECT count(*)::int FROM items WHERE array_length(genres, 1) IS NULL OR array_length(tags, 1) IS NULL OR description = '') AS metadata_gap_items
    `),
    query(`
      SELECT users.id, users.name, users.email, COALESCE(user_features.rating_count, 0)::int AS rating_count, COALESCE(user_features.avg_rating, 0)::numeric AS avg_rating
      FROM users
      LEFT JOIN user_features ON user_features.user_id = users.id
      WHERE COALESCE(user_features.rating_count, 0) < 3
      ORDER BY rating_count ASC, users.name ASC
      LIMIT 12
    `),
    query(`
      SELECT items.id, items.title, items.domain, items.provider, COALESCE(item_features.rating_count, 0)::int AS rating_count
      FROM items
      LEFT JOIN item_features ON item_features.item_id = items.id
      WHERE COALESCE(item_features.rating_count, 0) = 0
      ORDER BY items.created_at DESC, items.title ASC
      LIMIT 12
    `),
    query(`
      SELECT domain, count(*)::int AS item_count
      FROM items
      GROUP BY domain
      ORDER BY item_count DESC, domain ASC
    `),
    query(`
      SELECT genre, count(*)::int AS item_count
      FROM items, unnest(genres) AS genre
      GROUP BY genre
      ORDER BY item_count DESC, genre ASC
      LIMIT 20
    `),
    query(`
      SELECT id, title,
        array_length(genres, 1) IS NULL AS missing_genres,
        array_length(tags, 1) IS NULL AS missing_tags,
        description = '' AS missing_description
      FROM items
      WHERE array_length(genres, 1) IS NULL OR array_length(tags, 1) IS NULL OR description = ''
      ORDER BY title ASC
      LIMIT 12
    `)
  ]);

  const row = summary.rows[0] ?? {};
  const items = Number(row.items ?? 0);
  const users = Number(row.users ?? 0);
  return {
    summary: {
      users,
      items,
      ratings: Number(row.ratings ?? 0),
      interactions: Number(row.interactions ?? 0),
      sparseUsers: Number(row.sparse_users ?? 0),
      coldStartItems: Number(row.cold_start_items ?? 0),
      metadataGapItems: Number(row.metadata_gap_items ?? 0),
      coldStartItemRate: items ? round(Number(row.cold_start_items ?? 0) / items) : 0,
      sparseUserRate: users ? round(Number(row.sparse_users ?? 0) / users) : 0
    },
    sparseUsers: sparseUsers.rows.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      ratingCount: Number(user.rating_count),
      avgRating: Number(user.avg_rating)
    })),
    coldStartItems: coldStartItems.rows.map((item) => ({
      id: item.id,
      title: item.title,
      domain: item.domain,
      provider: item.provider,
      ratingCount: Number(item.rating_count)
    })),
    domainCoverage: domainCoverage.rows.map((entry) => ({ domain: entry.domain, itemCount: Number(entry.item_count) })),
    genreCoverage: genreCoverage.rows.map((entry) => ({ genre: entry.genre, itemCount: Number(entry.item_count) })),
    metadataGaps: metadataGaps.rows.map((item) => ({
      id: item.id,
      title: item.title,
      missingGenres: item.missing_genres,
      missingTags: item.missing_tags,
      missingDescription: item.missing_description
    }))
  };
}

function round(value: number) {
  return Number(value.toFixed(4));
}
