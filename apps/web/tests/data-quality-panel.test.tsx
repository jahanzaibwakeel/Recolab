import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi } from "vitest";
import { DataQualityPanel } from "../src/components/DataQualityPanel";

vi.mock("../src/lib/api", () => ({
  RecoApi: {
    dataQuality: vi.fn(() => Promise.resolve({
      summary: { sparseUsers: 1, coldStartItems: 2, coldStartItemRate: 0.2, metadataGapItems: 0 },
      sparseUsers: [{ id: "u1", name: "Ada", ratingCount: 1, avgRating: 4.5 }],
      coldStartItems: [{ id: "i1", title: "New Item", domain: "movies", ratingCount: 0 }],
      domainCoverage: [{ domain: "movies", itemCount: 10 }],
      genreCoverage: [{ genre: "Sci-Fi", itemCount: 4 }],
      metadataGaps: []
    }))
  }
}));

describe("DataQualityPanel", () => {
  it("renders data quality metrics", async () => {
    render(<DataQualityPanel />);
    expect(screen.getByText("Coverage and Cold-Start Gaps")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("New Item")).toBeInTheDocument());
    expect(screen.getByText("Sparse users")).toBeInTheDocument();
    expect(screen.getByText("Genre Coverage")).toBeInTheDocument();
  });
});
