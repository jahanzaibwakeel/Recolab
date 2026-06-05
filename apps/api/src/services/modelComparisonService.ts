import type { RecommendationAlgorithm } from "@recolab/shared";
import { runRecommendationPipeline } from "../recommender/pipeline.js";
import { buildContext } from "./recommendationService.js";

const defaultAlgorithms: RecommendationAlgorithm[] = ["hybrid", "semantic", "content", "collaborative", "popularity"];

export async function compareModels(userId: string, algorithms: RecommendationAlgorithm[] = defaultAlgorithms, k = 8) {
  const ctx = await buildContext(userId);
  const rows = algorithms.map((algorithm) => {
    const result = runRecommendationPipeline(ctx, algorithm, k);
    const recommendations = result.candidates.map((candidate) => ({
      itemId: candidate.item.id,
      title: candidate.item.title,
      genres: candidate.item.genres,
      score: Number(candidate.score.toFixed(4)),
      modelContributions: candidate.modelContributions,
      matchedAttributes: candidate.matchedAttributes,
      reasonCodes: candidate.reasonCodes
    }));
    return {
      algorithm,
      pipeline: result.trace,
      recommendations,
      summary: summarize(recommendations)
    };
  });

  return {
    userId,
    k,
    algorithms,
    rows,
    pairwiseOverlap: pairwiseOverlap(rows),
    notes: [
      "Overlap measures how similar top-k lists are across algorithms.",
      "Diversity is the unique genre count divided by total genre appearances.",
      "Average score is algorithm-local and should be compared directionally, not as an absolute cross-model probability."
    ]
  };
}

function summarize(recommendations: Array<{ genres: string[]; score: number; modelContributions: Record<string, number> }>) {
  const genreAppearances = recommendations.flatMap((row) => row.genres);
  const uniqueGenres = new Set(genreAppearances);
  const contributionTotals: Record<string, number> = {};
  for (const rec of recommendations) {
    for (const [name, value] of Object.entries(rec.modelContributions)) {
      contributionTotals[name] = (contributionTotals[name] ?? 0) + value;
    }
  }
  return {
    averageScore: mean(recommendations.map((row) => row.score)),
    uniqueGenreCount: uniqueGenres.size,
    diversityRatio: genreAppearances.length ? Number((uniqueGenres.size / genreAppearances.length).toFixed(4)) : 0,
    contributionAverages: Object.fromEntries(
      Object.entries(contributionTotals).map(([name, value]) => [name, Number((value / Math.max(1, recommendations.length)).toFixed(4))])
    )
  };
}

function pairwiseOverlap(rows: Array<{ algorithm: RecommendationAlgorithm; recommendations: Array<{ itemId: string }> }>) {
  const pairs = [];
  for (let left = 0; left < rows.length; left += 1) {
    for (let right = left + 1; right < rows.length; right += 1) {
      const a = rows[left]!;
      const b = rows[right]!;
      const aItems = new Set(a.recommendations.map((row) => row.itemId));
      const bItems = new Set(b.recommendations.map((row) => row.itemId));
      const overlap = [...aItems].filter((itemId) => bItems.has(itemId)).length;
      pairs.push({
        left: a.algorithm,
        right: b.algorithm,
        overlap,
        jaccard: Number((overlap / Math.max(1, new Set([...aItems, ...bItems]).size)).toFixed(4))
      });
    }
  }
  return pairs;
}

function mean(values: number[]) {
  return values.length ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(4)) : 0;
}

