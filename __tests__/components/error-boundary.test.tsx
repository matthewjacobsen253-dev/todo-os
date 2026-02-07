import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RootError from "@/app/error";
import DashboardError from "@/app/(dashboard)/error";
import BriefingError from "@/app/(dashboard)/briefing/error";

describe("Error Boundaries", () => {
  it("renders error message and Try again button", () => {
    const error = new Error("Test error message");
    const reset = vi.fn();

    render(<DashboardError error={error} reset={reset} />);

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("Test error message")).toBeInTheDocument();
    expect(screen.getByText("Try again")).toBeInTheDocument();
  });

  it("calls reset when Try again is clicked", async () => {
    const user = userEvent.setup();
    const error = new Error("Crash");
    const reset = vi.fn();

    render(<RootError error={error} reset={reset} />);

    await user.click(screen.getByText("Try again"));

    expect(reset).toHaveBeenCalledOnce();
  });

  it("briefing error boundary shows error info", () => {
    const error = new Error("Claude API failed");
    const reset = vi.fn();

    render(<BriefingError error={error} reset={reset} />);

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("Claude API failed")).toBeInTheDocument();
  });
});
