import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TopOutcomesSection } from "@/components/briefing/top-outcomes-section";
import { OverdueSection } from "@/components/briefing/overdue-section";
import { FeedbackWidget } from "@/components/briefing/feedback-widget";
import { SummaryStats } from "@/components/briefing/summary-stats";
import { MustDoSection } from "@/components/briefing/must-do-section";
import { WaitingOnSection } from "@/components/briefing/waiting-on-section";
import { DeferSuggestionsSection } from "@/components/briefing/defer-suggestions-section";

describe("TopOutcomesSection", () => {
  const outcomes = [
    { task_id: "t1", title: "Ship feature X", priority: "urgent" as const },
    { task_id: "t2", title: "Review PR", priority: "high" as const },
    { task_id: "t3", title: "Update docs", priority: "medium" as const },
  ];

  it("renders all outcome items with titles", () => {
    render(<TopOutcomesSection outcomes={outcomes} />);
    expect(screen.getByText("Ship feature X")).toBeInTheDocument();
    expect(screen.getByText("Review PR")).toBeInTheDocument();
    expect(screen.getByText("Update docs")).toBeInTheDocument();
  });

  it("renders numbered indicators", () => {
    render(<TopOutcomesSection outcomes={outcomes} />);
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("renders priority badges", () => {
    render(<TopOutcomesSection outcomes={outcomes} />);
    expect(screen.getByText("urgent")).toBeInTheDocument();
    expect(screen.getByText("high")).toBeInTheDocument();
    expect(screen.getByText("medium")).toBeInTheDocument();
  });

  it("calls onTaskClick when item is clicked", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<TopOutcomesSection outcomes={outcomes} onTaskClick={onClick} />);

    await user.click(screen.getByTestId("outcome-0"));
    expect(onClick).toHaveBeenCalledWith("t1");
  });

  it("shows encouraging message when outcomes is empty", () => {
    render(<TopOutcomesSection outcomes={[]} />);
    expect(
      screen.getByText("No high-priority tasks for today."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Great time to work on longer-term goals!"),
    ).toBeInTheDocument();
  });
});

describe("OverdueSection", () => {
  const items = [
    {
      task_id: "t1",
      title: "Overdue task A",
      days_overdue: 3,
      priority: "high" as const,
    },
    {
      task_id: "t2",
      title: "Critical overdue",
      days_overdue: 10,
      priority: "urgent" as const,
    },
  ];

  it("renders overdue items with correct days", () => {
    render(<OverdueSection items={items} />);
    expect(screen.getByText("Overdue task A")).toBeInTheDocument();
    expect(screen.getByTestId("days-overdue-t1")).toHaveTextContent(
      "3d overdue",
    );
  });

  it("shows Critical label for 7+ days overdue", () => {
    render(<OverdueSection items={items} />);
    expect(screen.getByTestId("days-overdue-t2")).toHaveTextContent("Critical");
    expect(screen.getByTestId("days-overdue-t2")).toHaveTextContent(
      "10d overdue",
    );
  });

  it("does not show Critical for less than 7 days", () => {
    render(<OverdueSection items={items} />);
    expect(screen.getByTestId("days-overdue-t1").textContent).not.toContain(
      "Critical",
    );
  });

  it("shows celebration message when items is empty", () => {
    render(<OverdueSection items={[]} />);
    expect(
      screen.getByText("No overdue tasks — you're on track!"),
    ).toBeInTheDocument();
  });
});

describe("FeedbackWidget", () => {
  it("calls onFeedback with thumbs_up when thumbs up is clicked", async () => {
    const user = userEvent.setup();
    const onFeedback = vi.fn();
    render(<FeedbackWidget currentFeedback={null} onFeedback={onFeedback} />);

    await user.click(screen.getByTestId("feedback-thumbs-up"));
    expect(onFeedback).toHaveBeenCalledWith("thumbs_up");
  });

  it("shows active state for current feedback", () => {
    render(<FeedbackWidget currentFeedback="thumbs_up" onFeedback={vi.fn()} />);
    const thumbsUp = screen.getByTestId("feedback-thumbs-up");
    expect(thumbsUp.className).toContain("green");
  });

  it("shows active state for thumbs down feedback", () => {
    render(
      <FeedbackWidget currentFeedback="thumbs_down" onFeedback={vi.fn()} />,
    );
    const thumbsDown = screen.getByTestId("feedback-thumbs-down");
    expect(thumbsDown.className).toContain("red");
  });
});

describe("SummaryStats", () => {
  const summary = {
    total_tasks: 15,
    urgent_count: 3,
    completed_today: 5,
  };

  it("renders all stat values", () => {
    render(<SummaryStats summary={summary} />);
    expect(screen.getByTestId("stat-total-tasks")).toHaveTextContent("15");
    expect(screen.getByTestId("stat-urgent")).toHaveTextContent("3");
    expect(screen.getByTestId("stat-completed-today")).toHaveTextContent("5");
  });

  it("renders stat labels", () => {
    render(<SummaryStats summary={summary} />);
    expect(screen.getByText("Total Tasks")).toBeInTheDocument();
    expect(screen.getByText("Urgent")).toBeInTheDocument();
    expect(screen.getByText("Completed Today")).toBeInTheDocument();
  });

  it("returns null when summary is undefined", () => {
    const { container } = render(<SummaryStats summary={undefined} />);
    expect(container.firstChild).toBeNull();
  });
});

describe("MustDoSection", () => {
  const items = [
    {
      task_id: "t1",
      title: "Must do task",
      due_date: "2026-02-07",
      priority: "high" as const,
    },
  ];

  it("renders must-do items", () => {
    render(<MustDoSection items={items} />);
    expect(screen.getByText("Must do task")).toBeInTheDocument();
  });

  it("shows encouraging message when items is empty", () => {
    render(<MustDoSection items={[]} />);
    expect(
      screen.getByText("Nothing urgent today. Enjoy your breathing room!"),
    ).toBeInTheDocument();
  });
});

describe("WaitingOnSection", () => {
  const items = [
    {
      task_id: "t1",
      title: "Waiting task",
      waiting_for: "Bob's approval",
    },
  ];

  it("renders waiting items with waiting_for text", () => {
    render(<WaitingOnSection items={items} />);
    expect(screen.getByText("Waiting task")).toBeInTheDocument();
    expect(screen.getByText("Bob's approval")).toBeInTheDocument();
  });

  it("shows positive message when items is empty", () => {
    render(<WaitingOnSection items={[]} />);
    expect(
      screen.getByText("No blockers — everything is in your hands"),
    ).toBeInTheDocument();
  });
});

describe("DeferSuggestionsSection", () => {
  const items = [
    { task_id: "t1", title: "Low priority task", reason: "Not due this week" },
  ];

  it("renders defer suggestions with reasons", () => {
    render(<DeferSuggestionsSection items={items} />);
    expect(screen.getByText("Low priority task")).toBeInTheDocument();
    // Using regex to match the reason text (rendered inside curly quotes)
    expect(screen.getByText(/Not due this week/)).toBeInTheDocument();
  });

  it("returns null when items is empty", () => {
    const { container } = render(<DeferSuggestionsSection items={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
