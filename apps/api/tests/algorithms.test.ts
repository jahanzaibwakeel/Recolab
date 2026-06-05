import { describe, expect, it } from "vitest";
import { hybrid } from "../src/recommender/algorithms.js";
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
    blockedGenres: [],
    boostedProviders: [],
    boostedTags: [],
    personalExploration: 0.08
  },
  items: [
    { id: "i1", domain: "movies", title: "Known", description: "Space systems", genres: ["Sci-Fi"], tags: ["systems"], provider: "test" },
    { id: "i2", domain: "movies", title: "Candidate", description: "Space language", genres: ["Sci-Fi"], tags: ["language"], provider: "test" },
    { id: "i3", domain: "movies", title: "Other", description: "Food craft", genres: ["Comedy"], tags: ["food"], provider: "test" }
  ],
  ratings: [{ userId: "u1", itemId: "i1", rating: 5 }],
  interactions: []
};

describe("hybrid recommender", () => {
  it("excludes seen items and returns explanations signals", () => {
    const rows = hybrid(ctx, 2);
    expect(rows.map((row) => row.item.id)).not.toContain("i1");
    expect(rows[0]?.modelContributions).toHaveProperty("content");
    expect(rows[0]?.reasonCodes.length).toBeGreaterThan(0);
  });
});
