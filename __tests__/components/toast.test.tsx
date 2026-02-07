import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { ToastProvider, useToast } from "@/components/ui/toast";

// Helper component that uses the toast hook
function ToastTrigger({
  message,
  type,
  duration,
}: {
  message: string;
  type: "success" | "error" | "warning" | "info";
  duration?: number;
}) {
  const { addToast } = useToast();
  return (
    <button onClick={() => addToast(message, type, duration)}>
      Show Toast
    </button>
  );
}

describe("Toast System", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders a toast when triggered", () => {
    render(
      <ToastProvider>
        <ToastTrigger message="Test toast message" type="info" />
      </ToastProvider>,
    );

    act(() => {
      fireEvent.click(screen.getByText("Show Toast"));
    });

    expect(screen.getByText("Test toast message")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("auto-dismisses toast after duration", () => {
    render(
      <ToastProvider>
        <ToastTrigger
          message="Disappearing toast"
          type="info"
          duration={3000}
        />
      </ToastProvider>,
    );

    act(() => {
      fireEvent.click(screen.getByText("Show Toast"));
    });

    expect(screen.getByText("Disappearing toast")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3100);
    });

    expect(screen.queryByText("Disappearing toast")).not.toBeInTheDocument();
  });

  it("applies error styling for error toasts", () => {
    render(
      <ToastProvider>
        <ToastTrigger message="Error occurred" type="error" />
      </ToastProvider>,
    );

    act(() => {
      fireEvent.click(screen.getByText("Show Toast"));
    });

    const alert = screen.getByRole("alert");
    expect(alert.className).toContain("bg-red");
  });

  it("throws error when useToast is used outside provider", () => {
    function BadComponent() {
      useToast();
      return null;
    }

    expect(() => render(<BadComponent />)).toThrow(
      "useToast must be used within ToastProvider",
    );
  });
});
