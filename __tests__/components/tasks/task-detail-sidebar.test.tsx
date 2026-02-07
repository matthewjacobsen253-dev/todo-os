import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { TaskDetailSidebar } from "@/components/tasks/task-detail-sidebar";
import type { Task } from "@/types";

// Mock the store
const mockTask: Task = {
  id: "task-1",
  workspace_id: "ws-1",
  project_id: null,
  title: "Test task for sidebar",
  description: "This is a test description",
  status: "inbox",
  priority: "high",
  due_date: "2026-02-10",
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

const mockUpdateTask = vi.fn();
const mockDeleteTask = vi.fn();

vi.mock("@/hooks/useTasks", () => ({
  useTask: (taskId: string | null) => {
    if (taskId === "task-1") return mockTask;
    return undefined;
  },
  useTasksWithSync: () => ({
    tasks: [mockTask],
    filteredTasks: [mockTask],
    filters: {},
    loading: false,
    error: null,
    createTask: vi.fn(),
    updateTask: mockUpdateTask,
    deleteTask: mockDeleteTask,
    changeTaskStatus: vi.fn(),
    changeTaskPriority: vi.fn(),
    setFilter: vi.fn(),
    clearFilters: vi.fn(),
  }),
}));

vi.mock("@/hooks/useProjects", () => ({
  useProjectsWithSync: () => ({
    projects: [],
    loading: false,
    error: null,
    createProject: vi.fn(),
    updateProject: vi.fn(),
    deleteProject: vi.fn(),
  }),
  useProject: () => undefined,
}));

vi.mock("@/store", () => ({
  useCurrentWorkspace: () => ({ id: "ws-1", name: "Test Workspace" }),
  useTasks: () => ({
    tasks: [mockTask],
    filteredTasks: [mockTask],
    filters: {},
    loading: false,
    error: null,
  }),
  useTaskActions: () => ({
    setFilter: vi.fn(),
    clearFilters: vi.fn(),
    fetchTasks: vi.fn(),
    createTask: vi.fn(),
    updateTask: vi.fn(),
    deleteTask: vi.fn(),
  }),
  useProjects: () => ({
    projects: [],
    loading: false,
    error: null,
  }),
  useProjectActions: () => ({
    fetchProjects: vi.fn(),
    createProject: vi.fn(),
    updateProject: vi.fn(),
    deleteProject: vi.fn(),
  }),
}));

describe("TaskDetailSidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders task not found when taskId is null", () => {
    render(<TaskDetailSidebar taskId={null} open={true} onClose={vi.fn()} />);
    expect(screen.getByText("Task Not Found")).toBeInTheDocument();
  });

  it("renders task details when task exists", () => {
    render(<TaskDetailSidebar taskId="task-1" open={true} onClose={vi.fn()} />);
    expect(screen.getByText("Test task for sidebar")).toBeInTheDocument();
    expect(screen.getByText("This is a test description")).toBeInTheDocument();
  });

  it("renders delete button", () => {
    render(<TaskDetailSidebar taskId="task-1" open={true} onClose={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: /delete task/i }),
    ).toBeInTheDocument();
  });

  it("renders metadata", () => {
    render(<TaskDetailSidebar taskId="task-1" open={true} onClose={vi.fn()} />);
    expect(screen.getByText("Created")).toBeInTheDocument();
    expect(screen.getByText("Updated")).toBeInTheDocument();
    expect(screen.getByText("Source")).toBeInTheDocument();
    expect(screen.getByText("manual")).toBeInTheDocument();
  });
});
