import type { CatalogItem } from "@recolab/shared";
import { config } from "../config.js";
import { query } from "../db/pool.js";
import { incrementMetric, timeAsync } from "../observability/metrics.js";
import type { RatingRow } from "../recommender/types.js";
import { embedText } from "./embeddingService.js";
import { average, dot } from "./vectorMath.js";

export interface SemanticSearchResult {
  itemId: string;
  score: number;
  source: "qdrant" | "local";
}

export async function semanticCandidates(userId: string, items: CatalogItem[], ratings: RatingRow[], k = 80): Promise<SemanticSearchResult[]> {
  const itemVectors = await loadItemVectors();
  if (!itemVectors.size) return [];
  const profile = await semanticProfile(userId, items, ratings, itemVectors);
  const qdrant = await timeAsync("qdrant_search", () => searchQdrant(profile, k));
  if (qdrant.length) {
    incrementMetric("qdrant.hit");
    return qdrant;
  }
  incrementMetric("qdrant.miss");

  return timeAsync("semantic_local_search", async () => [...itemVectors.entries()]
    .map(([itemId, vector]) => ({ itemId, score: dot(profile, vector), source: "local" as const }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k));
}

async function loadItemVectors() {
  const result = await query("SELECT item_id, vector FROM item_embeddings");
  return new Map<string, number[]>(result.rows.map((row) => [row.item_id, row.vector.map((value: unknown) => Number(value))]));
}

async function semanticProfile(userId: string, items: CatalogItem[], ratings: RatingRow[], itemVectors: Map<string, number[]>) {
  const likedVectors = ratings
    .filter((rating) => rating.userId === userId && rating.rating >= 4)
    .map((rating) => itemVectors.get(rating.itemId))
    .filter(Boolean) as number[][];
  if (likedVectors.length) return average(likedVectors, config.embeddingDimensions);
  const itemText = items.length
    ? items.slice(0, 5).map((item) => `${item.genres.join(" ")} ${item.tags.join(" ")}`).join(" ")
    : "general recommendation profile";
  return embedText(itemText);
}

async function searchQdrant(vector: number[], k: number): Promise<SemanticSearchResult[]> {
  try {
    const response = await fetch(`${config.qdrantUrl}/collections/${config.qdrantCollection}/points/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vector, limit: k, with_payload: false })
    });
    if (!response.ok) return [];
    const data = await response.json() as { result?: Array<{ id: string; score: number }> };
    return (data.result ?? []).map((row) => ({ itemId: String(row.id), score: row.score, source: "qdrant" as const }));
  } catch {
    return [];
  }
}
