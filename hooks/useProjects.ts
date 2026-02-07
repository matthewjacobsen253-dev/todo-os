/**
 * Custom hooks for project management
 * Provides project fetching, creation, updating, and deletion
 */

import { useEffect, useCallback } from "react";
import { useProjects, useProjectActions, useCurrentWorkspace } from "@/store";
import type { CreateProjectInput, UpdateProjectInput } from "@/types";

/**
 * Hook for fetching and managing projects in the current workspace
 * Automatically fetches projects on mount and provides CRUD operations
 */
export const useProjectsWithSync = () => {
  const currentWorkspace = useCurrentWorkspace();
  const { projects, loading, error } = useProjects();
  const { fetchProjects, createProject, updateProject, deleteProject } =
    useProjectActions();

  // Auto-fetch projects when workspace changes
  useEffect(() => {
    if (currentWorkspace?.id) {
      fetchProjects(currentWorkspace.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWorkspace?.id]);

  const createProjectOptimistic = useCallback(
    async (input: CreateProjectInput) => {
      if (!currentWorkspace?.id) {
        throw new Error("No workspace selected");
      }
      return createProject(currentWorkspace.id, input);
    },
    [currentWorkspace?.id, createProject],
  );

  const updateProjectOptimistic = useCallback(
    async (projectId: string, updates: UpdateProjectInput) => {
      if (!currentWorkspace?.id) {
        throw new Error("No workspace selected");
      }
      await updateProject(currentWorkspace.id, projectId, updates);
    },
    [currentWorkspace?.id, updateProject],
  );

  const deleteProjectOptimistic = useCallback(
    async (projectId: string) => {
      if (!currentWorkspace?.id) {
        throw new Error("No workspace selected");
      }
      await deleteProject(currentWorkspace.id, projectId);
    },
    [currentWorkspace?.id, deleteProject],
  );

  return {
    projects,
    loading,
    error,
    createProject: createProjectOptimistic,
    updateProject: updateProjectOptimistic,
    deleteProject: deleteProjectOptimistic,
  };
};

/**
 * Hook for getting a single project by ID
 */
export const useProject = (projectId: string | null) => {
  const { projects } = useProjects();
  return projects.find((p) => p.id === projectId);
};

export default useProjectsWithSync;
