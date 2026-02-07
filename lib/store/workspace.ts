import { create } from "zustand";

interface Workspace {
  id: string;
  name: string;
  slug: string;
}

interface WorkspaceStoreState {
  currentWorkspace: Workspace | null;
  setCurrentWorkspace: (workspace: Workspace) => void;
}

export const useWorkspaceStore = create<WorkspaceStoreState>((set) => ({
  currentWorkspace: null,
  setCurrentWorkspace: (workspace: Workspace) => {
    set({ currentWorkspace: workspace });
    if (typeof window !== "undefined") {
      localStorage.setItem("currentWorkspace", JSON.stringify(workspace));
    }
  },
}));
