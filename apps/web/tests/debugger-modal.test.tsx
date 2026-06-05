import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi } from "vitest";
import { RecommendationDebuggerModal } from "../src/components/RecommendationDebuggerModal";

const trace = {
  algorithm: "hybrid",
  modelVersion: "test",
  diversityLambda: 0.08,
  explorationRate: 0.1,
  item: { id: "i1", title: "The Matrix" },
  featureValues: { semanticScore: 0.72, semanticCandidate: true },
  pipeline: [{ stage: "candidate_generation", inputCount: 12, outputCount: 8, notes: ["semantic pool"] }],
  selectedCandidate: {
    score: 0.91,
    modelContributions: { content: 0.8, semantic: 0.7 },
    matchedAttributes: ["Sci-Fi"],
    reasonCodes: ["semantic-profile-match"]
  },
  candidatePreview: [{ itemId: "1", title: "The Matrix", score: 0.91 }],
  similarCandidates: [{ itemId: "2", title: "Inception", overlapCount: 2 }]
};

describe("RecommendationDebuggerModal", () => {
  it("renders trace sections", () => {
    render(<RecommendationDebuggerModal trace={trace} loading={false} userId="u1" algorithm="hybrid" onClose={vi.fn()} />);
    expect(screen.getAllByText("The Matrix").length).toBeGreaterThan(0);
    expect(screen.getByText("Pipeline")).toBeInTheDocument();
    expect(screen.getByText("Score Breakdown")).toBeInTheDocument();
    expect(screen.getByText("Feature Values")).toBeInTheDocument();
    expect(screen.getByText("Candidate Preview")).toBeInTheDocument();
    expect(screen.getByTitle("Export JSON")).toBeInTheDocument();
    expect(screen.getByTitle("Export HTML report")).toBeInTheDocument();
  });
});
