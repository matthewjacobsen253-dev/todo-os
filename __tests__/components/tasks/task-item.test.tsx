import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TaskItem } from "@/components/tasks/task-item";
import type { Task } from "@/types";

const mockTask: Task = {
  id: "task-1",
  workspace_id: "ws-1",
  project_id: null,
  title: "Test task title",
  description: "Test task description",
  status: "inbox",
  priority: "high",
  due_date: "2026-02-10T00:00:00Z",
  assignee_id: null,
  creator_id: "user-1",
  source_type: "manual",
  source_id: null,
  confidence_score: null,
  needs_review: false,
  tags: [],
  position: 1,
  completed_at: null,
  created_at: "2026-02-01T00:00:00Z",
  updated_at: "2026-02-01T00:00:00Z",
};

describe("TaskItem", () => {
  it("renders task title and description", () => {
    render(<TaskItem task={mockTask} />);
    expect(screen.getByText("Test task title")).toBeInTheDocument();
    expect(screen.getByText(/Test task description/)).toBeInTheDocument();
  });

  it("renders priority badge for non-none priorities", () => {
    render(<TaskItem task={mockTask} />);
    expect(screen.getByText("high")).toBeInTheDocument();
  });

  it("does not render priority badge for none priority", () => {
    render(<TaskItem task={{ ...mockTask, priority: "none" }} />);
    expect(screen.queryByText("none")).not.toBeInTheDocument();
  });

  it("renders status badge", () => {
    render(<TaskItem task={mockTask} />);
    expect(screen.getByText("inbox")).toBeInTheDocument();
  });

  it("fires onClick when clicked", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<TaskItem task={mockTask} onClick={onClick} />);

    await user.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("toggles status via checkbox", async () => {
    const user = userEvent.setup();
    const onStatusChange = vi.fn();
    render(<TaskItem task={mockTask} onStatusChange={onStatusChange} />);

    const checkbox = screen.getByRole("checkbox");
    await user.click(checkbox);
    expect(onStatusChange).toHaveBeenCalledWith("done");
  });

  it("unchecks done task back to inbox", async () => {
    const user = userEvent.setup();
    const onStatusChange = vi.fn();
    const doneTask = { ...mockTask, status: "done" as const };
    render(<TaskItem task={doneTask} onStatusChange={onStatusChange} />);

    const checkbox = screen.getByRole("checkbox");
    await user.click(checkbox);
    expect(onStatusChange).toHaveBeenCalledWith("inbox");
  });

  it("applies done styling when task is done", () => {
    render(<TaskItem task={{ ...mockTask, status: "done" }} />);
    const title = screen.getByText("Test task title");
    expect(title.className).toContain("line-through");
  });
});
