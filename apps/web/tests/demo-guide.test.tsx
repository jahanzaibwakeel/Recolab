import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, it } from "vitest";
import { DemoGuide } from "../src/components/DemoGuide";

describe("DemoGuide", () => {
  it("renders guided recruiter checklist and tracks completion", () => {
    render(<DemoGuide />);
    expect(screen.getByText("Guided Walkthrough")).toBeInTheDocument();
    expect(screen.getByText("Open recommendations")).toBeInTheDocument();
    expect(screen.getByText("0/4")).toBeInTheDocument();
    fireEvent.click(screen.getByTitle("Mark Open recommendations"));
    expect(screen.getByText("1/4")).toBeInTheDocument();
  });
});
