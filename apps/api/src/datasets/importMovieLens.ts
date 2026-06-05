import { createHash, randomUUID } from "node:crypto";
import path from "node:path";
import { pool, query } from "../db/pool.js";
import { migrate } from "../db/migrate.js";
import { readCsvObjects } from "./csv.js";
import { refreshFeatureStore } from "../features/refreshFeatureStore.js";

function uuidFrom(namespace: string, value: string) {
  const hex = createHash("sha1").update(`${namespace}:${value}`).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function splitGenres(value: string) {
  return value && value !== "(no genres listed)" ? value.split("|").filter(Boolean) : ["Uncategorized"];
}

function parseTitle(raw: string) {
  const match = raw.match(/\((\d{4})\)\s*$/);
  return {
    title: raw.replace(/\s*\(\d{4}\)\s*$/, ""),
    year: match ? Number(match[1]) : null
  };
}

export async function importMovieLens(sourceDir: string, limitRatings = 20000) {
  await migrate();
  const importId = randomUUID();
  await query(
    "INSERT INTO dataset_imports(id, source, source_path, status) VALUES ($1, 'movielens', $2, 'running')",
    [importId, sourceDir]
  );

  try {
    const movies = await readCsvObjects(path.join(sourceDir, "movies.csv"));
    const ratings = await readCsvObjects(path.join(sourceDir, "ratings.csv"));
    let importedItems = 0;
    let importedUsers = 0;
    let importedRatings = 0;
    const knownUsers = new Set<string>();

    for (const movie of movies) {
      const movieId = movie.movieId;
      const parsed = parseTitle(movie.title ?? `Movie ${movieId}`);
      const genres = splitGenres(movie.genres ?? "");
      await query(
        `INSERT INTO items(id, external_id, domain, title, description, genres, tags, provider, release_year, metadata)
         VALUES ($1, $2, 'movies', $3, $4, $5, $6, 'MovieLens', $7, $8)
         ON CONFLICT (external_id) DO UPDATE SET
           title = EXCLUDED.title,
           description = EXCLUDED.description,
           genres = EXCLUDED.genres,
           tags = EXCLUDED.tags,
           provider = EXCLUDED.provider,
           release_year = EXCLUDED.release_year,
           metadata = EXCLUDED.metadata`,
        [
          uuidFrom("movielens-item", movieId ?? ""),
          `movielens:${movieId}`,
          parsed.title,
          `${parsed.title} from the MovieLens open dataset. Genres: ${genres.join(", ")}.`,
          genres,
          genres.map((genre) => genre.toLowerCase()),
          parsed.year,
          { movieId }
        ]
      );
      importedItems += 1;
    }

    for (const rating of ratings.slice(0, limitRatings)) {
      const userId = rating.userId;
      const movieId = rating.movieId;
      const dbUserId = uuidFrom("movielens-user", userId ?? "");
      const dbItemId = uuidFrom("movielens-item", movieId ?? "");
      if (!knownUsers.has(dbUserId)) {
        await query(
          `INSERT INTO users(id, email, password_hash, name, role, preferred_genres, preferred_skills)
           VALUES ($1, $2, 'movielens-local-user', $3, 'viewer', '{}', '{}')
           ON CONFLICT (id) DO NOTHING`,
          [dbUserId, `movielens-${userId}@recolab.local`, `MovieLens User ${userId}`]
        );
        knownUsers.add(dbUserId);
        importedUsers += 1;
      }
      await query(
        `INSERT INTO ratings(id, user_id, item_id, rating, created_at)
         VALUES ($1, $2, $3, $4, to_timestamp($5))
         ON CONFLICT (user_id, item_id) DO UPDATE SET rating = EXCLUDED.rating`,
        [randomUUID(), dbUserId, dbItemId, Number(rating.rating), Number(rating.timestamp ?? Date.now() / 1000)]
      );
      importedRatings += 1;
    }

    await refreshFeatureStore();
    await query(
      `UPDATE dataset_imports
       SET imported_users = $2, imported_items = $3, imported_ratings = $4, status = 'completed', completed_at = now()
       WHERE id = $1`,
      [importId, importedUsers, importedItems, importedRatings]
    );
    return { importId, importedUsers, importedItems, importedRatings };
  } catch (error) {
    await query("UPDATE dataset_imports SET status = 'failed', error = $2, completed_at = now() WHERE id = $1", [
      importId,
      error instanceof Error ? error.message : String(error)
    ]);
    throw error;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const sourceDir = process.argv[2] ?? "../../data/ml-latest-small";
  const limit = Number(process.argv[3] ?? 20000);
  importMovieLens(sourceDir, limit)
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .finally(() => pool.end());
}

