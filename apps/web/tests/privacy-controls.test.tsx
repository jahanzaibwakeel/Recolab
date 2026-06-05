import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PrivacyControls } from "../src/components/PrivacyControls";
import { RecoApi } from "../src/lib/api";

vi.mock("../src/lib/api", () => ({
  RecoApi: {
    privacyExport: vi.fn(() => Promise.resolve({ generatedAt: "now", user: { id: "1" } })),
    anonymizeUser: vi.fn(() => Promise.resolve({ status: "anonymized" }))
  }
}));

describe("PrivacyControls", () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => "blob:privacy");
    URL.revokeObjectURL = vi.fn();
    HTMLAnchorElement.prototype.click = vi.fn();
  });

  it("exports and anonymizes local user data", async () => {
    render(<PrivacyControls users={[{
      id: "1",
      email: "ada@test.local",
      name: "Ada",
      role: "admin",
      preferredGenres: [],
      preferredSkills: [],
      blockedGenres: [],
      boostedProviders: [],
      boostedTags: [],
      personalExploration: 0.08
    }]} />);

    fireEvent.click(screen.getByText("Export data"));
    await waitFor(() => expect(RecoApi.privacyExport).toHaveBeenCalledWith("1"));

    fireEvent.click(screen.getByText("Anonymize user"));
    await waitFor(() => expect(RecoApi.anonymizeUser).toHaveBeenCalledWith("1", "User requested local data deletion"));
  });
});
