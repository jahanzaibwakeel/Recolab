import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi } from "vitest";
import { LoginPanel } from "../src/components/LoginPanel";

vi.mock("../src/lib/auth", () => ({
  clearSession: vi.fn(),
  getSession: () => null
}));

vi.mock("../src/lib/api", () => ({
  RecoApi: {
    login: vi.fn(() => Promise.resolve({ token: "token", refreshToken: "refresh", user: { name: "Ada", role: "admin" } })),
    logout: vi.fn(() => Promise.resolve({ status: "signed-out" })),
    refreshSession: vi.fn(() => Promise.resolve({ token: "token-2", refreshToken: "refresh-2", user: { name: "Ada", role: "admin" } })),
    requestPasswordReset: vi.fn(() => Promise.resolve({ resetToken: "local-reset-token" })),
    confirmPasswordReset: vi.fn(() => Promise.resolve({ status: "password-updated" }))
  }
}));

describe("LoginPanel", () => {
  it("renders refresh and local password reset controls", async () => {
    render(<LoginPanel onChange={vi.fn()} />);
    fireEvent.click(screen.getByText("Login"));
    await waitFor(() => expect(screen.getByText(/Signed in as Ada/)).toBeInTheDocument());
    fireEvent.click(screen.getByTitle("Refresh session"));
    await waitFor(() => expect(screen.getByText(/Session refreshed for Ada/)).toBeInTheDocument());
    fireEvent.click(screen.getByText("Request reset"));
    await waitFor(() => expect(screen.getByText("Local reset token generated")).toBeInTheDocument());
  });
});
