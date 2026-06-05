import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi } from "vitest";
import { TraceRetentionPanel } from "../src/components/TraceRetentionPanel";
import { RecoApi } from "../src/lib/api";

vi.mock("../src/lib/api", () => ({
  RecoApi: {
    traceRetention: vi.fn(() => Promise.resolve({
      policy: { sample_rate: 0.25, retention_days: 30, export_format: "both", storage_mode: "download_only", include_feature_values: true },
      sampledTraceEvents: { sampled: 4, total: 8 },
      explanationLogs: { total: 3 },
      recommendationResults: { total: 9 }
    })),
    updateTraceRetentionPolicy: vi.fn(() => Promise.resolve({ sample_rate: 0.25, retention_days: 30 })),
    cleanupTraceRetention: vi.fn(() => Promise.resolve({ deletedTraceEvents: 1 }))
  }
}));

describe("TraceRetentionPanel", () => {
  it("saves policy and runs cleanup", async () => {
    render(<TraceRetentionPanel />);
    expect(screen.getByText("Trace Sampling and Retention")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Sampled traces")).toBeInTheDocument());

    fireEvent.click(screen.getByText("Save policy"));
    await waitFor(() => expect(RecoApi.updateTraceRetentionPolicy).toHaveBeenCalledWith({
      sampleRate: 0.25,
      retentionDays: 30,
      exportFormat: "both",
      storageMode: "download_only",
      includeFeatureValues: true
    }));

    fireEvent.click(screen.getByText("Run cleanup"));
    await waitFor(() => expect(RecoApi.cleanupTraceRetention).toHaveBeenCalled());
  });
});
