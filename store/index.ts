import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import { immer } from "zustand/middleware/immer";
import type {
  Task,
  TaskFilters,
  Workspace,
  WorkspaceWithRole,
  WorkspaceRole,
  Briefing,
  BriefingPreference,
  Notification,
  Project,
  CreateProjectInput,
  UpdateProjectInput,
  ReviewQueueItem,
} from "@/types";
import { createClient } from "@/lib/supabase/client";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface WorkspaceState {
  currentWorkspace: WorkspaceWithRole | null;
  workspaces: WorkspaceWithRole[];
  workspaceLoading: boolean;
  workspaceError: string | null;

  setCurrentWorkspace: (workspace: WorkspaceWithRole) => void;
  fetchWorkspaces: () => Promise<void>;
  createWorkspace: (name: string, slug: string) => Promise<WorkspaceWithRole>;
}

interface TaskState {
  tasks: Task[];
  filteredTasks: Task[];
  filters: TaskFilters;
  tasksLoading: boolean;
  tasksError: string | null;

  setFilter: (filters: Partial<TaskFilters>) => void;
  clearFilters: () => void;
  fetchTasks: (workspaceId: string) => Promise<void>;
  createTask: (workspaceId: string, task: Task) => Promise<Task>;
  updateTask: (
    workspaceId: string,
    taskId: string,
    updates: Partial<Task>,
  ) => Promise<void>;
  deleteTask: (workspaceId: string, taskId: string) => Promise<void>;
}

interface UIState {
  sidebarOpen: boolean;
  taskDetailOpen: boolean;
  selectedTaskId: string | null;
  quickCaptureOpen: boolean;
  theme: "light" | "dark" | "system";
  commandPaletteOpen: boolean;

  toggleSidebar: () => void;
  openTaskDetail: (taskId: string) => void;
  closeTaskDetail: () => void;
  toggleQuickCapture: () => void;
  setTheme: (theme: "light" | "dark" | "system") => void;
  toggleCommandPalette: () => void;
}

interface BriefingState {
  todayBriefing: Briefing | null;
  briefingLoading: boolean;
  briefingError: string | null;
  briefingGenerating: boolean;
  briefingHistory: Briefing[];
  briefingHistoryLoading: boolean;
  briefingHistoryError: string | null;
  briefingPreferences: BriefingPreference | null;
  briefingPreferencesLoading: boolean;
  briefingPreferencesError: string | null;

  fetchBriefing: (workspaceId: string, userId: string) => Promise<void>;
  setBriefing: (briefing: Briefing | null) => void;
  generateBriefing: (workspaceId: string) => Promise<Briefing>;
  submitFeedback: (
    briefingId: string,
    workspaceId: string,
    feedback: "thumbs_up" | "thumbs_down",
    notes?: string,
  ) => Promise<void>;
  fetchBriefingHistory: (workspaceId: string) => Promise<void>;
  fetchBriefingPreferences: (workspaceId: string) => Promise<void>;
  updateBriefingPreferences: (
    workspaceId: string,
    updates: Partial<BriefingPreference>,
  ) => Promise<void>;
}

interface ProjectState {
  projects: Project[];
  projectsLoading: boolean;
  projectsError: string | null;

  fetchProjects: (workspaceId: string) => Promise<void>;
  createProject: (
    workspaceId: string,
    input: CreateProjectInput,
  ) => Promise<Project>;
  updateProject: (
    workspaceId: string,
    projectId: string,
    updates: UpdateProjectInput,
  ) => Promise<void>;
  deleteProject: (workspaceId: string, projectId: string) => Promise<void>;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  notificationsLoading: boolean;

  fetchNotifications: (workspaceId: string, userId: string) => Promise<void>;
  markRead: (notificationId: string) => Promise<void>;
  markAllRead: (workspaceId: string, userId: string) => Promise<void>;
  addNotification: (notification: Notification) => void;
}

interface ReviewState {
  reviewQueue: ReviewQueueItem[];
  reviewLoading: boolean;
  reviewError: string | null;
  reviewCount: number;

  fetchReviewQueue: (workspaceId: string) => Promise<void>;
  approveTask: (
    workspaceId: string,
    taskId: string,
    edits?: Record<string, unknown>,
  ) => Promise<void>;
  rejectTask: (workspaceId: string, taskId: string) => Promise<void>;
}

