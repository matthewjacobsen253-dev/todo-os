/**
 * Custom hook for workspace management
 * Handles workspace switching, creation, and member management
 */

import { useEffect, useCallback } from "react";
import { useCurrentWorkspace, useWorkspaceActions, useStore } from "@/store";
import type { CreateWorkspaceInput } from "@/types";
import { createClient } from "@/lib/supabase/client";

/**
 * Hook for accessing and managing the current workspace
 * Automatically fetches workspaces on mount
 */
export const useWorkspace = () => {
  const currentWorkspace = useCurrentWorkspace();
  const {
    setCurrentWorkspace,
    fetchWorkspaces,
    createWorkspace: _createWorkspace,
  } = useWorkspaceActions();
  const workspaceLoading = useStore((state) => state.workspaceLoading);
  const workspaceError = useStore((state) => state.workspaceError);
  const workspaces = useStore((state) => state.workspaces);

  // Auto-fetch workspaces on mount
  useEffect(() => {
    fetchWorkspaces();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Set first workspace as current if none is selected
  useEffect(() => {
    if (!currentWorkspace && workspaces.length > 0 && !workspaceLoading) {
      setCurrentWorkspace(workspaces[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWorkspace, workspaces, workspaceLoading]);

  return {
    currentWorkspace,
    workspaces,
    loading: workspaceLoading,
    error: workspaceError,
  };
};

/**
 * Hook for workspace actions (switching, creating, etc.)
 */
export const useWorkspaceActions_ = () => {
  const supabase = createClient();
  const { setCurrentWorkspace, fetchWorkspaces, createWorkspace } =
    useWorkspaceActions();
  const { currentWorkspace } = useWorkspace();

  /**
   * Switch to a different workspace
   */
  const switchWorkspace = useCallback(
    (workspaceId: string) => {
      const workspace = useStore
        .getState()
        .workspaces.find((w) => w.id === workspaceId);
      if (workspace) {
        setCurrentWorkspace(workspace);
      }
    },
    [setCurrentWorkspace],
  );

  /**
   * Create a new workspace
   */
  const createNewWorkspace = useCallback(
    async (input: CreateWorkspaceInput) => {
      try {
        const newWorkspace = await createWorkspace(input.name, input.slug);
        setCurrentWorkspace(newWorkspace);
        return newWorkspace;
      } catch (error) {
        throw error;
      }
    },
    [createWorkspace, setCurrentWorkspace],
  );

  /**
   * Update current workspace settings
   */
  const updateWorkspaceSettings = useCallback(
    async (settings: Record<string, unknown>) => {
      if (!currentWorkspace?.id) {
        throw new Error("No workspace selected");
      }

      const { error } = await supabase
        .from("workspaces")
        .update({ settings })
        .eq("id", currentWorkspace.id);

      if (error) throw error;

      // Refetch workspaces to get updated data
      await fetchWorkspaces();
    },
    [currentWorkspace?.id, supabase, fetchWorkspaces],
  );

  /**
   * Get workspace members
   */
  const getWorkspaceMembers = useCallback(async () => {
    if (!currentWorkspace?.id) {
      throw new Error("No workspace selected");
    }

    const { data, error } = await supabase
      .from("workspace_members")
      .select(
        `
        id,
        user_id,
        role,
        joined_at,
        user_profiles (
          id,
          email,
          full_name,
          avatar_url
        )
      `,
      )
      .eq("workspace_id", currentWorkspace.id);

    if (error) throw error;
    return data;
  }, [currentWorkspace?.id, supabase]);

  /**
   * Invite a user to the workspace
   */
  const inviteUserToWorkspace = useCallback(
    async (email: string, role: "admin" | "member" = "member") => {
      if (!currentWorkspace?.id) {
        throw new Error("No workspace selected");
      }

      // First, try to find the user
      const { data: existingUser, error: userError } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("email", email)
        .single();

      if (userError && userError.code !== "PGRST116") {
        throw userError;
      }

      if (!existingUser) {
        // User doesn't exist yet, create an invitation (handled by backend)
        // For now, throw error
        throw new Error("User not found. They must sign up first.");
      }

      // Add user to workspace
      const { error } = await supabase.from("workspace_members").insert([
        {
          workspace_id: currentWorkspace.id,
          user_id: existingUser.id,
          role,
        },
      ]);

      if (error) throw error;
    },
    [currentWorkspace?.id, supabase],
  );

  /**
   * Remove a user from the workspace
   */
  const removeUserFromWorkspace = useCallback(
    async (userId: string) => {
      if (!currentWorkspace?.id) {
        throw new Error("No workspace selected");
      }

      const { error } = await supabase
        .from("workspace_members")
        .delete()
        .eq("workspace_id", currentWorkspace.id)
        .eq("user_id", userId);

      if (error) throw error;
    },
    [currentWorkspace?.id, supabase],
  );

  /**
   * Update a workspace member's role
   */
  const updateMemberRole = useCallback(
    async (userId: string, role: "admin" | "member") => {
      if (!currentWorkspace?.id) {
        throw new Error("No workspace selected");
      }

      const { error } = await supabase
        .from("workspace_members")
        .update({ role })
        .eq("workspace_id", currentWorkspace.id)
        .eq("user_id", userId);

      if (error) throw error;
    },
    [currentWorkspace?.id, supabase],
  );

  /**
   * Leave a workspace
   */
  const leaveWorkspace = useCallback(
    async (workspaceId: string) => {
      const { data } = await supabase.auth.getSession();
      if (!data?.session?.user?.id) {
        throw new Error("Not authenticated");
      }

      const { error } = await supabase
        .from("workspace_members")
        .delete()
        .eq("workspace_id", workspaceId)
        .eq("user_id", data.session.user.id);

      if (error) throw error;

      // If we left the current workspace, switch to another one
      if (currentWorkspace?.id === workspaceId) {
        const remainingWorkspaces = useStore
          .getState()
          .workspaces.filter((w) => w.id !== workspaceId);
        if (remainingWorkspaces.length > 0) {
          setCurrentWorkspace(remainingWorkspaces[0]);
        }
      }

      // Refetch workspaces
      await fetchWorkspaces();
    },
    [currentWorkspace?.id, supabase, setCurrentWorkspace, fetchWorkspaces],
  );

  return {
    switchWorkspace,
    createNewWorkspace,
    updateWorkspaceSettings,
    getWorkspaceMembers,
    inviteUserToWorkspace,
    removeUserFromWorkspace,
    updateMemberRole,
    leaveWorkspace,
  };
};

/**
 * Hook for workspace settings management
 */
export const useWorkspaceSettings = () => {
  const currentWorkspace = useCurrentWorkspace();
  const { updateWorkspaceSettings } = useWorkspaceActions_();

  const updateTimezone = useCallback(
    async (timezone: string) => {
      const settings = {
        ...(currentWorkspace?.settings || {}),
        timezone,
      };
      await updateWorkspaceSettings(settings);
    },
    [currentWorkspace?.settings, updateWorkspaceSettings],
  );

  const updateTheme = useCallback(
    async (theme: "light" | "dark" | "system") => {
      const settings = {
        ...(currentWorkspace?.settings || {}),
        theme,
      };
      await updateWorkspaceSettings(settings);
    },
    [currentWorkspace?.settings, updateWorkspaceSettings],
  );

  const updateNotifications = useCallback(
    async (enabled: boolean) => {
      const settings = {
        ...(currentWorkspace?.settings || {}),
        notifications_enabled: enabled,
      };
      await updateWorkspaceSettings(settings);
    },
    [currentWorkspace?.settings, updateWorkspaceSettings],
  );

  return {
    settings: currentWorkspace?.settings || {},
    updateTimezone,
    updateTheme,
    updateNotifications,
    updateWorkspaceSettings,
  };
};

/**
 * Hook for checking user's role and permissions in current workspace
 */
export const useWorkspaceRole = () => {
  const currentWorkspace = useCurrentWorkspace();

  const isOwner = currentWorkspace?.role === "owner";
  const isAdmin = currentWorkspace?.role === "admin" || isOwner;
  const isMember = currentWorkspace?.role === "member";

  const canManageMembers = isAdmin;
  const canDeleteWorkspace = isOwner;
  const canEditSettings = isAdmin;
  const canCreateProjects = isAdmin || isMember;
  const canCreateTasks = true; // All members can create tasks

  return {
    role: currentWorkspace?.role,
    isOwner,
    isAdmin,
    isMember,
    canManageMembers,
    canDeleteWorkspace,
    canEditSettings,
    canCreateProjects,
    canCreateTasks,
  };
};

export default useWorkspace;
