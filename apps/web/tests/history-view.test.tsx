import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi } from "vitest";
import { UserHistoryView } from "../src/components/UserHistoryView";

vi.mock("../src/lib/api", () => ({
  RecoApi: {
    userHistory: vi.fn(() => Promise.resolve({ savedItems: [], interactions: [], ratings: [], recommendations: [] }))
  }
}));

vi.mock("../src/lib/auth", () => ({
  getSession: () => null
}));

describe("UserHistoryView", () => {
  it("renders history sections", async () => {
    render(<UserHistoryView users={[{ id: "1", email: "a@test.local", name: "Ada", role: "admin", preferredGenres: [], preferredSkills: [], blockedGenres: [], boostedProviders: [], boostedTags: [], personalExploration: 0.08 }]} />);
    expect(screen.getByText("Saved Items and History")).toBeInTheDocument();
    expect(screen.getByText("Saved Items")).toBeInTheDocument();
    expect(screen.getByText("Recent Interactions")).toBeInTheDocument();
  });
});
