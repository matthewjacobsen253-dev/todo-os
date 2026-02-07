import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReviewTaskCard } from "@/components/review/review-task-card";
import type { ReviewQueueItem } from "@/types";

const mockItem: ReviewQueueItem = {
  id: "task-1",
  title: "Review Q3 report",
  description: "Bob needs the Q3 report reviewed by Friday",
  priority: "high",
  due_date: "2026-02-14T00:00:00Z",
  confidence_score: 0.85,
  source_type: "email",
  source_email_subject: "Q3 Report Review",
  source_email_sender: "bob@example.com",
  source_email_date: "2026-02-07T10:00:00Z",
  review_status: "pending",
  created_at: "2026-02-07T10:00:00Z",
};

describe("ReviewTaskCard", () => {
  it("renders task title", () => {
    render(
      <ReviewTaskCard item={mockItem} onApprove={vi.fn()} onReject={vi.fn()} />,
    );
    expect(screen.getByText("Review Q3 report")).toBeInTheDocument();
  });

  it("renders source email info", () => {
    render(
      <ReviewTaskCard item={mockItem} onApprove={vi.fn()} onReject={vi.fn()} />,
    );
    expect(screen.getByTestId("source-sender")).toHaveTextContent(
      "bob@example.com",
    );
    expect(screen.getByTestId("source-subject")).toHaveTextContent(
      "Q3 Report Review",
    );
  });

  it("renders green confidence badge for high confidence", () => {
    render(
      <ReviewTaskCard item={mockItem} onApprove={vi.fn()} onReject={vi.fn()} />,
    );
    const badge = screen.getByTestId("confidence-badge");
    expect(badge).toHaveTextContent("High");
    expect(badge).toHaveTextContent("85%");
    expect(badge.className).toContain("green");
  });

  it("renders yellow confidence badge for medium confidence", () => {
    const mediumItem = { ...mockItem, confidence_score: 0.55 };
    render(
      <ReviewTaskCard
        item={mediumItem}
        onApprove={vi.fn()}
        onReject={vi.fn()}
      />,
    );
    const badge = screen.getByTestId("confidence-badge");
    expect(badge).toHaveTextContent("Medium");
    expect(badge.className).toContain("yellow");
  });

  it("renders red confidence badge for low confidence", () => {
    const lowItem = { ...mockItem, confidence_score: 0.2 };
    render(
      <ReviewTaskCard item={lowItem} onApprove={vi.fn()} onReject={vi.fn()} />,
    );
    const badge = screen.getByTestId("confidence-badge");
    expect(badge).toHaveTextContent("Low");
    expect(badge.className).toContain("red");
  });

  it("calls onApprove when Approve button is clicked", async () => {
    const user = userEvent.setup();
    const onApprove = vi.fn();
    render(
      <ReviewTaskCard
        item={mockItem}
        onApprove={onApprove}
        onReject={vi.fn()}
      />,
    );

    await user.click(screen.getByTestId("approve-button"));
    expect(onApprove).toHaveBeenCalledWith("task-1");
  });

  it("calls onReject when Reject button is clicked", async () => {
    const user = userEvent.setup();
    const onReject = vi.fn();
    render(
      <ReviewTaskCard
        item={mockItem}
        onApprove={vi.fn()}
        onReject={onReject}
      />,
    );

    await user.click(screen.getByTestId("reject-button"));
    expect(onReject).toHaveBeenCalledWith("task-1");
  });

  it("renders priority badge", () => {
    render(
      <ReviewTaskCard item={mockItem} onApprove={vi.fn()} onReject={vi.fn()} />,
    );
    expect(screen.getByText("high")).toBeInTheDocument();
  });
});
