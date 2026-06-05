import { describe, expect, it } from "vitest";
import { runRecommendationPipeline } from "../src/recommender/pipeline.js";
import type { RecommenderContext } from "../src/recommender/types.js";

const ctx: RecommenderContext = {
  modelVersion: "test",
  user: {
    id: "u1",
    email: "u1@test.local",
    name: "Ada",
    role: "viewer",
    preferredGenres: ["Sci-Fi"],
    preferredSkills: ["systems"],
    blockedGenres: ["Comedy"],
    boostedProviders: ["test"],
    boostedTags: ["language"],
    personalExploration: 0.12
  },
  items: [
    { id: "i1", domain: "movies", title: "Known", description: "Space systems", genres: ["Sci-Fi"], tags: ["systems"], provider: "test" },
    { id: "i2", domain: "movies", title: "Candidate", description: "Space language", genres: ["Sci-Fi"], tags: ["language"], provider: "test" },
    { id: "i3", domain: "movies", title: "Other", description: "Food craft", genres: ["Comedy"], tags: ["food"], provider: "test" }
  ],
  ratings: [{ userId: "u1", itemId: "i1", rating: 5 }],
  interactions: [],
  itemFeatures: new Map(),
  semanticScores: new Map([["i2", 0.95], ["i3", 0.1]]),
  semanticCandidateIds: new Set(["i2", "i3"])
};

describe("recommendation pipeline", () => {
  it("returns candidates with trace stages", () => {
    const result = runRecommendationPipeline(ctx, "hybrid", 2);
    expect(result.candidates.length).toBeGreaterThan(0);
    expect(result.trace.map((stage) => stage.stage)).toEqual(["personalization_filters", "candidate_generation", "scoring", "reranking"]);
    expect(result.candidates.map((candidate) => candidate.item.id)).not.toContain("i3");
    expect(result.candidates[0]?.reasonCodes).toContain("personal-boost");
  });

  it("supports semantic candidate generation", () => {
    const result = runRecommendationPipeline(ctx, "semantic", 2);
    expect(result.candidates[0]?.item.id).toBe("i2");
    expect(result.candidates[0]?.modelContributions.semantic).toBeGreaterThan(0);
  });
});
