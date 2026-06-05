import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi } from "vitest";
import { WeightTuningPlayground } from "../src/components/WeightTuningPlayground";

describe("WeightTuningPlayground", () => {
  it("renders sliders and actions", () => {
    render(
      <WeightTuningPlayground
        users={[{ id: "1", email: "a@test.local", name: "Ada", role: "admin", preferredGenres: [], preferredSkills: [], blockedGenres: [], boostedProviders: [], boostedTags: [], personalExploration: 0.08 }]}
        onSaved={vi.fn()}
      />
    );
    expect(screen.getByText("Weight Tuning Playground")).toBeInTheDocument();
    expect(screen.getByText("popularity")).toBeInTheDocument();
    expect(screen.getByText("semantic")).toBeInTheDocument();
    expect(screen.getByText("Preview")).toBeInTheDocument();
    expect(screen.getByText("Activate weights")).toBeInTheDocument();
  });
});
