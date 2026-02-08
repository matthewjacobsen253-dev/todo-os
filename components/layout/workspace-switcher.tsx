"use client";

import { useState, useEffect } from "react";
import { ChevronDown, Plus, Building2 } from "lucide-react";
import { useCurrentWorkspace, useStore, useWorkspaceActions } from "@/store";
import type { WorkspaceWithRole } from "@/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { WorkspaceCreateDialog } from "./workspace-create-dialog";

export function WorkspaceSwitcher() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const currentWorkspace = useCurrentWorkspace();
  const { fetchWorkspaces } = useWorkspaceActions();
  const workspaces = useStore((state) => state.workspaces);
  const workspaceLoading = useStore((state) => state.workspaceLoading);

  useEffect(() => {
    fetchWorkspaces();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSwitchWorkspace = (workspace: WorkspaceWithRole) => {
    useStore.getState().setCurrentWorkspace(workspace);
    // Persist selection
    localStorage.setItem("todo-os-workspace-id", workspace.id);
  };

  const handleWorkspaceCreated = (workspace: {
    id: string;
    name: string;
    slug: string;
    owner_id?: string;
    created_at?: string;
    settings?: Record<string, unknown>;
  }) => {
    const full: WorkspaceWithRole = {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      owner_id: workspace.owner_id || "",
      created_at: workspace.created_at || new Date().toISOString(),
      settings: (workspace.settings || {}) as WorkspaceWithRole["settings"],
      role: "owner",
      member_count: 1,
    };
    useStore.getState().setCurrentWorkspace(full);
    localStorage.setItem("todo-os-workspace-id", full.id);
    // Re-fetch to include the new workspace in the list
    fetchWorkspaces();
    setIsCreateOpen(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            aria-label="Switch workspace"
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-700 transition text-left group"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {workspaceLoading
                  ? "Loading..."
                  : currentWorkspace?.name || "Select workspace"}
              </p>
              <p className="text-xs text-slate-400 truncate">
                {currentWorkspace?.slug || ""}
              </p>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-300 transition flex-shrink-0" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent className="w-56" align="start">
          <DropdownMenuLabel className="px-2 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Your Workspaces
          </DropdownMenuLabel>

          {workspaces.length === 0 ? (
            <div className="px-2 py-4 text-center">
              <p className="text-sm text-slate-400">No workspaces yet</p>
            </div>
          ) : (
            <>
              {workspaces.map((workspace) => (
                <DropdownMenuItem
                  key={workspace.id}
                  onClick={() => handleSwitchWorkspace(workspace)}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-3 h-3 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {workspace.name}
                    </p>
                  </div>
                  {currentWorkspace?.id === workspace.id && (
                    <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                  )}
                </DropdownMenuItem>
              ))}

              <DropdownMenuSeparator />
            </>
          )}

          <DropdownMenuItem
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 cursor-pointer text-blue-400 hover:text-blue-300"
          >
            <Plus className="w-4 h-4" />
            Create workspace
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <WorkspaceCreateDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onCreated={handleWorkspaceCreated}
      />
    </>
  );
}
