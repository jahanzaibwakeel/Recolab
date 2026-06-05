import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi } from "vitest";
import { ImportPipelinePanel } from "../src/components/ImportPipelinePanel";

describe("ImportPipelinePanel", () => {
  it("renders import controls", () => {
    render(<ImportPipelinePanel onComplete={vi.fn()} />);
    expect(screen.getByText("Import Pipeline UI")).toBeInTheDocument();
    expect(screen.getByText("Import only")).toBeInTheDocument();
    expect(screen.getByText("Run full pipeline")).toBeInTheDocument();
    expect(screen.getByLabelText("MovieLens source directory")).toBeInTheDocument();
  });
});

