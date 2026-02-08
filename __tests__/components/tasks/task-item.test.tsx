import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TaskItem } from "@/components/tasks/task-item";
import type { Task, Project } from "@/types";

const mockTask: Task = {
  id: "task-1",
  workspace_id: "ws-1",
  project_id: "proj-1",
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

const mockProject: Project = {
  id: "proj-1",
  workspace_id: "ws-1",
  name: "Test Project",
  color: "#ff5500",
  icon: "folder",
  description: null,
  status: "active",
  created_at: "2026-01-01T00:00:00Z",
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

  it("does not render status badge for inbox status", () => {
    render(<TaskItem task={mockTask} />);
    expect(screen.queryByText("inbox")).not.toBeInTheDocument();
  });

  it("renders status badge for non-inbox statuses", () => {
    render(<TaskItem task={{ ...mockTask, status: "in_progress" }} />);
    expect(screen.getByText("in progress")).toBeInTheDocument();
  });

  it("fires onClick when clicked", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<TaskItem task={mockTask} onClick={onClick} />);

    await user.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("toggles status via checkbox with delay", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onStatusChange = vi.fn();
    render(<TaskItem task={mockTask} onStatusChange={onStatusChange} />);

    const checkbox = screen.getByRole("checkbox");
    await user.click(checkbox);

    // Advance past the 300ms animation delay
    vi.advanceTimersByTime(350);
    expect(onStatusChange).toHaveBeenCalledWith("done");

    vi.useRealTimers();
  });

  it("unchecks done task back to inbox", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onStatusChange = vi.fn();
    const doneTask = { ...mockTask, status: "done" as const };
    render(<TaskItem task={doneTask} onStatusChange={onStatusChange} />);

    const checkbox = screen.getByRole("checkbox");
    await user.click(checkbox);
    // Unchecking a done task fires immediately (no animation delay)
    expect(onStatusChange).toHaveBeenCalledWith("inbox");

    vi.useRealTimers();
  });

  it("applies done styling when task is done", () => {
    render(<TaskItem task={{ ...mockTask, status: "done" }} />);
    const title = screen.getByText("Test task title");
    expect(title.className).toContain("line-through");
  });

  it("renders project color dot and name when project provided", () => {
    render(
      <TaskItem task={mockTask} project={mockProject} showProject={true} />,
    );
    const dot = screen.getByTestId("project-dot");
    expect(dot).toBeInTheDocument();
    expect(dot).toHaveStyle({ backgroundColor: "#ff5500" });
    expect(screen.getByText("Test Project")).toBeInTheDocument();
  });

  it("hides project indicator when showProject is false", () => {
    render(
      <TaskItem task={mockTask} project={mockProject} showProject={false} />,
    );
    expect(screen.queryByTestId("project-dot")).not.toBeInTheDocument();
    expect(screen.queryByText("Test Project")).not.toBeInTheDocument();
  });
});
