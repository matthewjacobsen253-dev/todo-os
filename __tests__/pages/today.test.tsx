import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { Task } from "@/types";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  })),
  usePathname: vi.fn(() => "/today"),
}));

// Mock date-fns format function
vi.mock("date-fns", async () => {
  const actual = await vi.importActual("date-fns");
  return {
    ...actual,
    format: vi.fn((date: Date, formatStr: string) => {
      if (formatStr === "EEEE, MMMM d") return "Saturday, February 7";
      return "Feb 7, 2026";
    }),
  };
});

// Mock the hooks
const mockChangeTaskStatus = vi.fn();
const mockDeleteTask = vi.fn();
const mockOpenTaskDetail = vi.fn();
const mockCloseTaskDetail = vi.fn();
const mockUpdateTask = vi.fn();

vi.mock("@/hooks/useTasks", () => ({
  useTasksWithSync: vi.fn(() => ({
    tasks: [],
    loading: false,
    changeTaskStatus: mockChangeTaskStatus,
    deleteTask: mockDeleteTask,
    updateTask: mockUpdateTask,
  })),
  useTask: vi.fn(() => null),
}));

vi.mock("@/hooks/useProjects", () => ({
  useProjectsWithSync: vi.fn(() => ({
    projects: [],
    loading: false,
  })),
  useProject: vi.fn(() => null),
}));

vi.mock("@/store", () => ({
  useUI: vi.fn(() => ({
    taskDetailOpen: false,
    selectedTaskId: null,
  })),
  useUIActions: vi.fn(() => ({
    openTaskDetail: mockOpenTaskDetail,
    closeTaskDetail: mockCloseTaskDetail,
    toggleQuickCapture: vi.fn(),
  })),
  useCurrentWorkspace: vi.fn(() => ({ id: "ws-1", name: "Test Workspace" })),
  useTasks: vi.fn(() => ({
    tasks: [],
    filteredTasks: [],
    filters: {},
    loading: false,
    error: null,
  })),
  useTaskActions: vi.fn(() => ({
    fetchTasks: vi.fn(),
    createTask: vi.fn(),
    updateTask: vi.fn(),
    deleteTask: vi.fn(),
    setFilter: vi.fn(),
    clearFilters: vi.fn(),
  })),
}));

// Mock Supabase client
vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    channel: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
    removeChannel: vi.fn(),
  })),
}));

