import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi } from "vitest";
import { ModelGovernancePanel } from "../src/components/ModelGovernancePanel";
import { RecoApi } from "../src/lib/api";

vi.mock("../src/lib/api", () => ({
  RecoApi: {
    modelGovernance: vi.fn(() => Promise.resolve({
      summary: { pending: 1, approved: 0, rejected: 0, active: 1 },
      versions: [{
        version: "local-candidate",
        status: "training",
        approval_status: "pending",
        artifact_path: "artifacts/models/local-candidate.json",
        metrics: [{ precisionAtK: 0.4, recallAtK: 0.3, ndcgAtK: 0.5 }]
      }]
    })),
    approveModelVersion: vi.fn(() => Promise.resolve({ version: "local-candidate" })),
    rejectModelVersion: vi.fn(() => Promise.resolve({ version: "local-candidate" })),
    activateModelVersion: vi.fn(() => Promise.resolve({ version: "local-candidate" }))
  }
}));

describe("ModelGovernancePanel", () => {
  it("renders candidate model controls and approves a version", async () => {
    render(<ModelGovernancePanel />);

    expect(screen.getByText("Model Governance")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("local-candidate")).toBeInTheDocument());

    fireEvent.click(screen.getByText("Approve"));
    await waitFor(() => expect(RecoApi.approveModelVersion).toHaveBeenCalledWith(
      "local-candidate",
      "Candidate reviewed against offline metrics and demo acceptance criteria."
    ));
  });
});
