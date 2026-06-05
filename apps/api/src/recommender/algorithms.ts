import type { CatalogItem } from "@recolab/shared";
import { cosine, normalizeScores, tokenize, vectorize } from "./math.js";
import type { RecommendationCandidate, RecommenderContext } from "./types.js";

function seenItemIds(ctx: RecommenderContext) {
  return new Set(ctx.ratings.filter((rating) => rating.userId === ctx.user.id).map((rating) => rating.itemId));
}

function baseCandidate(ctx: RecommenderContext, item: CatalogItem, score: number, algorithm: RecommendationCandidate["algorithm"]): RecommendationCandidate {
  const prefs = new Set([...ctx.user.preferredGenres, ...ctx.user.preferredSkills].map((value) => value.toLowerCase()));
  const attributes = [...item.genres, ...item.tags].filter((value) => prefs.has(value.toLowerCase()));
  return {
    item,
    score,
    algorithm,
    reasonCodes: attributes.length ? ["matched-profile-preferences"] : ["catalog-signal"],
    modelContributions: { [algorithm]: Number(score.toFixed(4)) },
    matchedAttributes: attributes,
    coldStart: ctx.ratings.filter((rating) => rating.userId === ctx.user.id).length === 0
  };
}

export function popularity(ctx: RecommenderContext, k = 10) {
  const seen = seenItemIds(ctx);
  const byItem = new Map<string, number[]>();
  for (const rating of ctx.ratings) {
    const list = byItem.get(rating.itemId) ?? [];
    list.push(rating.rating);
    byItem.set(rating.itemId, list);
  }
  const globalMean = ctx.ratings.reduce((sum, row) => sum + row.rating, 0) / Math.max(1, ctx.ratings.length);
  const rows = ctx.items
    .filter((item) => !seen.has(item.id))
    .map((item) => {
      const ratings = byItem.get(item.id) ?? [];
      const mean = ratings.reduce((sum, rating) => sum + rating, 0) / Math.max(1, ratings.length);
      const score = ctx.itemFeatures?.get(item.id)?.popularityScore ?? ((mean * ratings.length) + (globalMean * 3)) / (ratings.length + 3);
      return baseCandidate(ctx, item, score, "popularity");
    });
  return rows.sort((a, b) => b.score - a.score).slice(0, k);
}

export function contentBased(ctx: RecommenderContext, k = 10) {
  const seen = seenItemIds(ctx);
  const liked = ctx.ratings.filter((rating) => rating.userId === ctx.user.id && rating.rating >= 4);
  const likedItems = liked.map((rating) => ctx.items.find((item) => item.id === rating.itemId)).filter(Boolean) as CatalogItem[];
  const profileTokens = likedItems.length
    ? likedItems.flatMap((item) => tokenize(item.title, item.description, item.genres.join(" "), item.tags.join(" ")))
    : tokenize(ctx.user.preferredGenres.join(" "), ctx.user.preferredSkills.join(" "));
  const profileVector = vectorize(profileTokens);
  const rows = ctx.items
    .filter((item) => !seen.has(item.id))
    .map((item) => {
      const itemVector = vectorize(tokenize(item.title, item.description, item.genres.join(" "), item.tags.join(" ")));
      const score = cosine(profileVector, itemVector);
      return baseCandidate(ctx, item, score, "content");
    });
  return rows.sort((a, b) => b.score - a.score).slice(0, k);
}

export function collaborative(ctx: RecommenderContext, k = 10) {
  const seen = seenItemIds(ctx);
  const targetRatings = new Map(ctx.ratings.filter((rating) => rating.userId === ctx.user.id).map((rating) => [rating.itemId, rating.rating]));
  const users = [...new Set(ctx.ratings.map((rating) => rating.userId))].filter((userId) => userId !== ctx.user.id);
  const neighborScores = users.map((userId) => {
    const other = new Map(ctx.ratings.filter((rating) => rating.userId === userId).map((rating) => [rating.itemId, rating.rating]));
    let overlap = 0;
    let distance = 0;
    for (const [itemId, rating] of targetRatings) {
      if (!other.has(itemId)) continue;
      overlap += 1;
      distance += Math.abs(rating - (other.get(itemId) ?? 0));
    }
    return { userId, similarity: overlap ? overlap / (1 + distance) : 0 };
  });
  const rows = ctx.items
    .filter((item) => !seen.has(item.id))
    .map((item) => {
      let numerator = 0;
      let denominator = 0;
      for (const neighbor of neighborScores) {
        const rating = ctx.ratings.find((row) => row.userId === neighbor.userId && row.itemId === item.id);
        if (!rating) continue;
        numerator += neighbor.similarity * rating.rating;
        denominator += Math.abs(neighbor.similarity);
      }
      const score = denominator ? numerator / denominator : 0;
      return baseCandidate(ctx, item, score, "collaborative");
    });
  return rows.sort((a, b) => b.score - a.score).slice(0, k);
}

export function semantic(ctx: RecommenderContext, k = 10) {
  const seen = seenItemIds(ctx);
  const rows = ctx.items
    .filter((item) => !seen.has(item.id))
    .map((item) => {
      const score = ctx.semanticScores?.get(item.id) ?? 0;
      const candidate = baseCandidate(ctx, item, score, "semantic");
      candidate.reasonCodes = score > 0 ? ["semantic-profile-match"] : ["semantic-fallback"];
      candidate.modelContributions = { semantic: Number(score.toFixed(4)) };
      return candidate;
    });
  return rows.sort((a, b) => b.score - a.score).slice(0, k);
}

export function hybrid(ctx: RecommenderContext, k = 10) {
  const weights = ctx.algorithmWeights ?? { popularity: 0.15, content: 0.3, collaborative: 0.3, semantic: 0.25 };
  const all = {
    popularity: normalizeScores(popularity(ctx, ctx.items.length)),
    content: normalizeScores(contentBased(ctx, ctx.items.length)),
    collaborative: normalizeScores(collaborative(ctx, ctx.items.length)),
    semantic: normalizeScores(semantic(ctx, ctx.items.length))
  };
  const byItem = new Map<string, RecommendationCandidate>();
  for (const [algorithm, rows] of Object.entries(all)) {
    for (const row of rows) {
      const existing = byItem.get(row.item.id) ?? { ...row, score: 0, algorithm: "hybrid", modelContributions: {}, reasonCodes: [], matchedAttributes: [] };
      const contribution = row.score * (weights[algorithm] ?? 0);
      existing.score += contribution;
      existing.modelContributions[algorithm] = Number(row.score.toFixed(4));
      existing.reasonCodes = [...new Set([...existing.reasonCodes, ...row.reasonCodes])];
      existing.matchedAttributes = [...new Set([...existing.matchedAttributes, ...row.matchedAttributes])];
      existing.coldStart = existing.coldStart || row.coldStart;
      byItem.set(row.item.id, existing);
    }
  }
  return [...byItem.values()].sort((a, b) => b.score - a.score).slice(0, k);
}

export function recommendWithAlgorithm(ctx: RecommenderContext, algorithm: string, k: number) {
  if (algorithm === "popularity") return popularity(ctx, k);
  if (algorithm === "content") return contentBased(ctx, k);
  if (algorithm === "collaborative") return collaborative(ctx, k);
  if (algorithm === "semantic") return semantic(ctx, k);
  return hybrid(ctx, k);
}