const createTask = (overrides: Partial<Task> = {}): Task => ({
  id: `task-${Math.random()}`,
  workspace_id: "ws-1",
  project_id: null,
  title: "Test task",
  description: null,
  status: "todo",
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

describe("TodayPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders empty state when no tasks are due", async () => {
    const { useTasksWithSync } = await import("@/hooks/useTasks");
    vi.mocked(useTasksWithSync).mockReturnValue({
      tasks: [],
      loading: false,
      error: null,
      filteredTasks: [],
      filters: {},
      createTask: vi.fn(),
      updateTask: vi.fn(),
      changeTaskStatus: mockChangeTaskStatus,
      deleteTask: mockDeleteTask,
      changeTaskPriority: vi.fn(),
      setFilter: vi.fn(),
      clearFilters: vi.fn(),
    });

    const TodayPage = (await import("@/app/(dashboard)/today/page")).default;
    render(<TodayPage />);

    expect(screen.getByText("Today")).toBeInTheDocument();
    expect(screen.getByText("You're all caught up!")).toBeInTheDocument();
    expect(
      screen.getByText("No tasks due today or overdue."),
    ).toBeInTheDocument();
  });

  it("renders loading state", async () => {
    const { useTasksWithSync } = await import("@/hooks/useTasks");
    vi.mocked(useTasksWithSync).mockReturnValue({
      tasks: [],
      loading: true,
      error: null,
      filteredTasks: [],
      filters: {},
      createTask: vi.fn(),
      updateTask: vi.fn(),
      changeTaskStatus: mockChangeTaskStatus,
      deleteTask: mockDeleteTask,
      changeTaskPriority: vi.fn(),
      setFilter: vi.fn(),
      clearFilters: vi.fn(),
    });

    const TodayPage = (await import("@/app/(dashboard)/today/page")).default;
    const { container } = render(<TodayPage />);

    // Should show loading skeleton
    const skeletons = container.querySelectorAll("[class*='animate-pulse']");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders overdue section when tasks are past due", async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString();

    const overdueTasks = [
      createTask({
        id: "overdue-1",
        title: "Overdue Task 1",
        due_date: yesterdayStr,
        status: "todo",
      }),
      createTask({
        id: "overdue-2",
        title: "Overdue Task 2",
        due_date: yesterdayStr,
        status: "in_progress",
      }),
    ];

    const { useTasksWithSync } = await import("@/hooks/useTasks");
    vi.mocked(useTasksWithSync).mockReturnValue({
      tasks: overdueTasks,
      loading: false,
      error: null,
      filteredTasks: overdueTasks,
      filters: {},
      createTask: vi.fn(),
      updateTask: vi.fn(),
      changeTaskStatus: mockChangeTaskStatus,
      deleteTask: mockDeleteTask,
      changeTaskPriority: vi.fn(),
      setFilter: vi.fn(),
      clearFilters: vi.fn(),
    });

    const TodayPage = (await import("@/app/(dashboard)/today/page")).default;
    render(<TodayPage />);

    expect(screen.getByText("Overdue")).toBeInTheDocument();
    expect(screen.getByText("(2)")).toBeInTheDocument();
    expect(screen.getByText("Overdue Task 1")).toBeInTheDocument();
    expect(screen.getByText("Overdue Task 2")).toBeInTheDocument();
  });

  it("renders due today section", async () => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const todayStr = today.toISOString();

    const todayTasks = [
      createTask({
        id: "today-1",
        title: "Today Task 1",
        due_date: todayStr,
        status: "todo",
        priority: "high",
      }),
      createTask({
        id: "today-2",
        title: "Today Task 2",
        due_date: todayStr,
        status: "todo",
        priority: "low",
      }),
    ];

    const { useTasksWithSync } = await import("@/hooks/useTasks");
    vi.mocked(useTasksWithSync).mockReturnValue({
      tasks: todayTasks,
      loading: false,
      error: null,
      filteredTasks: todayTasks,
      filters: {},
      createTask: vi.fn(),
      updateTask: vi.fn(),
      changeTaskStatus: mockChangeTaskStatus,
      deleteTask: mockDeleteTask,
      changeTaskPriority: vi.fn(),
      setFilter: vi.fn(),
      clearFilters: vi.fn(),
    });

    const TodayPage = (await import("@/app/(dashboard)/today/page")).default;
    render(<TodayPage />);

    expect(screen.getByText("Due Today")).toBeInTheDocument();
    expect(screen.getByText("Today Task 1")).toBeInTheDocument();
    expect(screen.getByText("Today Task 2")).toBeInTheDocument();
  });

  it("renders completed today section with toggle", async () => {
    const now = new Date();
    const completedTasks = [
      createTask({
        id: "completed-1",
        title: "Completed Task 1",
        status: "done",
        completed_at: now.toISOString(),
      }),
    ];

    const { useTasksWithSync } = await import("@/hooks/useTasks");
    vi.mocked(useTasksWithSync).mockReturnValue({
      tasks: completedTasks,
      loading: false,
      error: null,
      filteredTasks: completedTasks,
      filters: {},
      createTask: vi.fn(),
      updateTask: vi.fn(),
      changeTaskStatus: mockChangeTaskStatus,
      deleteTask: mockDeleteTask,
      changeTaskPriority: vi.fn(),
      setFilter: vi.fn(),
      clearFilters: vi.fn(),
    });

    const TodayPage = (await import("@/app/(dashboard)/today/page")).default;
    render(<TodayPage />);

    expect(screen.getByText("Completed Today")).toBeInTheDocument();
    expect(screen.getByText("Completed Task 1")).toBeInTheDocument();
  });

  it("toggles completed section visibility", async () => {
    const now = new Date();
    const completedTasks = [
      createTask({
        id: "completed-1",
        title: "Completed Toggle Test",
        status: "done",
        completed_at: now.toISOString(),
      }),
    ];

    const { useTasksWithSync } = await import("@/hooks/useTasks");
    vi.mocked(useTasksWithSync).mockReturnValue({
      tasks: completedTasks,
      loading: false,
      error: null,
      filteredTasks: completedTasks,
      filters: {},
      createTask: vi.fn(),
      updateTask: vi.fn(),
      changeTaskStatus: mockChangeTaskStatus,
      deleteTask: mockDeleteTask,
      changeTaskPriority: vi.fn(),
      setFilter: vi.fn(),
      clearFilters: vi.fn(),
    });

    const TodayPage = (await import("@/app/(dashboard)/today/page")).default;
    render(<TodayPage />);

    // Initially task should be visible
    expect(screen.getByText("Completed Toggle Test")).toBeInTheDocument();

    // Click to collapse
    const toggleButton = screen.getByRole("button", {
      name: /Completed Today/i,
    });
    fireEvent.click(toggleButton);

    // Task should be hidden now
    expect(screen.queryByText("Completed Toggle Test")).not.toBeInTheDocument();

    // Click to expand again
    fireEvent.click(toggleButton);

    // Task should be visible again
    expect(screen.getByText("Completed Toggle Test")).toBeInTheDocument();
  });

  it("shows progress bar when tasks exist", async () => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const todayStr = today.toISOString();

    const tasks = [
      createTask({
        id: "today-1",
        title: "Today Task",
        due_date: todayStr,
        status: "todo",
      }),
      createTask({
        id: "completed-1",
        title: "Completed Task",
        status: "done",
        completed_at: new Date().toISOString(),
      }),
    ];

    const { useTasksWithSync } = await import("@/hooks/useTasks");
    vi.mocked(useTasksWithSync).mockReturnValue({
      tasks: tasks,
      loading: false,
      error: null,
      filteredTasks: tasks,
      filters: {},
      createTask: vi.fn(),
      updateTask: vi.fn(),
      changeTaskStatus: mockChangeTaskStatus,
      deleteTask: mockDeleteTask,
      changeTaskPriority: vi.fn(),
      setFilter: vi.fn(),
      clearFilters: vi.fn(),
    });

    const TodayPage = (await import("@/app/(dashboard)/today/page")).default;
    render(<TodayPage />);

    // Should show progress bar with 1/2 done (50%)
    expect(screen.getByText("1/2 done")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(screen.getByTestId("progress-bar")).toBeInTheDocument();
  });

  it("excludes cancelled and done tasks from overdue/due today", async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString();

    const tasks = [
      createTask({
        id: "cancelled-1",
        title: "Cancelled Task",
        due_date: yesterdayStr,
        status: "cancelled",
      }),
      createTask({
        id: "done-1",
        title: "Done Task",
        due_date: yesterdayStr,
        status: "done",
        completed_at: null, // completed yesterday, not today
      }),
    ];

    const { useTasksWithSync } = await import("@/hooks/useTasks");
    vi.mocked(useTasksWithSync).mockReturnValue({
      tasks: tasks,
      loading: false,
      error: null,
      filteredTasks: tasks,
      filters: {},
      createTask: vi.fn(),
      updateTask: vi.fn(),
      changeTaskStatus: mockChangeTaskStatus,
      deleteTask: mockDeleteTask,
      changeTaskPriority: vi.fn(),
      setFilter: vi.fn(),
      clearFilters: vi.fn(),
    });

    const TodayPage = (await import("@/app/(dashboard)/today/page")).default;
    render(<TodayPage />);

    // Should show empty state since cancelled/done tasks are excluded from overdue/today
    expect(screen.getByText("You're all caught up!")).toBeInTheDocument();
    expect(screen.queryByText("Cancelled Task")).not.toBeInTheDocument();
  });
});
