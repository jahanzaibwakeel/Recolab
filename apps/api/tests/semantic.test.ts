import { describe, expect, it } from "vitest";
import { hashedEmbedding } from "../src/semantic/embeddingService.js";
import { dot } from "../src/semantic/vectorMath.js";

describe("semantic embedding fallback", () => {
  it("creates deterministic normalized vectors", () => {
    const a = hashedEmbedding("science fiction space language", 32);
    const b = hashedEmbedding("science fiction space language", 32);
    const c = hashedEmbedding("cooking food family", 32);
    expect(a).toEqual(b);
    expect(dot(a, b)).toBeGreaterThan(dot(a, c));
  });
});

