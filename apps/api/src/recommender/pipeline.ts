import type { RecommendationAlgorithm } from "@recolab/shared";
import { collaborative, contentBased, hybrid, popularity, semantic } from "./algorithms.js";
import type { PipelineTrace, RecommendationCandidate, RecommenderContext } from "./types.js";

export interface PipelineResult {
  candidates: RecommendationCandidate[];
  trace: PipelineTrace[];
}

export function runRecommendationPipeline(ctx: RecommenderContext, algorithm: RecommendationAlgorithm, k: number): PipelineResult {
  const trace: PipelineTrace[] = [];
  const filteredItems = applyPersonalFilters(ctx);
  const filterNotes = filteredItems.length === ctx.items.length
    ? ["no blocked genres applied"]
    : [`blocked genres removed ${ctx.items.length - filteredItems.length} items`];
  const filteredCtx = { ...ctx, items: filteredItems };
  trace.push({
    stage: "personalization_filters",
    inputCount: ctx.items.length,
    outputCount: filteredItems.length,
    notes: filterNotes
  });

  const candidatePool = candidateGeneration(filteredCtx, algorithm);
  trace.push({
    stage: "candidate_generation",
    inputCount: filteredItems.length,
    outputCount: candidatePool.length,
    notes: [`algorithm=${algorithm}`, "profile-matched candidates are preferred when available"]
  });

  const scored = applyPersonalBoosts(filteredCtx, scoreCandidates(filteredCtx, algorithm, candidatePool));
  trace.push({
    stage: "scoring",
    inputCount: candidatePool.length,
    outputCount: scored.length,
    notes: ["scores include reason codes, matched attributes, contribution fields, and personal boosts"]
  });

  const reranked = reRank(filteredCtx, scored, k);
  trace.push({
    stage: "reranking",
    inputCount: scored.length,
    outputCount: reranked.length,
    notes: ["final ranking sorts by score; diversity and business rules can plug in here"]
  });

  return { candidates: reranked, trace };
}

function applyPersonalFilters(ctx: RecommenderContext) {
  const blocked = new Set((ctx.user.blockedGenres ?? []).map((value) => value.toLowerCase()));
  if (!blocked.size) return ctx.items;
  return ctx.items.filter((item) => !item.genres.some((genre) => blocked.has(genre.toLowerCase())));
}

function applyPersonalBoosts(ctx: RecommenderContext, candidates: RecommendationCandidate[]) {
  const boostedProviders = new Set((ctx.user.boostedProviders ?? []).map((value) => value.toLowerCase()));
  const boostedTags = new Set((ctx.user.boostedTags ?? []).map((value) => value.toLowerCase()));
  if (!boostedProviders.size && !boostedTags.size) return candidates;

  return candidates.map((candidate) => {
    const providerMatch = boostedProviders.has(candidate.item.provider.toLowerCase());
    const tagMatches = candidate.item.tags.filter((tag) => boostedTags.has(tag.toLowerCase()));
    const boost = (providerMatch ? 0.08 : 0) + (tagMatches.length ? Math.min(0.12, tagMatches.length * 0.04) : 0);
    if (!boost) return candidate;
    return {
      ...candidate,
      score: candidate.score + boost,
      reasonCodes: [...new Set([...candidate.reasonCodes, "personal-boost"])],
      matchedAttributes: [...new Set([...candidate.matchedAttributes, providerMatch ? candidate.item.provider : "", ...tagMatches].filter(Boolean))],
      modelContributions: {
        ...candidate.modelContributions,
        personal: Number(boost.toFixed(4))
      }
    };
  });
}

function candidateGeneration(ctx: RecommenderContext, algorithm: RecommendationAlgorithm) {
  if (algorithm === "popularity") {
    const rated = ctx.items.filter((item) => (ctx.itemFeatures?.get(item.id)?.ratingCount ?? 0) > 0);
    return rated.length ? rated : ctx.items;
  }
  if (algorithm === "semantic" && ctx.semanticCandidateIds?.size) {
    return ctx.items.filter((item) => ctx.semanticCandidateIds?.has(item.id));
  }
  if (algorithm === "hybrid" && ctx.semanticCandidateIds?.size) {
    const semanticPool = ctx.items.filter((item) => ctx.semanticCandidateIds?.has(item.id));
    const profileTerms = new Set([...ctx.user.preferredGenres, ...ctx.user.preferredSkills].map((value) => value.toLowerCase()));
    const profileMatched = ctx.items.filter((item) =>
      [...item.genres, ...item.tags].some((value) => profileTerms.has(value.toLowerCase()))
    );
    return [...new Map([...semanticPool, ...profileMatched, ...ctx.items.slice(0, 25)].map((item) => [item.id, item])).values()];
  }
  const profileTerms = new Set([...ctx.user.preferredGenres, ...ctx.user.preferredSkills].map((value) => value.toLowerCase()));
  const profileMatched = ctx.items.filter((item) =>
    [...item.genres, ...item.tags].some((value) => profileTerms.has(value.toLowerCase()))
  );
  return profileMatched.length >= 10 ? profileMatched : ctx.items;
}

function scoreCandidates(ctx: RecommenderContext, algorithm: RecommendationAlgorithm, candidates: typeof ctx.items): RecommendationCandidate[] {
  const narrowed = { ...ctx, items: candidates };
  if (algorithm === "popularity") return popularity(narrowed, candidates.length);
  if (algorithm === "content") return contentBased(narrowed, candidates.length);
  if (algorithm === "collaborative") return collaborative(narrowed, candidates.length);
  if (algorithm === "semantic") return semantic(narrowed, candidates.length);
  return hybrid(narrowed, candidates.length);
}

function reRank(ctx: RecommenderContext, candidates: RecommendationCandidate[], k: number) {
  const lambda = ctx.diversityLambda ?? (candidates[0]?.coldStart ? 0.04 : 0.08);
  const selected: RecommendationCandidate[] = [];
  const remaining = [...candidates].sort((a, b) => b.score - a.score);
  while (selected.length < k && remaining.length) {
    let bestIndex = 0;
    let bestScore = -Infinity;
    for (let index = 0; index < remaining.length; index += 1) {
      const candidate = remaining[index]!;
      const genreOverlap = selected.reduce((sum, row) => sum + row.item.genres.filter((genre) => candidate.item.genres.includes(genre)).length, 0);
      const adjusted = candidate.score - lambda * genreOverlap + explorationBoost(ctx, candidate, selected.length);
      if (adjusted > bestScore) {
        bestScore = adjusted;
        bestIndex = index;
      }
    }
    selected.push(remaining.splice(bestIndex, 1)[0]!);
  }
  return selected;
}

function explorationBoost(ctx: RecommenderContext, candidate: RecommendationCandidate, position: number) {
  if (position < 3) return 0;
  const lowPopularity = candidate.modelContributions.popularity !== undefined && candidate.modelContributions.popularity < 0.35;
  const strongContent = (candidate.modelContributions.content ?? 0) > 0.5 || (candidate.modelContributions.semantic ?? 0) > 0.5;
  return lowPopularity && strongContent ? (ctx.explorationRate ?? 0.08) * 0.5 : 0;
}
