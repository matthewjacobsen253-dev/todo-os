import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Task } from "@/types";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/upcoming",
}));

const mockTasks: Task[] = [];

// Mock store
vi.mock("@/store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/store")>();
  return {
    ...actual,
    useUI: () => ({
      sidebarOpen: true,
      taskDetailOpen: false,
      selectedTaskId: null,
      quickCaptureOpen: false,
      theme: "system",
      commandPaletteOpen: false,
    }),
    useUIActions: () => ({
      toggleSidebar: vi.fn(),
      openTaskDetail: vi.fn(),
      closeTaskDetail: vi.fn(),
      toggleQuickCapture: vi.fn(),
      setTheme: vi.fn(),
      toggleCommandPalette: vi.fn(),
    }),
    useCurrentWorkspace: () => ({ id: "ws-1", name: "Test" }),
    useTasks: () => ({
      tasks: mockTasks,
      filteredTasks: mockTasks,
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
  };
});

// Mock hooks
vi.mock("@/hooks/useTasks", () => ({
  useTasksWithSync: () => ({
    tasks: mockTasks,
    filteredTasks: mockTasks,
    filters: {},
    loading: false,
    error: null,
    changeTaskStatus: vi.fn(),
    deleteTask: vi.fn(),
    setFilter: vi.fn(),
    clearFilters: vi.fn(),
  }),
}));

vi.mock("@/hooks/useProjects", () => ({
  useProjectsWithSync: () => ({
    projects: [],
    updateProject: vi.fn(),
    deleteProject: vi.fn(),
  }),
}));

// Mock task detail sidebar
vi.mock("@/components/tasks/task-detail-sidebar", () => ({
  TaskDetailSidebar: () => null,
}));

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

describe("UpcomingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTasks.length = 0;
  });

  it("renders the Upcoming title", async () => {
    const { default: UpcomingPage } =
      await import("@/app/(dashboard)/upcoming/page");
    render(<UpcomingPage />);
    expect(screen.getByText("Upcoming")).toBeInTheDocument();
  });

  it("shows empty state when no tasks", async () => {
    const { default: UpcomingPage } =
      await import("@/app/(dashboard)/upcoming/page");
    render(<UpcomingPage />);
    expect(screen.getByText("Your week is clear!")).toBeInTheDocument();
    expect(screen.getByText("0 tasks this week")).toBeInTheDocument();
  });

  it("shows task count when tasks exist", async () => {
    // Use today's date to match
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    mockTasks.push(
      createTask({ id: "t1", title: "Task for today", due_date: todayStr }),
    );

    const { default: UpcomingPage } =
      await import("@/app/(dashboard)/upcoming/page");
    render(<UpcomingPage />);
    expect(screen.getByText("1 task this week")).toBeInTheDocument();
    expect(screen.getByText("Task for today")).toBeInTheDocument();
  });

  it("renders day section labels", async () => {
    const { default: UpcomingPage } =
      await import("@/app/(dashboard)/upcoming/page");

    // Add a task for today to avoid empty state
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    mockTasks.push(
      createTask({ id: "t1", title: "Today task", due_date: todayStr }),
    );

    render(<UpcomingPage />);
    expect(screen.getByText("Today")).toBeInTheDocument();
    expect(screen.getByText("Tomorrow")).toBeInTheDocument();
  });
});
