import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, it } from "vitest";
import { Nav } from "../src/components/Nav";

describe("Nav", () => {
  it("renders core navigation", () => {
    render(<Nav />);
    expect(screen.getByText("AI Recommendation Engine")).toBeInTheDocument();
    expect(screen.getByText("Catalog")).toBeInTheDocument();
    expect(screen.getByText("Admin")).toBeInTheDocument();
  });
});
