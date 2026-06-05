import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi } from "vitest";
import { CatalogSearch } from "../src/components/CatalogSearch";

vi.mock("../src/lib/api", () => ({
  RecoApi: {
    searchItems: vi.fn(() => Promise.resolve({
      rows: [{
        id: "i1",
        domain: "movies",
        title: "The Matrix",
        description: "A hacker discovers a simulated reality.",
        genres: ["Action", "Sci-Fi"],
        tags: ["simulation", "cyberpunk"],
        provider: "MovieLens",
        releaseYear: 1999
      }],
      total: 1,
      limit: 24,
      offset: 0,
      facets: {
        domains: [{ value: "movies", count: 1 }],
        genres: [{ value: "Sci-Fi", count: 1 }],
        tags: [{ value: "simulation", count: 1 }]
      }
    }))
  }
}));

describe("CatalogSearch", () => {
  it("renders searchable catalog results and facets", async () => {
    render(<CatalogSearch />);
    expect(screen.getByText("Catalog Explorer")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("The Matrix")).toBeInTheDocument());
    expect(screen.getByText("movies 1")).toBeInTheDocument();
    expect(screen.getByText("1 matching items", { exact: false })).toBeInTheDocument();
  });
});
