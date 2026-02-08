/**
 * Custom hook for registering keyboard shortcuts
 * Provides global keyboard event handling for the application
 * Inspired by Linear's keyboard-first design
 */

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useUIActions, useUI, useCurrentWorkspace, useStore } from "@/store";

/**
 * Keyboard shortcuts configuration
 */
interface _KeyboardShortcut {
  key: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  callback: () => void;
}

// Track the last "g" key press for go-to shortcuts
let lastGPressTime = 0;
const GO_TO_TIMEOUT = 500; // ms

/**
 * Hook to register and manage keyboard shortcuts
 * Handles shortcuts like Cmd+K for quick capture, J/K for navigation, etc.
 */
export const useKeyboardShortcuts = () => {
  const router = useRouter();
  const {
    toggleQuickCapture,
    toggleCommandPalette,
    closeTaskDetail,
    toggleFocusMode,
    toggleKeyboardHints,
    navigateTaskList,
    openTaskDetail,
  } = useUIActions();

  const {
    focusModeOpen,
    taskDetailOpen,
    commandPaletteOpen,
    quickCaptureOpen,
    selectedTaskIndex,
  } = useUI();
  const currentWorkspace = useCurrentWorkspace();
  const workspaces = useStore((state) => state.workspaces);

  // Get tasks for keyboard navigation
  const tasks = useStore((state) => state.tasks);
  const updateTask = useStore((state) => state.updateTask);

  const isModalOpen =
    focusModeOpen || taskDetailOpen || commandPaletteOpen || quickCaptureOpen;

  useEffect(() => {
    /**
     * Keyboard event handler
     */
    const handleKeyDown = (event: KeyboardEvent) => {
      // Get modifier keys
      const isMeta = event.metaKey;
      const isCtrl = event.ctrlKey;
      const target = event.target as HTMLElement;

      // Don't trigger shortcuts when typing in inputs
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        // Only allow Escape in inputs
        if (event.key !== "Escape") return;
      }

      // ===== GLOBAL SHORTCUTS (work everywhere) =====

      // Cmd/Ctrl + K: Toggle command palette / search
      if ((isMeta || isCtrl) && event.key === "k") {
        event.preventDefault();
        toggleCommandPalette();
        return;
      }

      // Cmd/Ctrl + N: Create new task
      if ((isMeta || isCtrl) && event.key === "n") {
        event.preventDefault();
        toggleQuickCapture();
        return;
      }

      // Escape: Close any open panels
      if (event.key === "Escape") {
        event.preventDefault();
        closeTaskDetail();
        return;
      }

      // ?: Show keyboard hints
      if (event.key === "?" && !isModalOpen) {
        event.preventDefault();
        toggleKeyboardHints();
        return;
      }

      // Don't process other shortcuts if modal is open
      if (isModalOpen) return;

      // ===== WORKSPACE SHORTCUTS =====

      // Cmd/Ctrl + 1/2/3: Switch workspace
      if ((isMeta || isCtrl) && ["1", "2", "3"].includes(event.key)) {
        event.preventDefault();
        const index = parseInt(event.key) - 1;
        if (workspaces[index]) {
          const setCurrentWorkspace = useStore.getState().setCurrentWorkspace;
          setCurrentWorkspace(workspaces[index]);
        }
        return;
      }

      // ===== NAVIGATION SHORTCUTS =====

      // J: Next task
      if (event.key === "j" || event.key === "J") {
        event.preventDefault();
        const maxIndex =
          tasks.filter((t) => t.status !== "done" && t.status !== "cancelled")
            .length - 1;
        navigateTaskList("down", maxIndex);
        return;
      }

      // K: Previous task
      if (event.key === "k" || event.key === "K") {
        event.preventDefault();
        navigateTaskList("up", 0);
        return;
      }

      // Enter: Open selected task
      if (event.key === "Enter" && selectedTaskIndex >= 0) {
        event.preventDefault();
        const activeTasks = tasks.filter(
          (t) => t.status !== "done" && t.status !== "cancelled",
        );
        const task = activeTasks[selectedTaskIndex];
        if (task) {
          openTaskDetail(task.id);
        }
        return;
      }

      // ===== TASK ACTIONS =====

      // X: Complete selected task
      if ((event.key === "x" || event.key === "X") && selectedTaskIndex >= 0) {
        event.preventDefault();
        const activeTasks = tasks.filter(
          (t) => t.status !== "done" && t.status !== "cancelled",
        );
        const task = activeTasks[selectedTaskIndex];
        if (task && currentWorkspace) {
          updateTask(currentWorkspace.id, task.id, { status: "done" });
        }
        return;
      }

      // E: Edit selected task
      if ((event.key === "e" || event.key === "E") && selectedTaskIndex >= 0) {
        event.preventDefault();
        const activeTasks = tasks.filter(
          (t) => t.status !== "done" && t.status !== "cancelled",
        );
        const task = activeTasks[selectedTaskIndex];
        if (task) {
          openTaskDetail(task.id);
        }
        return;
      }

      // F: Toggle Focus Mode
      if (event.key === "f" || event.key === "F") {
        event.preventDefault();
        toggleFocusMode();
        return;
      }

      // ===== GO-TO SHORTCUTS (g + key) =====
      const now = Date.now();

      if (event.key === "g" || event.key === "G") {
        lastGPressTime = now;
        return;
      }

      // Check if this is a go-to combo (g was pressed recently)
      if (now - lastGPressTime < GO_TO_TIMEOUT) {
        switch (event.key.toLowerCase()) {
          case "i": // g + i: Go to Inbox
            event.preventDefault();
            router.push("/inbox");
            lastGPressTime = 0;
            return;
          case "t": // g + t: Go to Today
            event.preventDefault();
            router.push("/today");
            lastGPressTime = 0;
            return;
          case "p": // g + p: Go to Projects
            event.preventDefault();
            router.push("/projects");
            lastGPressTime = 0;
            return;
          case "b": // g + b: Go to Briefing
            event.preventDefault();
            router.push("/briefing");
            lastGPressTime = 0;
            return;
          case "s": // g + s: Go to Settings
            event.preventDefault();
            router.push("/settings");
            lastGPressTime = 0;
            return;
        }
      }

      // Cmd/Ctrl + Shift + D: Toggle sidebar (optional)
      if ((isMeta || isCtrl) && event.shiftKey && event.key === "d") {
        event.preventDefault();
        // This could toggle the sidebar
        return;
      }
    };

    // Add event listener
    window.addEventListener("keydown", handleKeyDown);

    // Cleanup
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    router,
    toggleQuickCapture,
    toggleCommandPalette,
    closeTaskDetail,
    toggleFocusMode,
    toggleKeyboardHints,
    navigateTaskList,
    openTaskDetail,
    isModalOpen,
    tasks,
    selectedTaskIndex,
    currentWorkspace,
    workspaces,
    updateTask,
  ]);
};

