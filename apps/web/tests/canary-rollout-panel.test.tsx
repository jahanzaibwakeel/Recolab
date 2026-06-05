import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi } from "vitest";
import { CanaryRolloutPanel } from "../src/components/CanaryRolloutPanel";
import { RecoApi } from "../src/lib/api";

vi.mock("../src/lib/api", () => ({
  RecoApi: {
    modelCanaries: vi.fn(() => Promise.resolve({
      activeModelVersion: "baseline-v1",
      summary: { running: 1, paused: 0, promoted: 0 },
      rollouts: [{
        id: "11111111-1111-4111-8111-111111111111",
        candidate_version: "candidate-v2",
        candidate_approval_status: "approved",
        status: "running",
        live_routing_enabled: false,
        traffic_percent: 10,
        assignedUsers: 2,
        totalEligibleUsers: 20,
        simulation: { recommendation: "expand", ndcgDelta: 0.02, precisionDelta: 0.01 }
      }]
    })),
    createCanary: vi.fn(() => Promise.resolve({ status: "running" })),
    updateCanary: vi.fn(() => Promise.resolve({ status: "running" }))
  }
}));

describe("CanaryRolloutPanel", () => {
  it("renders rollout simulation and expands canary traffic", async () => {
    render(<CanaryRolloutPanel />);

    expect(screen.getByText("Canary Rollouts")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("candidate-v2")).toBeInTheDocument());

    fireEvent.click(screen.getByText("Expand"));
    await waitFor(() => expect(RecoApi.updateCanary).toHaveBeenCalledWith(
      "11111111-1111-4111-8111-111111111111",
      { action: "expand", trafficPercent: 10 }
    ));

    fireEvent.click(screen.getByText("Enable live"));
    await waitFor(() => expect(RecoApi.updateCanary).toHaveBeenCalledWith(
      "11111111-1111-4111-8111-111111111111",
      { action: "enable_live", trafficPercent: 10 }
    ));
  });
});
