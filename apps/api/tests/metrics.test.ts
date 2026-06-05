import { describe, expect, it } from "vitest";
import { mapAtK, ndcgAtK, precisionAtK, recallAtK } from "../src/recommender/metrics.js";

describe("ranking metrics", () => {
  it("computes precision, recall, MAP, and NDCG at k", () => {
    const recommended = ["a", "b", "c", "d"];
    const relevant = new Set(["b", "d"]);
    expect(precisionAtK(recommended, relevant, 2)).toBe(0.5);
    expect(recallAtK(recommended, relevant, 4)).toBe(1);
    expect(mapAtK(recommended, relevant, 4)).toBeGreaterThan(0);
    expect(ndcgAtK(recommended, relevant, 4)).toBeGreaterThan(0);
  });
});

