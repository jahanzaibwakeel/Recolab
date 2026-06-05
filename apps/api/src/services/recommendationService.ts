import { randomUUID } from "node:crypto";
import type { RecommendationAlgorithm, RecommendationResult } from "@recolab/shared";
import { query } from "../db/pool.js";
import { timeAsync } from "../observability/metrics.js";
import { runRecommendationPipeline } from "../recommender/pipeline.js";
import type { RecommenderContext } from "../recommender/types.js";
import { getCached, setCached } from "./cache.js";
import { generateExplanation } from "./ollama.js";
import { semanticCandidates } from "../semantic/semanticSearch.js";
import { assignExperiment, logExperimentEvent } from "./experimentService.js";
import { activeModelVersion, activeWeightConfig, getUser, itemFeatureMap, listInteractions, listItems, listRatings, userFeatureMap } from "./repository.js";
import { resolveCanaryServingModel } from "./canaryRolloutService.js";
import { modelServingOverrides } from "./modelArtifactService.js";

export async function buildContext(userId: string): Promise<RecommenderContext> {
  const user = await getUser(userId);
  if (!user) throw Object.assign(new Error("User not found"), { statusCode: 404 });
  const items = await listItems();
  const ratings = await listRatings();
  const semantic = await semanticCandidates(userId, items, ratings, 80);
  const weights = await activeWeightConfig();
  const servingModel = await resolveCanaryServingModel(userId);
  const servingOverrides = await modelServingOverrides(servingModel.modelVersion);
  return {
    user,
    items,
    ratings,
    interactions: await listInteractions(),
    modelVersion: servingModel.modelVersion,
    itemFeatures: await itemFeatureMap(),
    userFeatures: await userFeatureMap(),
    semanticScores: new Map(semantic.map((row) => [row.itemId, row.score])),
    semanticCandidateIds: new Set(semantic.map((row) => row.itemId)),
    algorithmWeights: servingOverrides?.weights ?? weights.weights,
    diversityLambda: servingOverrides?.diversityLambda ?? weights.diversityLambda,
    explorationRate: user.personalExploration ?? servingOverrides?.explorationRate ?? weights.explorationRate
  };
}

export async function getRecommendations(userId: string, algorithm: RecommendationAlgorithm = "hybrid", k = 8): Promise<RecommendationResult[]> {
  return timeAsync("recommendation", () => getRecommendationsInner(userId, algorithm, k));
}

async function getRecommendationsInner(userId: string, algorithm: RecommendationAlgorithm = "hybrid", k = 8): Promise<RecommendationResult[]> {
  await logExperimentEvent(userId, null, `recommendation_request:${algorithm}`, 1);
  const cacheKey = `recommendations:${userId}:${algorithm}:${k}`;
  const cached = await getCached<RecommendationResult[]>(cacheKey);
  if (cached) return cached;

  const ctx = await buildContext(userId);
  const pipeline = runRecommendationPipeline(ctx, algorithm, k);
  const candidates = pipeline.candidates;
  const results: RecommendationResult[] = [];

  for (const candidate of candidates) {
    const recommendationId = randomUUID();
    const explanation = {
      generatedText: "Explanation generation pending.",
      reasonCodes: candidate.reasonCodes,
      modelContributions: candidate.modelContributions,
      matchedAttributes: candidate.matchedAttributes,
      coldStart: candidate.coldStart,
      pipeline: pipeline.trace
    };

    await query(
      `INSERT INTO recommendation_results(id, user_id, item_id, algorithm, score, model_version, explanation)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [recommendationId, userId, candidate.item.id, algorithm, candidate.score, ctx.modelVersion, explanation]
    );

    explanation.generatedText = await generateExplanation(userId, candidate, recommendationId);
    await query("UPDATE recommendation_results SET explanation = $1 WHERE id = $2", [explanation, recommendationId]);

    results.push({
      recommendationId,
      item: candidate.item,
      score: Number(candidate.score.toFixed(4)),
      algorithm,
      modelVersion: ctx.modelVersion,
      explanation
    });
  }

  await setCached(cacheKey, results);
  return results;
}

export async function similarItems(itemId: string, k = 6) {
  const items = await listItems();
  const item = items.find((candidate) => candidate.id === itemId);
  if (!item) return [];
  const source = new Set([...item.genres, ...item.tags].map((value) => value.toLowerCase()));
  return items
    .filter((candidate) => candidate.id !== itemId)
    .map((candidate) => {
      const target = [...candidate.genres, ...candidate.tags].map((value) => value.toLowerCase());
      const overlap = target.filter((value) => source.has(value));
      return { item: candidate, similarity: overlap.length, matchedAttributes: overlap };
    })
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, k);
}

export async function abTestSimulation(userId: string, k = 5) {
  const assignment = await assignExperiment(userId);
  const variantA = await getRecommendations(userId, "hybrid", k);
  const variantB = await getRecommendations(userId, "semantic", k);
  const scoreA = variantA.reduce((sum, row) => sum + row.score, 0);
  const scoreB = variantB.reduce((sum, row) => sum + row.score, 0);
  return {
    userId,
    hypothesis: "Hybrid ranking should improve top-k relevance while retaining explainability.",
    variantA: { name: "hybrid", recommendations: variantA },
    variantB: { name: "semantic", recommendations: variantB },
    assignment,
    simulatedWinner: scoreA >= scoreB ? "hybrid" : "semantic",
    guardrail: "Explanation latency and cache hit rate should remain acceptable."
  };
}

export async function previewWeights(
  userId: string,
  weights: Record<string, number>,
  diversityLambda = 0.08,
  explorationRate = 0.08,
  k = 8
) {
  const ctx = await buildContext(userId);
  ctx.algorithmWeights = normalizeWeights(weights);
  ctx.diversityLambda = diversityLambda;
  ctx.explorationRate = explorationRate;
  const pipeline = runRecommendationPipeline(ctx, "hybrid", k);
  return {
    userId,
    weights: ctx.algorithmWeights,
    diversityLambda,
    explorationRate,
    pipeline: pipeline.trace,
    recommendations: pipeline.candidates.map((candidate) => ({
      item: candidate.item,
      score: Number(candidate.score.toFixed(4)),
      modelContributions: candidate.modelContributions,
      matchedAttributes: candidate.matchedAttributes,
      reasonCodes: candidate.reasonCodes
    }))
  };
}

function normalizeWeights(weights: Record<string, number>) {
  const keys = ["popularity", "content", "collaborative", "semantic"];
  const cleaned: Record<string, number> = Object.fromEntries(keys.map((key) => [key, Math.max(0, Number(weights[key] ?? 0))]));
  const total = Object.values(cleaned).reduce((sum, value) => sum + value, 0);
  if (!total) return { popularity: 0.25, content: 0.25, collaborative: 0.25, semantic: 0.25 };
  return Object.fromEntries(keys.map((key) => [key, Number(((cleaned[key] ?? 0) / total).toFixed(4))]));
}
