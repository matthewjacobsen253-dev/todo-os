import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TaskList } from "@/components/tasks/task-list";
import type { Task, Project } from "@/types";

const createTask = (overrides: Partial<Task> = {}): Task => ({
  id: `task-${Math.random()}`,
  workspace_id: "ws-1",
  project_id: null,
  title: "Test task",
  description: null,
  status: "inbox",
  priority: "none",
  due_date: null,
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
  ...overrides,
});

const defaultProps = {
  onTaskClick: vi.fn(),
  onTaskStatusChange: vi.fn(),
  onTaskDelete: vi.fn(),
};

const mockProjects: Project[] = [
  {
    id: "proj-1",
    workspace_id: "ws-1",
    name: "Project Alpha",
    color: "#ff0000",
    icon: "folder",
    description: null,
    status: "active",
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "proj-2",
    workspace_id: "ws-1",
    name: "Project Beta",
    color: "#00ff00",
    icon: "folder",
    description: null,
    status: "active",
    created_at: "2026-01-01T00:00:00Z",
  },
];

describe("TaskList", () => {
  it("renders loading skeleton cards", () => {
    const { container } = render(
      <TaskList tasks={[]} loading={true} {...defaultProps} />,
    );
    // 5 skeleton cards
    const skeletons = container.querySelectorAll("[class*='animate-pulse']");
    expect(skeletons.length).toBe(5);
  });

  it("renders empty state message", () => {
    render(
      <TaskList
        tasks={[]}
        loading={false}
        emptyMessage="Nothing here"
        {...defaultProps}
      />,
    );
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
  });

  it("renders empty state sub-message", () => {
    render(
      <TaskList
        tasks={[]}
        loading={false}
        emptyMessage="Nothing here"
        emptySubMessage="Try adding a task"
        {...defaultProps}
      />,
    );
    expect(screen.getByText("Try adding a task")).toBeInTheDocument();
  });

  it("renders default empty message when none provided", () => {
    render(<TaskList tasks={[]} loading={false} {...defaultProps} />);
    expect(screen.getByText("No tasks yet")).toBeInTheDocument();
  });

  it("renders a list of tasks", () => {
    const tasks = [
      createTask({ id: "1", title: "Task One" }),
      createTask({ id: "2", title: "Task Two" }),
      createTask({ id: "3", title: "Task Three" }),
    ];

    render(<TaskList tasks={tasks} {...defaultProps} />);
    expect(screen.getByText("Task One")).toBeInTheDocument();
    expect(screen.getByText("Task Two")).toBeInTheDocument();
    expect(screen.getByText("Task Three")).toBeInTheDocument();
  });

  it("renders grouped sections with headers when groupBy=priority", () => {
    const tasks = [
      createTask({ id: "1", title: "Urgent Task", priority: "urgent" }),
      createTask({ id: "2", title: "Low Task", priority: "low" }),
      createTask({ id: "3", title: "Another Urgent", priority: "urgent" }),
    ];

    render(
      <TaskList tasks={tasks} groupByField="priority" {...defaultProps} />,
    );

    // Should show group headers with counts
    expect(screen.getByText("(2)")).toBeInTheDocument(); // 2 urgent
    expect(screen.getByText("(1)")).toBeInTheDocument(); // 1 low
    expect(screen.getByText("Urgent Task")).toBeInTheDocument();
    expect(screen.getByText("Low Task")).toBeInTheDocument();
  });

  it("renders grouped sections by project with project names", () => {
    const tasks = [
      createTask({ id: "1", title: "Alpha Task", project_id: "proj-1" }),
      createTask({ id: "2", title: "Beta Task", project_id: "proj-2" }),
      createTask({ id: "3", title: "No Project Task", project_id: null }),
    ];

    render(
      <TaskList
        tasks={tasks}
        groupByField="project"
        projects={mockProjects}
        {...defaultProps}
      />,
    );

    expect(screen.getByText("Project Alpha")).toBeInTheDocument();
    expect(screen.getByText("Project Beta")).toBeInTheDocument();
    expect(screen.getByText("No Project")).toBeInTheDocument();
  });
});
