import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { TaskItem } from "@/components/tasks/task-item";
import type { Task } from "@/types";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => "/inbox",
}));

// Mock store — use importOriginal to get all exports, override specifics
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
    useReviewQueue: () => ({ count: 0 }),
    useCurrentWorkspace: () => ({ id: "ws-1", name: "Test" }),
    useTasks: () => ({
      tasks: [],
      filteredTasks: [],
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
    useBriefing: () => ({
      todayBriefing: null,
      loading: false,
      error: null,
      generating: false,
    }),
    useBriefingActions: () => ({
      fetchBriefing: vi.fn(),
      setBriefing: vi.fn(),
      generateBriefing: vi.fn(),
      submitFeedback: vi.fn(),
    }),
    useWorkspaceActions: () => ({
      setCurrentWorkspace: vi.fn(),
      fetchWorkspaces: vi.fn(),
      createWorkspace: vi.fn(),
    }),
    useStore: Object.assign(
      (selector?: (state: Record<string, unknown>) => unknown) => {
        const state = {
          currentWorkspace: {
            id: "ws-1",
            name: "Test",
            slug: "test",
            owner_id: "user-1",
            created_at: "2026-01-01",
            settings: {},
            role: "owner",
            member_count: 1,
          },
          workspaces: [],
          workspaceLoading: false,
          setCurrentWorkspace: vi.fn(),
          fetchWorkspaces: vi.fn(),
        };
        return selector ? selector(state) : state;
      },
      {
        getState: () => ({
          currentWorkspace: {
            id: "ws-1",
            name: "Test",
            slug: "test",
            owner_id: "user-1",
            created_at: "2026-01-01",
            settings: {},
            role: "owner",
            member_count: 1,
          },
          workspaces: [],
          workspaceLoading: false,
          setCurrentWorkspace: vi.fn(),
          fetchWorkspaces: vi.fn(),
        }),
      },
    ),
  };
});

// Mock hooks
vi.mock("@/hooks/useKeyboardShortcuts", () => ({
  useKeyboardShortcuts: vi.fn(),
}));

vi.mock("@/hooks/useProjects", () => ({
  useProjectsWithSync: () => ({ projects: [] }),
}));

// Mock supabase client
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "user-1", email: "test@example.com" } },
      }),
      signOut: vi.fn(),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          is: () => ({ count: 0 }),
        }),
        order: () => [],
      }),
    }),
  }),
}));

// Mock toast
vi.mock("@/components/ui/toast", () => ({
  useToast: () => ({
    toasts: [],
    addToast: vi.fn(),
    removeToast: vi.fn(),
  }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock QuickCaptureDialog to avoid deep dependency chain
vi.mock("@/components/tasks/quick-capture-dialog", () => ({
  QuickCaptureDialog: () => null,
}));

const mockTask: Task = {
  id: "task-1",
  workspace_id: "ws-1",
  title: "Test accessibility task",
  description: "A test task",
  status: "inbox",
  priority: "medium",
  tags: [],
  position: 0,
  created_at: "2026-01-01",
  updated_at: "2026-01-01",
  assignee_id: null,
  creator_id: "user-1",
  project_id: null,
  due_date: null,
  completed_at: null,
  source_type: "manual",
  source_id: null,
  confidence_score: null,
  needs_review: false,
};

describe("Accessibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("skip-link exists in dashboard layout", async () => {
    const { default: DashboardLayout } =
      await import("@/app/(dashboard)/layout");

    render(
      <DashboardLayout>
        <div>Content</div>
      </DashboardLayout>,
    );

    // Wait for auth to resolve and layout to render
    await screen.findByLabelText("Collapse sidebar");

    const skipLink = document.querySelector('a[href="#main-content"]');
    expect(skipLink).toBeTruthy();
    expect(skipLink?.textContent).toBe("Skip to main content");
  });

  it("sidebar toggle has aria-label", async () => {
    const { default: DashboardLayout } =
      await import("@/app/(dashboard)/layout");

    render(
      <DashboardLayout>
        <div>Content</div>
      </DashboardLayout>,
    );

    const sidebarButton = await screen.findByLabelText("Collapse sidebar");
    expect(sidebarButton).toBeInTheDocument();
  });

  it("notification bell has aria-label", async () => {
    const { default: DashboardLayout } =
      await import("@/app/(dashboard)/layout");

    render(
      <DashboardLayout>
        <div>Content</div>
      </DashboardLayout>,
    );

    const bell = await screen.findByLabelText("Notifications");
    expect(bell).toBeInTheDocument();
  });

  it("task item has aria-label with task title", () => {
    render(<TaskItem task={mockTask} />);

    const taskItem = screen.getByLabelText(
      "Open task: Test accessibility task",
    );
    expect(taskItem).toBeInTheDocument();
  });

  it("search results use listbox role", async () => {
    const { SearchCommand } =
      await import("@/components/layout/search-command");

    render(<SearchCommand open={true} />);

    const listbox = document.querySelector('[role="listbox"]');
    expect(listbox).toBeTruthy();
  });

  it("FAB has aria-label", async () => {
    const { default: DashboardLayout } =
      await import("@/app/(dashboard)/layout");

    render(
      <DashboardLayout>
        <div>Content</div>
      </DashboardLayout>,
    );

    const fab = await screen.findByLabelText("Create new task");
    expect(fab).toBeInTheDocument();
  });
});
