import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type {
  Task,
  TaskFilters,
  Workspace,
  WorkspaceWithRole,
  WorkspaceRole,
  Briefing,
  Notification,
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
  updateTask: (workspaceId: string, taskId: string, updates: Partial<Task>) => Promise<void>;
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

  fetchBriefing: (workspaceId: string, userId: string) => Promise<void>;
  setBriefing: (briefing: Briefing | null) => void;
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

interface AppState extends WorkspaceState, TaskState, UIState, BriefingState, NotificationState {}

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

        const workspacesWithRole = (workspaceData || []).map((item: unknown) => {
          const typedItem = item as { workspace: Workspace; role: WorkspaceRole };
          return {
            ...typedItem.workspace,
            role: typedItem.role,
            member_count: 1,
          };
        });

        set((state) => {
          state.workspaces = workspacesWithRole;
          state.workspaceLoading = false;
        });
      } catch (error) {
        set((state) => {
          state.workspaceError = error instanceof Error ? error.message : "Failed to fetch workspaces";
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
        state.filteredTasks = filterTasks(state.tasks as Task[], combinedFilters);
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
          state.tasksError = error instanceof Error ? error.message : "Failed to fetch tasks";
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
        state.filteredTasks = filterTasks([...(state.tasks as Task[]), data], state.filters);
      });

      return data;
    },

    updateTask: async (workspaceId: string, taskId: string, updates: Partial<Task>) => {
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
          state.filteredTasks = filterTasks(state.tasks as Task[], state.filters);
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
        state.filteredTasks = state.filteredTasks.filter((t: Task) => t.id !== taskId);
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
      set((state) => { state.sidebarOpen = !state.sidebarOpen; });
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
      set((state) => { state.quickCaptureOpen = !state.quickCaptureOpen; });
    },

    setTheme: (theme: "light" | "dark" | "system") => {
      set((state) => { state.theme = theme; });
      if (typeof window !== "undefined") {
        localStorage.setItem("theme", theme);
      }
    },

    toggleCommandPalette: () => {
      set((state) => { state.commandPaletteOpen = !state.commandPaletteOpen; });
    },

    // BRIEFING SLICE
    todayBriefing: null,
    briefingLoading: false,
    briefingError: null,

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
          state.briefingError = error instanceof Error ? error.message : "Failed to fetch briefing";
          state.briefingLoading = false;
        });
      }
    },

    setBriefing: (briefing: Briefing | null) => {
      set((state) => { state.todayBriefing = briefing; });
    },

    // NOTIFICATION SLICE
    notifications: [],
    unreadCount: 0,
    notificationsLoading: false,

    fetchNotifications: async (workspaceId: string, userId: string) => {
      set((state) => { state.notificationsLoading = true; });

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
        const unreadCount = typedData.filter((n: Notification) => !n.read).length;

        set((state) => {
          state.notifications = typedData;
          state.unreadCount = unreadCount;
          state.notificationsLoading = false;
        });
      } catch {
        set((state) => { state.notificationsLoading = false; });
      }
    },

    markRead: async (notificationId: string) => {
      const supabase = createClient();
      await supabase.from("notifications").update({ read: true }).eq("id", notificationId);

      set((state) => {
        const notification = state.notifications.find((n: Notification) => n.id === notificationId);
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
        state.notifications.forEach((n: Notification) => { n.read = true; });
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
  }))
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
      const hasTags = filters.tags.some((tag: string) => task.tags.includes(tag));
      if (!hasTags) return false;
    }
    return true;
  });
}

// ============================================================================
// HOOKS FOR EASIER USE
// ============================================================================

export const useCurrentWorkspace = () => useStore((state) => state.currentWorkspace);

export const useWorkspaceActions = () =>
  useStore((state) => ({
    setCurrentWorkspace: state.setCurrentWorkspace,
    fetchWorkspaces: state.fetchWorkspaces,
    createWorkspace: state.createWorkspace,
  }));

export const useTasks = () =>
  useStore((state) => ({
    tasks: state.tasks,
    filteredTasks: state.filteredTasks,
    filters: state.filters,
    loading: state.tasksLoading,
    error: state.tasksError,
  }));

export const useTaskActions = () =>
  useStore((state) => ({
    setFilter: state.setFilter,
    clearFilters: state.clearFilters,
    fetchTasks: state.fetchTasks,
    createTask: state.createTask,
    updateTask: state.updateTask,
    deleteTask: state.deleteTask,
  }));

export const useUI = () =>
  useStore((state) => ({
    sidebarOpen: state.sidebarOpen,
    taskDetailOpen: state.taskDetailOpen,
    selectedTaskId: state.selectedTaskId,
    quickCaptureOpen: state.quickCaptureOpen,
    theme: state.theme,
    commandPaletteOpen: state.commandPaletteOpen,
  }));

export const useUIActions = () =>
  useStore((state) => ({
    toggleSidebar: state.toggleSidebar,
    openTaskDetail: state.openTaskDetail,
    closeTaskDetail: state.closeTaskDetail,
    toggleQuickCapture: state.toggleQuickCapture,
    setTheme: state.setTheme,
    toggleCommandPalette: state.toggleCommandPalette,
  }));

export const useBriefing = () =>
  useStore((state) => ({
    todayBriefing: state.todayBriefing,
    loading: state.briefingLoading,
    error: state.briefingError,
  }));

export const useBriefingActions = () =>
  useStore((state) => ({
    fetchBriefing: state.fetchBriefing,
    setBriefing: state.setBriefing,
  }));

export const useNotifications = () =>
  useStore((state) => ({
    notifications: state.notifications,
    unreadCount: state.unreadCount,
    loading: state.notificationsLoading,
  }));

export const useNotificationActions = () =>
  useStore((state) => ({
    fetchNotifications: state.fetchNotifications,
    markRead: state.markRead,
    markAllRead: state.markAllRead,
    addNotification: state.addNotification,
  }));
