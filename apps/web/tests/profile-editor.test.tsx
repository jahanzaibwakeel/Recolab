import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi } from "vitest";
import { ProfileEditor } from "../src/components/ProfileEditor";
import { RecoApi } from "../src/lib/api";

vi.mock("../src/lib/api", () => ({
  RecoApi: {
    preferences: vi.fn((_id, body) => Promise.resolve({
      id: "1",
      email: "ada@test.local",
      name: "Ada",
      role: "admin",
      ...body
    }))
  }
}));

describe("ProfileEditor", () => {
  it("saves advanced personalization controls", async () => {
    render(<ProfileEditor users={[{
      id: "1",
      email: "ada@test.local",
      name: "Ada",
      role: "admin",
      preferredGenres: ["Sci-Fi"],
      preferredSkills: ["systems"],
      blockedGenres: ["Horror"],
      boostedProviders: ["MovieLens"],
      boostedTags: ["cyberpunk"],
      personalExploration: 0.12
    }]} />);

    expect(screen.getByText("Blocked genres")).toBeInTheDocument();
    expect(screen.getByText("Boosted providers")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Save preferences"));
    await waitFor(() => expect(RecoApi.preferences).toHaveBeenCalledWith("1", expect.objectContaining({
      blockedGenres: ["Horror"],
      boostedProviders: ["MovieLens"],
      boostedTags: ["cyberpunk"],
      personalExploration: 0.12
    })));
  });
});
