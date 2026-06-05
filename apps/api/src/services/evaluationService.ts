import { randomUUID } from "node:crypto";
import type { RecommendationAlgorithm } from "@recolab/shared";
import { query } from "../db/pool.js";
import { runRecommendationPipeline } from "../recommender/pipeline.js";
import { mapAtK, ndcgAtK, precisionAtK, recallAtK } from "../recommender/metrics.js";
import { semanticCandidates } from "../semantic/semanticSearch.js";
import { activeModelVersion, activeWeightConfig, itemFeatureMap, listInteractions, listItems, listRatings, listUsers, userFeatureMap } from "./repository.js";

export async function evaluateAll(k = 5) {
  const users = await listUsers();
  const items = await listItems();
  const ratings = await listRatings();
  const interactions = await listInteractions();
  const itemFeatures = await itemFeatureMap();
  const userFeatures = await userFeatureMap();
  const weights = await activeWeightConfig();
  const modelVersion = await activeModelVersion();
  const algorithms: RecommendationAlgorithm[] = ["popularity", "content", "collaborative", "semantic", "hybrid"];
  const results = [];

  for (const algorithm of algorithms) {
    const userMetrics = [];
    for (const user of users) {
      const relevant = new Set(ratings.filter((rating) => rating.userId === user.id && rating.rating >= 4).map((rating) => rating.itemId));
      const ctxRatings = ratings.filter((rating) => !(rating.userId === user.id && relevant.has(rating.itemId)));
      const semantic = await semanticCandidates(user.id, items, ctxRatings, 80);
      const ctx = {
        user,
        items,
        ratings: ctxRatings,
        interactions,
        modelVersion,
        itemFeatures,
        userFeatures,
        semanticScores: new Map(semantic.map((row) => [row.itemId, row.score])),
        semanticCandidateIds: new Set(semantic.map((row) => row.itemId)),
        algorithmWeights: weights.weights,
        diversityLambda: weights.diversityLambda,
        explorationRate: weights.explorationRate
      };
      const recommended = runRecommendationPipeline(ctx, algorithm, k).candidates.map((row) => row.item.id);
      userMetrics.push({
        precision: precisionAtK(recommended, relevant, k),
        recall: recallAtK(recommended, relevant, k),
        map: mapAtK(recommended, relevant, k),
        ndcg: ndcgAtK(recommended, relevant, k)
      });
    }
    const aggregate = {
      algorithm,
      k,
      precisionAtK: mean(userMetrics.map((row) => row.precision)),
      recallAtK: mean(userMetrics.map((row) => row.recall)),
      mapAtK: mean(userMetrics.map((row) => row.map)),
      ndcgAtK: mean(userMetrics.map((row) => row.ndcg))
    };
    await query(
      `INSERT INTO evaluations(id, model_version, algorithm, k, precision_at_k, recall_at_k, map_at_k, ndcg_at_k)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [randomUUID(), modelVersion, algorithm, k, aggregate.precisionAtK, aggregate.recallAtK, aggregate.mapAtK, aggregate.ndcgAtK]
    );
    results.push(aggregate);
  }

  return { modelVersion, rows: results };
}

export async function latestEvaluation() {
  const result = await query(`
    SELECT DISTINCT ON (algorithm) algorithm, k, precision_at_k, recall_at_k, map_at_k, ndcg_at_k, created_at
    FROM evaluations
    ORDER BY algorithm, created_at DESC
  `);
  return result.rows.map((row) => ({
    algorithm: row.algorithm,
    k: Number(row.k),
    precisionAtK: Number(row.precision_at_k),
    recallAtK: Number(row.recall_at_k),
    mapAtK: Number(row.map_at_k),
    ndcgAtK: Number(row.ndcg_at_k),
    createdAt: row.created_at
  }));
}

function mean(values: number[]) {
  return values.length ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(4)) : 0;
}
