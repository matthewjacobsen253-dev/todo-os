/**
 * Custom hook for task management
 * Provides task fetching, creation, updating, and deletion with optimistic updates
 */

import { useEffect, useCallback } from "react";
import { useTasks, useTaskActions, useCurrentWorkspace } from "@/store";
import type { Task, CreateTaskInput, UpdateTaskInput, TaskStatus, TaskPriority } from "@/types";
import { createClient } from "@/lib/supabase/client";

/**
 * Hook for fetching and managing tasks in the current workspace
 * Automatically fetches tasks on mount and provides CRUD operations
 */
export const useTasksWithSync = () => {
  const currentWorkspace = useCurrentWorkspace();
  const { tasks, filteredTasks, filters, loading, error } = useTasks();
  const { fetchTasks, createTask, updateTask, deleteTask, setFilter, clearFilters } =
    useTaskActions();

  // Auto-fetch tasks when workspace changes
  useEffect(() => {
    if (currentWorkspace?.id) {
      fetchTasks(currentWorkspace.id);
    }
  }, [currentWorkspace?.id, fetchTasks]);

  // Create a task with optimistic update
  const createTaskOptimistic = useCallback(
    async (input: CreateTaskInput) => {
      if (!currentWorkspace?.id) {
        throw new Error("No workspace selected");
      }

      const newTask: Task = {
        id: `temp-${Date.now()}`,
        workspace_id: currentWorkspace.id,
        title: input.title,
        description: input.description || null,
        status: "inbox",
        priority: input.priority || "none",
        due_date: input.due_date || null,
        project_id: input.project_id || null,
        assignee_id: input.assignee_id || null,
        creator_id: "", // Will be set by Supabase
        source_type: "manual",
        source_id: null,
        confidence_score: null,
        needs_review: false,
        tags: input.tags || [],
        position: tasks.length + 1,
        completed_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      try {
        return await createTask(currentWorkspace.id, newTask);
      } catch (error) {
        // Remove optimistic update on error
        throw error;
      }
    },
    [currentWorkspace?.id, createTask, tasks.length]
  );

  // Update a task with optimistic update
  const updateTaskOptimistic = useCallback(
    async (taskId: string, updates: UpdateTaskInput) => {
      if (!currentWorkspace?.id) {
        throw new Error("No workspace selected");
      }

      // Get the current task
      const task = tasks.find((t) => t.id === taskId);
      if (!task) {
        throw new Error("Task not found");
      }

      try {
        await updateTask(currentWorkspace.id, taskId, updates);
      } catch (error) {
        // The store will still have the updated task from the optimistic update
        // You might want to revert it here
        throw error;
      }
    },
    [currentWorkspace?.id, updateTask, tasks]
  );

  // Delete a task
  const deleteTaskOptimistic = useCallback(
    async (taskId: string) => {
      if (!currentWorkspace?.id) {
        throw new Error("No workspace selected");
      }

      try {
        await deleteTask(currentWorkspace.id, taskId);
      } catch (error) {
        throw error;
      }
    },
    [currentWorkspace?.id, deleteTask]
  );

  // Change task status
  const changeTaskStatus = useCallback(
    async (taskId: string, status: TaskStatus) => {
      return updateTaskOptimistic(taskId, { status });
    },
    [updateTaskOptimistic]
  );

  // Change task priority
  const changeTaskPriority = useCallback(
    async (taskId: string, priority: TaskPriority) => {
      return updateTaskOptimistic(taskId, { priority });
    },
    [updateTaskOptimistic]
  );

  return {
    tasks,
    filteredTasks,
    filters,
    loading,
    error,
    createTask: createTaskOptimistic,
    updateTask: updateTaskOptimistic,
    deleteTask: deleteTaskOptimistic,
    changeTaskStatus,
    changeTaskPriority,
    setFilter,
    clearFilters,
  };
};

/**
 * Hook for getting a single task by ID
 * @param taskId - The ID of the task to retrieve
 * @returns The task object or undefined if not found
 */
export const useTask = (taskId: string | null) => {
  const { tasks } = useTasks();
  return tasks.find((t) => t.id === taskId);
};

/**
 * Hook for searching and filtering tasks
 * Provides advanced task filtering and search capabilities
 */
export const useTaskSearch = () => {
  const { tasks } = useTasks();
  const { setFilter } = useTaskActions();

  const searchTasks = useCallback(
    (searchTerm: string) => {
      setFilter({ search: searchTerm });
    },
    [setFilter]
  );

  const filterByStatus = useCallback(
    (statuses: TaskStatus[]) => {
      setFilter({ status: statuses });
    },
    [setFilter]
  );

  const filterByPriority = useCallback(
    (priorities: TaskPriority[]) => {
      setFilter({ priority: priorities });
    },
    [setFilter]
  );

  const filterByProject = useCallback(
    (projectId: string | null) => {
      setFilter({ project: projectId });
    },
    [setFilter]
  );

  const filterByAssignee = useCallback(
    (assigneeId: string | null) => {
      if (assigneeId) {
        setFilter({ assignee: assigneeId });
      } else {
        setFilter({ assignee: undefined });
      }
    },
    [setFilter]
  );

  const filterByTags = useCallback(
    (tags: string[]) => {
      setFilter({ tags });
    },
    [setFilter]
  );

  return {
    tasks,
    searchTasks,
    filterByStatus,
    filterByPriority,
    filterByProject,
    filterByAssignee,
    filterByTags,
  };
};

/**
 * Hook for syncing with Supabase real-time changes
 * Listens for changes to tasks and updates the store
 */
export const useTasksRealtime = () => {
  const currentWorkspace = useCurrentWorkspace();
  const { fetchTasks } = useTaskActions();

  useEffect(() => {
    if (!currentWorkspace?.id) return;

    const supabase = createClient();

    // Subscribe to changes
    const channel = supabase
      .channel(`tasks:${currentWorkspace.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
          filter: `workspace_id=eq.${currentWorkspace.id}`,
        },
        () => {
          // Refetch tasks when there's a change
          fetchTasks(currentWorkspace.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentWorkspace?.id, fetchTasks]);
};

/**
 * Hook for batch task operations
 * Allows updating multiple tasks at once
 */
export const useBatchTaskOperations = () => {
  const currentWorkspace = useCurrentWorkspace();
  const { updateTask, fetchTasks } = useTaskActions();
  const supabase = createClient();

  const batchUpdateStatus = useCallback(
    async (taskIds: string[], status: TaskStatus) => {
      if (!currentWorkspace?.id) {
        throw new Error("No workspace selected");
      }

      const updates = taskIds.map((id) =>
        updateTask(currentWorkspace.id, id, { status })
      );

      return Promise.all(updates);
    },
    [currentWorkspace?.id, updateTask]
  );

  const batchUpdatePriority = useCallback(
    async (taskIds: string[], priority: TaskPriority) => {
      if (!currentWorkspace?.id) {
        throw new Error("No workspace selected");
      }

      const updates = taskIds.map((id) =>
        updateTask(currentWorkspace.id, id, { priority })
      );

      return Promise.all(updates);
    },
    [currentWorkspace?.id, updateTask]
  );

  const batchDelete = useCallback(
    async (taskIds: string[]) => {
      if (!currentWorkspace?.id) {
        throw new Error("No workspace selected");
      }

      const { error } = await supabase
        .from("tasks")
        .delete()
        .in("id", taskIds)
        .eq("workspace_id", currentWorkspace.id);

      if (error) throw error;

      // Refetch tasks
      await fetchTasks(currentWorkspace.id);
    },
    [currentWorkspace?.id, supabase, fetchTasks]
  );

  return {
    batchUpdateStatus,
    batchUpdatePriority,
    batchDelete,
  };
};

export default useTasksWithSync;
