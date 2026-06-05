import { createHash } from "node:crypto";
import { config } from "../config.js";
import { query } from "../db/pool.js";
import { migrate } from "../db/migrate.js";
import { incrementMetric, timeAsync } from "../observability/metrics.js";
import { listItems } from "../services/repository.js";
import { l2Normalize } from "./vectorMath.js";

export function embeddingText(item: { title: string; description: string; genres: string[]; tags: string[]; provider?: string }) {
  return [item.title, item.description, item.genres.join(" "), item.tags.join(" "), item.provider ?? ""].join("\n");
}

export function textHash(text: string) {
  return createHash("sha256").update(text).digest("hex");
}

export async function embedText(text: string) {
  incrementMetric("ollama.embedding.total");
  const ollama = await timeAsync("ollama_embedding", () => tryOllamaEmbedding(text));
  if (ollama.length) return l2Normalize(resize(ollama, config.embeddingDimensions));
  incrementMetric("ollama.embedding.fallback");
  return hashedEmbedding(text, config.embeddingDimensions);
}

async function tryOllamaEmbedding(text: string): Promise<number[]> {
  try {
    const response = await fetch(`${config.ollamaUrl}/api/embeddings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: config.ollamaEmbeddingModel, prompt: text })
    });
    if (!response.ok) return [];
    const data = await response.json() as { embedding?: number[] };
    return Array.isArray(data.embedding) ? data.embedding : [];
  } catch {
    return [];
  }
}

export function hashedEmbedding(text: string, dimensions: number) {
  const vector = Array.from({ length: dimensions }, () => 0);
  const tokens = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((token) => token.length > 2);
  for (const token of tokens) {
    const hash = createHash("sha256").update(token).digest();
    const index = hash.readUInt32BE(0) % dimensions;
    const sign = (hash[4] ?? 0) % 2 === 0 ? 1 : -1;
    vector[index] = (vector[index] ?? 0) + sign;
  }
  return l2Normalize(vector);
}

function resize(vector: number[], dimensions: number) {
  if (vector.length === dimensions) return vector;
  if (vector.length > dimensions) return vector.slice(0, dimensions);
  return [...vector, ...Array.from({ length: dimensions - vector.length }, () => 0)];
}

export async function rebuildItemEmbeddings(syncQdrant = true) {
  await migrate();
  const items = await listItems();
  let embedded = 0;
  let synced = 0;

  if (syncQdrant) await ensureQdrantCollection();

  for (const item of items) {
    const text = embeddingText(item);
    const hash = textHash(text);
    const vector = await embedText(text);
    await query(
      `INSERT INTO item_embeddings(item_id, embedding_model, dimensions, vector, text_hash, updated_at)
       VALUES ($1, $2, $3, $4, $5, now())
       ON CONFLICT (item_id) DO UPDATE SET
         embedding_model = EXCLUDED.embedding_model,
         dimensions = EXCLUDED.dimensions,
         vector = EXCLUDED.vector,
         text_hash = EXCLUDED.text_hash,
         updated_at = now()`,
      [item.id, config.ollamaEmbeddingModel, vector.length, vector, hash]
    );
    embedded += 1;
    if (syncQdrant && await upsertQdrantPoint(item.id, vector, item)) {
      await query("UPDATE item_embeddings SET qdrant_synced_at = now() WHERE item_id = $1", [item.id]);
      synced += 1;
    }
  }
  return { embedded, synced, dimensions: config.embeddingDimensions, model: config.ollamaEmbeddingModel };
}

async function ensureQdrantCollection() {
  try {
    await fetch(`${config.qdrantUrl}/collections/${config.qdrantCollection}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vectors: { size: config.embeddingDimensions, distance: "Cosine" } })
    });
  } catch {
    // Optional service. Local fallback search still works without Qdrant.
  }
}

async function upsertQdrantPoint(id: string, vector: number[], item: { title: string; genres: string[]; tags: string[] }) {
  try {
    const response = await fetch(`${config.qdrantUrl}/collections/${config.qdrantCollection}/points?wait=true`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        points: [{
          id,
          vector,
          payload: { title: item.title, genres: item.genres, tags: item.tags }
        }]
      })
    });
    return response.ok;
  } catch {
    return false;
  }
}