/**
 * Hook to check if a specific keyboard combination was pressed
 * @param callback - Function to call when the shortcut is pressed
 * @param key - The key to listen for
 * @param options - Modifier keys to require
 */
export const useKeyboardShortcut = (
  callback: () => void,
  key: string,
  options?: {
    metaKey?: boolean;
    ctrlKey?: boolean;
    shiftKey?: boolean;
    altKey?: boolean;
  },
) => {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if the pressed key matches
      if (event.key.toLowerCase() !== key.toLowerCase()) {
        return;
      }

      // Check modifier keys if specified
      if (options?.metaKey && !event.metaKey) return;
      if (options?.ctrlKey && !event.ctrlKey) return;
      if (options?.shiftKey && !event.shiftKey) return;
      if (options?.altKey && !event.altKey) return;

      event.preventDefault();
      callbackRef.current();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [key, options]);
};

/**
 * Get a human-readable keyboard shortcut string
 * @param key - The key
 * @param options - Modifier keys
 * @returns Readable shortcut string (e.g., "Cmd+K" or "Ctrl+Shift+N")
 */
export const getShortcutString = (
  key: string,
  options?: {
    metaKey?: boolean;
    ctrlKey?: boolean;
    shiftKey?: boolean;
    altKey?: boolean;
  },
): string => {
  const parts: string[] = [];

  // Determine OS for proper modifier display
  const isMac =
    typeof navigator !== "undefined" &&
    /Mac|iPhone|iPad|iPod/.test(navigator.platform);

  if (options?.ctrlKey) {
    parts.push(isMac ? "Ctrl" : "Ctrl");
  }

  if (options?.metaKey) {
    parts.push(isMac ? "⌘" : "Win");
  }

  if (options?.shiftKey) {
    parts.push("⇧");
  }

  if (options?.altKey) {
    parts.push(isMac ? "⌥" : "Alt");
  }

  parts.push(key.toUpperCase());

  return parts.join("");
};

export default useKeyboardShortcuts;
