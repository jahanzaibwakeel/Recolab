import type { RecommendationAlgorithm } from "@recolab/shared";
import { runRecommendationPipeline } from "../recommender/pipeline.js";
import type { RecommendationCandidate } from "../recommender/types.js";
import { buildContext } from "./recommendationService.js";

export async function recommendationTrace(userId: string, itemId: string, algorithm: RecommendationAlgorithm = "hybrid", k = 20) {
  const ctx = await buildContext(userId);
  const pipeline = runRecommendationPipeline(ctx, algorithm, k);
  const candidate = pipeline.candidates.find((row) => row.item.id === itemId)
    ?? runRecommendationPipeline(ctx, algorithm, ctx.items.length).candidates.find((row) => row.item.id === itemId);
  const item = ctx.items.find((row) => row.id === itemId);
  if (!item) throw Object.assign(new Error("Item not found"), { statusCode: 404 });

  const itemFeature = ctx.itemFeatures?.get(itemId);
  const userFeature = ctx.userFeatures?.get(userId);
  const semanticScore = ctx.semanticScores?.get(itemId) ?? 0;
  const seen = ctx.ratings.filter((rating) => rating.userId === userId).map((rating) => rating.itemId);
  const similarCandidates = topSimilarByAttributes(itemId, ctx.items, 6);

  return {
    user: {
      id: ctx.user.id,
      name: ctx.user.name,
      role: ctx.user.role,
      preferredGenres: ctx.user.preferredGenres,
      preferredSkills: ctx.user.preferredSkills,
      blockedGenres: ctx.user.blockedGenres,
      boostedProviders: ctx.user.boostedProviders,
      boostedTags: ctx.user.boostedTags,
      personalExploration: ctx.user.personalExploration
    },
    item,
    algorithm,
    modelVersion: ctx.modelVersion,
    activeWeights: ctx.algorithmWeights,
    diversityLambda: ctx.diversityLambda,
    explorationRate: ctx.explorationRate,
    seenItemIds: seen,
    pipeline: pipeline.trace,
    selectedCandidate: candidate ? summarizeCandidate(candidate) : null,
    featureValues: {
      item: itemFeature ?? null,
      user: userFeature ?? null,
      semanticScore,
      semanticCandidate: ctx.semanticCandidateIds?.has(itemId) ?? false
    },
    candidatePreview: pipeline.candidates.slice(0, 10).map(summarizeCandidate),
    similarCandidates,
    debugNotes: [
      "Trace is generated from the same recommendation context used by normal serving.",
      "If selectedCandidate is null, the item did not survive the requested algorithm/k window.",
      "Feature values come from feature-store-lite tables and semantic retrieval maps."
    ]
  };
}

function summarizeCandidate(candidate: RecommendationCandidate) {
  return {
    itemId: candidate.item.id,
    title: candidate.item.title,
    score: Number(candidate.score.toFixed(4)),
    algorithm: candidate.algorithm,
    reasonCodes: candidate.reasonCodes,
    matchedAttributes: candidate.matchedAttributes,
    modelContributions: candidate.modelContributions,
    coldStart: candidate.coldStart
  };
}

function topSimilarByAttributes(itemId: string, items: Array<{ id: string; title: string; genres: string[]; tags: string[] }>, k: number) {
  const item = items.find((row) => row.id === itemId);
  if (!item) return [];
  const source = new Set([...item.genres, ...item.tags].map((value) => value.toLowerCase()));
  return items
    .filter((row) => row.id !== itemId)
    .map((row) => {
      const overlap = [...row.genres, ...row.tags].filter((value) => source.has(value.toLowerCase()));
      return { itemId: row.id, title: row.title, overlapCount: overlap.length, matchedAttributes: overlap };
    })
    .sort((a, b) => b.overlapCount - a.overlapCount)
    .slice(0, k);
}
