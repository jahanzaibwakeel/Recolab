import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi } from "vitest";
import { PrivacyAuditPanel } from "../src/components/PrivacyAuditPanel";

vi.mock("../src/lib/api", () => ({
  RecoApi: {
    privacyAudit: vi.fn(() => Promise.resolve([
      { id: "e1", action: "export", target_name: "Ada", actor_name: "Ada", created_at: "2026-06-05T00:00:00.000Z" }
    ]))
  }
}));

describe("PrivacyAuditPanel", () => {
  it("renders privacy audit events", async () => {
    render(<PrivacyAuditPanel />);
    expect(screen.getByText("Privacy Audit")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Ada")).toBeInTheDocument());
    expect(screen.getByText("export")).toBeInTheDocument();
  });
});
