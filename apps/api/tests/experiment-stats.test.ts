import { describe, expect, it } from "vitest";
import { enrichExperimentStats } from "../src/services/experimentService.js";

describe("experiment analytics", () => {
  it("computes lift and recommendation labels", () => {
    const rows = enrichExperimentStats([
      {
        experimentKey: "x",
        name: "Experiment",
        hypothesis: "Variant improves positive rate",
        variant: "A",
        algorithm: "hybrid",
        assignedUsers: 100,
        events: 100,
        positiveRate: 0.2,
        dislikeRate: 0.1
      },
      {
        experimentKey: "x",
        name: "Experiment",
        hypothesis: "Variant improves positive rate",
        variant: "B",
        algorithm: "semantic",
        assignedUsers: 100,
        events: 100,
        positiveRate: 0.3,
        dislikeRate: 0.08
      }
    ]);
    const variant = rows.find((row) => row.variant === "B");
    expect(variant?.lift).toBeCloseTo(0.1);
    expect(variant?.relativeLift).toBeCloseTo(0.5);
    expect(variant?.confidenceInterval95.low).toBeLessThan(variant?.confidenceInterval95.high ?? 0);
  });
});

