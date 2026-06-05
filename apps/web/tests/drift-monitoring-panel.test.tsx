import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi } from "vitest";
import { DriftMonitoringPanel } from "../src/components/DriftMonitoringPanel";
import { RecoApi } from "../src/lib/api";

vi.mock("../src/lib/api", () => ({
  RecoApi: {
    driftReport: vi.fn(() => Promise.resolve({
      status: "warning",
      volumes: { recentRatings: 2, baselineRatings: 10, recentFeedback: 3, recentRecommendations: 4 },
      signals: [{ key: "positive_feedback", label: "Positive feedback rate drift", recent: 0.4, baseline: 0.7, delta: -0.3, severity: "critical" }],
      featureBaselines: [{ key: "avg_item_popularity", label: "Average item popularity", value: 0.4, baseline: 0.5, delta: -0.1, severity: "ok" }]
    })),
    captureDriftBaselines: vi.fn(() => Promise.resolve([]))
  }
}));

describe("DriftMonitoringPanel", () => {
  it("renders drift signals", async () => {
    render(<DriftMonitoringPanel />);
    expect(screen.getByText("Drift Monitoring")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Positive feedback rate drift")).toBeInTheDocument());
    expect(screen.getByText("Average item popularity")).toBeInTheDocument();
    expect(screen.getByText("warning")).toBeInTheDocument();
    screen.getByText("Capture baselines").click();
    await waitFor(() => expect(RecoApi.captureDriftBaselines).toHaveBeenCalledWith(30));
  });
});