interface AppState
  extends
    WorkspaceState,
    TaskState,
    ProjectState,
    UIState,
    BriefingState,
    NotificationState,
    ReviewState {}

// ============================================================================
// STORE CREATION
// ============================================================================

export const useStore = create<AppState>()(
  immer((set, get) => ({
    // WORKSPACE SLICE
    currentWorkspace: null,
    workspaces: [],
    workspaceLoading: false,
    workspaceError: null,

    setCurrentWorkspace: (workspace: WorkspaceWithRole) => {
      set((state) => {
        state.currentWorkspace = workspace;
      });
    },

    fetchWorkspaces: async () => {
      set((state) => {
        state.workspaceLoading = true;
        state.workspaceError = null;
      });

      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getSession();

        if (!data?.session?.user?.id) {
          throw new Error("Not authenticated");
        }

        const { data: workspaceData, error } = await supabase
          .from("workspace_members")
          .select("workspace:workspaces(*), role")
          .eq("user_id", data.session.user.id);

        if (error) throw error;

        const workspacesWithRole = (workspaceData || []).map(
          (item: unknown) => {
            const typedItem = item as {
              workspace: Workspace;
              role: WorkspaceRole;
            };
            return {
              ...typedItem.workspace,
              role: typedItem.role,
              member_count: 1,
            };
          },
        );

        set((state) => {
          state.workspaces = workspacesWithRole;
          state.workspaceLoading = false;
          // Auto-select first workspace if none is selected
          if (!state.currentWorkspace && workspacesWithRole.length > 0) {
            state.currentWorkspace = workspacesWithRole[0];
          }
        });
      } catch (error) {
        set((state) => {
          state.workspaceError =
            error instanceof Error
              ? error.message
              : "Failed to fetch workspaces";
          state.workspaceLoading = false;
        });
      }
    },

    createWorkspace: async (name: string, slug: string) => {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();

      if (!data?.session?.user?.id) {
        throw new Error("Not authenticated");
      }

      const { data: workspaceData, error } = await supabase
        .from("workspaces")
        .insert([{ name, slug, owner_id: data.session.user.id, settings: {} }])
        .select()
        .single();

      if (error) throw error;

      const typedData = workspaceData as Workspace;
      const newWorkspace: WorkspaceWithRole = {
        ...typedData,
        role: "owner",
        member_count: 1,
      };

      set((state) => {
        state.workspaces.push(newWorkspace);
      });

      return newWorkspace;
    },

    // TASK SLICE
    tasks: [],
    filteredTasks: [],
    filters: {},
    tasksLoading: false,
    tasksError: null,

    setFilter: (newFilters: Partial<TaskFilters>) => {
      set((state) => {
        const combinedFilters = { ...state.filters, ...newFilters };
        state.filters = combinedFilters;
        state.filteredTasks = filterTasks(
          state.tasks as Task[],
          combinedFilters,
        );
      });
    },

    clearFilters: () => {
      set((state) => {
        state.filters = {};
        state.filteredTasks = state.tasks;
      });
    },

    fetchTasks: async (workspaceId: string) => {
      set((state) => {
        state.tasksLoading = true;
        state.tasksError = null;
      });

      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("tasks")
          .select("*")
          .eq("workspace_id", workspaceId)
          .order("position", { ascending: true });

        if (error) throw error;

        const currentFilters = get().filters;
        const typedData = (data || []) as Task[];
        set((state) => {
          state.tasks = typedData;
          state.filteredTasks = filterTasks(typedData, currentFilters);
          state.tasksLoading = false;
        });
      } catch (error) {
        set((state) => {
          state.tasksError =
            error instanceof Error ? error.message : "Failed to fetch tasks";
          state.tasksLoading = false;
        });
      }
    },

    createTask: async (workspaceId: string, task: Task) => {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("tasks")
        .insert([{ ...task, workspace_id: workspaceId }])
        .select()
        .single();

      if (error) throw error;

      set((state) => {
        state.tasks.push(data);
        state.filteredTasks = filterTasks(
          [...(state.tasks as Task[]), data],
          state.filters,
        );
      });

      return data;
    },

    updateTask: async (
      workspaceId: string,
      taskId: string,
      updates: Partial<Task>,
    ) => {
      const supabase = createClient();

      const { error } = await supabase
        .from("tasks")
        .update(updates)
        .eq("id", taskId)
        .eq("workspace_id", workspaceId);

      if (error) throw error;

      set((state) => {
        const index = state.tasks.findIndex((t: Task) => t.id === taskId);
        if (index >= 0) {
          state.tasks[index] = { ...state.tasks[index], ...updates };
          state.filteredTasks = filterTasks(
            state.tasks as Task[],
            state.filters,
          );
        }
      });
    },

    deleteTask: async (workspaceId: string, taskId: string) => {
      const supabase = createClient();

      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", taskId)
        .eq("workspace_id", workspaceId);

      if (error) throw error;

      set((state) => {
        state.tasks = state.tasks.filter((t: Task) => t.id !== taskId);
        state.filteredTasks = state.filteredTasks.filter(
          (t: Task) => t.id !== taskId,
        );
      });
    },

    // PROJECT SLICE
    projects: [],
    projectsLoading: false,
    projectsError: null,

    fetchProjects: async (workspaceId: string) => {
      set((state) => {
        state.projectsLoading = true;
        state.projectsError = null;
      });

      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("projects")
          .select("*")
          .eq("workspace_id", workspaceId)
          .order("created_at", { ascending: false });

        if (error) throw error;

        set((state) => {
          state.projects = (data || []) as Project[];
          state.projectsLoading = false;
        });
      } catch (error) {
        set((state) => {
          state.projectsError =
            error instanceof Error ? error.message : "Failed to fetch projects";
          state.projectsLoading = false;
        });
      }
    },

    createProject: async (workspaceId: string, input: CreateProjectInput) => {
      const supabase = createClient();
      const { data: authData } = await supabase.auth.getSession();

      if (!authData?.session?.user?.id) {
        throw new Error("Not authenticated");
      }

      const { data, error } = await supabase
        .from("projects")
        .insert([
          {
            workspace_id: workspaceId,
            name: input.name,
            color: input.color || "#6366f1",
            icon: input.icon || "folder",
            description: input.description || null,
            status: "active",
          },
        ])
        .select()
        .single();

      if (error) throw error;

      const project = data as Project;
      set((state) => {
        state.projects.unshift(project);
      });

      return project;
    },

    updateProject: async (
      workspaceId: string,
      projectId: string,
      updates: UpdateProjectInput,
    ) => {
      const supabase = createClient();

      const { error } = await supabase
        .from("projects")
        .update(updates)
        .eq("id", projectId)
        .eq("workspace_id", workspaceId);

      if (error) throw error;

      set((state) => {
        const index = state.projects.findIndex(
          (p: Project) => p.id === projectId,
        );
        if (index >= 0) {
          state.projects[index] = { ...state.projects[index], ...updates };
        }
      });
    },

    deleteProject: async (workspaceId: string, projectId: string) => {
      const supabase = createClient();

      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", projectId)
        .eq("workspace_id", workspaceId);

      if (error) throw error;

      set((state) => {
        state.projects = state.projects.filter(
          (p: Project) => p.id !== projectId,
        );
      });
    },

    // UI SLICE
    sidebarOpen: true,
    taskDetailOpen: false,
    selectedTaskId: null,
    quickCaptureOpen: false,
    theme: "system",
    commandPaletteOpen: false,

    toggleSidebar: () => {
      set((state) => {
        state.sidebarOpen = !state.sidebarOpen;
      });
    },

    openTaskDetail: (taskId: string) => {
      set((state) => {
        state.selectedTaskId = taskId;
        state.taskDetailOpen = true;
      });
    },

    closeTaskDetail: () => {
      set((state) => {
        state.taskDetailOpen = false;
        state.selectedTaskId = null;
      });
    },

    toggleQuickCapture: () => {
      set((state) => {
        state.quickCaptureOpen = !state.quickCaptureOpen;
      });
    },

    setTheme: (theme: "light" | "dark" | "system") => {
      set((state) => {
        state.theme = theme;
      });
      if (typeof window !== "undefined") {
        localStorage.setItem("theme", theme);
      }
    },

    toggleCommandPalette: () => {
      set((state) => {
        state.commandPaletteOpen = !state.commandPaletteOpen;
      });
    },

    // BRIEFING SLICE
    todayBriefing: null,
    briefingLoading: false,
    briefingError: null,
    briefingGenerating: false,
    briefingHistory: [],
    briefingHistoryLoading: false,
    briefingHistoryError: null,
    briefingPreferences: null,
    briefingPreferencesLoading: false,
    briefingPreferencesError: null,

    fetchBriefing: async (workspaceId: string, userId: string) => {
      set((state) => {
        state.briefingLoading = true;
        state.briefingError = null;
      });

      try {
        const supabase = createClient();
        const today = new Date().toISOString().split("T")[0];

        const { data, error } = await supabase
          .from("briefings")
          .select("*")
          .eq("workspace_id", workspaceId)
          .eq("user_id", userId)
          .eq("date", today)
          .single();

        if (error && error.code !== "PGRST116") {
          throw error;
        }

        set((state) => {
          state.todayBriefing = data || null;
          state.briefingLoading = false;
        });
      } catch (error) {
        set((state) => {
          state.briefingError =
            error instanceof Error ? error.message : "Failed to fetch briefing";
          state.briefingLoading = false;
        });
      }
    },

    setBriefing: (briefing: Briefing | null) => {
      set((state) => {
        state.todayBriefing = briefing;
      });
    },

    generateBriefing: async (workspaceId: string) => {
      set((state) => {
        state.briefingGenerating = true;
        state.briefingError = null;
      });

      try {
        const response = await fetch("/api/briefing/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workspace_id: workspaceId }),
        });

        const json = await response.json();
        if (!response.ok) throw new Error(json.error);

        set((state) => {
          state.todayBriefing = json.data;
          state.briefingGenerating = false;
        });

        return json.data;
      } catch (error) {
        set((state) => {
          state.briefingError =
            error instanceof Error
              ? error.message
              : "Failed to generate briefing";
          state.briefingGenerating = false;
        });
        throw error;
      }
    },

    submitFeedback: async (
      briefingId: string,
      workspaceId: string,
      feedback: "thumbs_up" | "thumbs_down",
      notes?: string,
    ) => {
      const response = await fetch(`/api/briefing/${briefingId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_id: workspaceId,
          feedback,
          feedback_notes: notes,
        }),
      });

      const json = await response.json();
      if (!response.ok) throw new Error(json.error);

      set((state) => {
        if (state.todayBriefing?.id === briefingId) {
          state.todayBriefing.feedback = feedback;
          state.todayBriefing.feedback_notes = notes || null;
        }
      });
    },

    fetchBriefingHistory: async (workspaceId: string) => {
      set((state) => {
        state.briefingHistoryLoading = true;
        state.briefingHistoryError = null;
      });

      try {
        const response = await fetch(
          `/api/briefing/history?workspace_id=${workspaceId}`,
        );
        const json = await response.json();

        if (!response.ok) throw new Error(json.error);

        set((state) => {
          state.briefingHistory = json.data || [];
          state.briefingHistoryLoading = false;
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to fetch briefing history";
        set((state) => {
          state.briefingHistoryLoading = false;
          state.briefingHistoryError = message;
        });
      }
    },

    fetchBriefingPreferences: async (workspaceId: string) => {
      set((state) => {
        state.briefingPreferencesLoading = true;
        state.briefingPreferencesError = null;
      });

      try {
        const response = await fetch(
          `/api/briefing/preferences?workspace_id=${workspaceId}`,
        );
        const json = await response.json();

        if (!response.ok) throw new Error(json.error);

        set((state) => {
          state.briefingPreferences = json.data || null;
          state.briefingPreferencesLoading = false;
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to fetch briefing preferences";
        set((state) => {
          state.briefingPreferencesLoading = false;
          state.briefingPreferencesError = message;
        });
      }
    },

    updateBriefingPreferences: async (
      workspaceId: string,
      updates: Partial<BriefingPreference>,
    ) => {
      const response = await fetch("/api/briefing/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspace_id: workspaceId, ...updates }),
      });

      const json = await response.json();
      if (!response.ok) throw new Error(json.error);

      set((state) => {
        state.briefingPreferences = json.data;
      });
    },

    // NOTIFICATION SLICE
    notifications: [],
    unreadCount: 0,
    notificationsLoading: false,

    fetchNotifications: async (workspaceId: string, userId: string) => {
      set((state) => {
        state.notificationsLoading = true;
      });

      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("notifications")
          .select("*")
          .eq("workspace_id", workspaceId)
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        if (error) throw error;

        const typedData = (data || []) as Notification[];
        const unreadCount = typedData.filter(
          (n: Notification) => !n.read,
        ).length;

        set((state) => {
          state.notifications = typedData;
          state.unreadCount = unreadCount;
          state.notificationsLoading = false;
        });
      } catch {
        set((state) => {
          state.notificationsLoading = false;
        });
      }
    },

    markRead: async (notificationId: string) => {
      const supabase = createClient();
      await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", notificationId);

      set((state) => {
        const notification = state.notifications.find(
          (n: Notification) => n.id === notificationId,
        );
        if (notification && !notification.read) {
          notification.read = true;
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      });
    },

    markAllRead: async (workspaceId: string, userId: string) => {
      const supabase = createClient();
      await supabase
        .from("notifications")
        .update({ read: true })
        .eq("workspace_id", workspaceId)
        .eq("user_id", userId)
        .eq("read", false);

      set((state) => {
        state.notifications.forEach((n: Notification) => {
          n.read = true;
        });
        state.unreadCount = 0;
      });
    },

    addNotification: (notification: Notification) => {
      set((state) => {
        state.notifications.unshift(notification);
        if (!notification.read) {
          state.unreadCount += 1;
        }
      });
    },

    // REVIEW SLICE
    reviewQueue: [],
    reviewLoading: false,
    reviewError: null,
    reviewCount: 0,

    fetchReviewQueue: async (workspaceId: string) => {
      set((state) => {
        state.reviewLoading = true;
        state.reviewError = null;
      });

      try {
        const response = await fetch(
          `/api/review/queue?workspace_id=${workspaceId}`,
        );
        const json = await response.json();

        if (!response.ok) throw new Error(json.error);

        set((state) => {
          state.reviewQueue = json.data || [];
          state.reviewCount = json.count || 0;
          state.reviewLoading = false;
        });
      } catch (error) {
        set((state) => {
          state.reviewError =
            error instanceof Error
              ? error.message
              : "Failed to fetch review queue";
          state.reviewLoading = false;
        });
      }
    },

    approveTask: async (
      workspaceId: string,
      taskId: string,
      edits?: Record<string, unknown>,
    ) => {
      const response = await fetch(`/api/review/${taskId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspace_id: workspaceId, ...edits }),
      });

      const json = await response.json();
      if (!response.ok) throw new Error(json.error);

      set((state) => {
        state.reviewQueue = state.reviewQueue.filter(
          (item: ReviewQueueItem) => item.id !== taskId,
        );
        state.reviewCount = Math.max(0, state.reviewCount - 1);
      });
    },

    rejectTask: async (workspaceId: string, taskId: string) => {
      const response = await fetch(`/api/review/${taskId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspace_id: workspaceId }),
      });

      const json = await response.json();
      if (!response.ok) throw new Error(json.error);

      set((state) => {
        state.reviewQueue = state.reviewQueue.filter(
          (item: ReviewQueueItem) => item.id !== taskId,
        );
        state.reviewCount = Math.max(0, state.reviewCount - 1);
      });
    },
  })),
);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function filterTasks(tasks: Task[], filters: TaskFilters): Task[] {
  return tasks.filter((task: Task) => {
    if (filters.status && filters.status.length > 0) {
      if (!filters.status.includes(task.status)) return false;
    }
    if (filters.priority && filters.priority.length > 0) {
      if (!filters.priority.includes(task.priority)) return false;
    }
    if (filters.project !== null && filters.project !== undefined) {
      if (task.project_id !== filters.project) return false;
    }
    if (filters.assignee) {
      if (task.assignee_id !== filters.assignee) return false;
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      if (!task.title.toLowerCase().includes(searchLower)) return false;
    }
    if (filters.tags && filters.tags.length > 0) {
      const hasTags = filters.tags.some((tag: string) =>
        task.tags.includes(tag),
      );
      if (!hasTags) return false;
    }
    return true;
  });
}

// ============================================================================
// HOOKS FOR EASIER USE
// ============================================================================

export const useCurrentWorkspace = () =>
  useStore((state) => state.currentWorkspace);

export const useWorkspaceActions = () =>
  useStore(
    useShallow((state) => ({
      setCurrentWorkspace: state.setCurrentWorkspace,
      fetchWorkspaces: state.fetchWorkspaces,
      createWorkspace: state.createWorkspace,
    })),
  );

export const useTasks = () =>
  useStore(
    useShallow((state) => ({
      tasks: state.tasks,
      filteredTasks: state.filteredTasks,
      filters: state.filters,
      loading: state.tasksLoading,
      error: state.tasksError,
    })),
  );

export const useTaskActions = () =>
  useStore(
    useShallow((state) => ({
      setFilter: state.setFilter,
      clearFilters: state.clearFilters,
      fetchTasks: state.fetchTasks,
      createTask: state.createTask,
      updateTask: state.updateTask,
      deleteTask: state.deleteTask,
    })),
  );

export const useUI = () =>
  useStore(
    useShallow((state) => ({
      sidebarOpen: state.sidebarOpen,
      taskDetailOpen: state.taskDetailOpen,
      selectedTaskId: state.selectedTaskId,
      quickCaptureOpen: state.quickCaptureOpen,
      theme: state.theme,
      commandPaletteOpen: state.commandPaletteOpen,
    })),
  );

export const useUIActions = () =>
  useStore(
    useShallow((state) => ({
      toggleSidebar: state.toggleSidebar,
      openTaskDetail: state.openTaskDetail,
      closeTaskDetail: state.closeTaskDetail,
      toggleQuickCapture: state.toggleQuickCapture,
      setTheme: state.setTheme,
      toggleCommandPalette: state.toggleCommandPalette,
    })),
  );

export const useBriefing = () =>
  useStore(
    useShallow((state) => ({
      todayBriefing: state.todayBriefing,
      loading: state.briefingLoading,
      error: state.briefingError,
      generating: state.briefingGenerating,
    })),
  );

export const useBriefingActions = () =>
  useStore(
    useShallow((state) => ({
      fetchBriefing: state.fetchBriefing,
      setBriefing: state.setBriefing,
      generateBriefing: state.generateBriefing,
      submitFeedback: state.submitFeedback,
    })),
  );

export const useBriefingHistory = () =>
  useStore(
    useShallow((state) => ({
      history: state.briefingHistory,
      loading: state.briefingHistoryLoading,
      fetchHistory: state.fetchBriefingHistory,
    })),
  );

export const useBriefingPreferences = () =>
  useStore(
    useShallow((state) => ({
      preferences: state.briefingPreferences,
      loading: state.briefingPreferencesLoading,
      fetchPreferences: state.fetchBriefingPreferences,
      updatePreferences: state.updateBriefingPreferences,
    })),
  );

export const useNotifications = () =>
  useStore(
    useShallow((state) => ({
      notifications: state.notifications,
      unreadCount: state.unreadCount,
      loading: state.notificationsLoading,
    })),
  );

export const useProjects = () =>
  useStore(
    useShallow((state) => ({
      projects: state.projects,
      loading: state.projectsLoading,
      error: state.projectsError,
    })),
  );

export const useProjectActions = () =>
  useStore(
    useShallow((state) => ({
      fetchProjects: state.fetchProjects,
      createProject: state.createProject,
      updateProject: state.updateProject,
      deleteProject: state.deleteProject,
    })),
  );

export const useNotificationActions = () =>
  useStore(
    useShallow((state) => ({
      fetchNotifications: state.fetchNotifications,
      markRead: state.markRead,
      markAllRead: state.markAllRead,
      addNotification: state.addNotification,
    })),
  );

export const useReviewQueue = () =>
  useStore(
    useShallow((state) => ({
      reviewQueue: state.reviewQueue,
      loading: state.reviewLoading,
      error: state.reviewError,
      count: state.reviewCount,
    })),
  );

export const useReviewActions = () =>
  useStore(
    useShallow((state) => ({
      fetchReviewQueue: state.fetchReviewQueue,
      approveTask: state.approveTask,
      rejectTask: state.rejectTask,
    })),
  );

export const useBriefingHistoryError = () =>
  useStore((state) => state.briefingHistoryError);

export const useBriefingPreferencesError = () =>
  useStore((state) => state.briefingPreferencesError);
