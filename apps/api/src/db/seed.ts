import { randomUUID } from "node:crypto";
import { pool, query } from "./pool.js";
import { migrate } from "./migrate.js";
import { seedItems, seedRatings, seedUsers } from "./seedData.js";
import { refreshFeatureStore } from "../features/refreshFeatureStore.js";
import { config } from "../config.js";
import { hashPassword } from "../auth/passwords.js";

export async function seed() {
  await migrate();
  const demoPasswordHash = await hashPassword(config.demoPassword);

  for (const user of seedUsers) {
    await query(
      `INSERT INTO users(id, email, password_hash, name, role, preferred_genres, preferred_skills, blocked_genres, boosted_providers, boosted_tags, personal_exploration)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (id) DO UPDATE SET
         password_hash = EXCLUDED.password_hash,
         name = EXCLUDED.name,
         role = EXCLUDED.role,
         preferred_genres = EXCLUDED.preferred_genres,
         preferred_skills = EXCLUDED.preferred_skills,
         blocked_genres = EXCLUDED.blocked_genres,
         boosted_providers = EXCLUDED.boosted_providers,
         boosted_tags = EXCLUDED.boosted_tags,
         personal_exploration = EXCLUDED.personal_exploration`,
      [user.id, user.email, demoPasswordHash, user.name, user.role, user.preferredGenres, user.preferredSkills, user.blockedGenres, user.boostedProviders, user.boostedTags, user.personalExploration]
    );
  }

  for (const item of seedItems) {
    await query(
      `INSERT INTO items(id, external_id, domain, title, description, genres, tags, release_year)
       VALUES ($1, $2, 'movies', $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE SET
         title = EXCLUDED.title,
         description = EXCLUDED.description,
         genres = EXCLUDED.genres,
         tags = EXCLUDED.tags,
         release_year = EXCLUDED.release_year`,
      [item[0], item[1], item[2], item[3], item[4], item[5], item[6]]
    );
  }

  for (const [userId, itemId, rating] of seedRatings) {
    await query(
      `INSERT INTO ratings(id, user_id, item_id, rating)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, item_id) DO UPDATE SET rating = EXCLUDED.rating`,
      [randomUUID(), userId, itemId, rating]
    );
  }

  await refreshFeatureStore();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seed().finally(() => pool.end());
}
