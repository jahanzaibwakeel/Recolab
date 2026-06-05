import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi } from "vitest";
import { QueueOperationsPanel } from "../src/components/QueueOperationsPanel";
import { RecoApi } from "../src/lib/api";

vi.mock("../src/lib/api", () => ({
  RecoApi: {
    queues: vi.fn(() => Promise.resolve({ queue: "model-refresh", status: "connected", counts: {}, recent: [], failed: [] })),
    queueModelRefresh: vi.fn(() => Promise.resolve({ status: "queued" }))
  }
}));

describe("QueueOperationsPanel", () => {
  it("renders queue controls", async () => {
    render(<QueueOperationsPanel />);
    expect(screen.getByText("Queue Operations")).toBeInTheDocument();
    expect(screen.getByText("Refresh queue")).toBeInTheDocument();
    expect(screen.getByText("Queue model refresh")).toBeInTheDocument();
    expect(RecoApi.queues).toHaveBeenCalled();
  });
});

