import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, it } from "vitest";
import { ModelComparisonStudio } from "../src/components/ModelComparisonStudio";

describe("ModelComparisonStudio", () => {
  it("renders comparison controls", () => {
    render(
      <ModelComparisonStudio
        users={[{ id: "1", email: "a@test.local", name: "Ada", role: "admin", preferredGenres: [], preferredSkills: [], blockedGenres: [], boostedProviders: [], boostedTags: [], personalExploration: 0.08 }]}
      />
    );
    expect(screen.getByText("Model Comparison Studio")).toBeInTheDocument();
    expect(screen.getByText("Compare models")).toBeInTheDocument();
  });
});
