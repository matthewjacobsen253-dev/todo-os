/**
 * Custom hook for registering keyboard shortcuts
 * Provides global keyboard event handling for the application
 */

import { useEffect } from "react";
import { useUIActions } from "@/store";

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

/**
 * Hook to register and manage keyboard shortcuts
 * Handles shortcuts like Cmd+K for quick capture, Escape to close panels
 */
export const useKeyboardShortcuts = () => {
  const { toggleQuickCapture, toggleCommandPalette, closeTaskDetail } =
    useUIActions();

  useEffect(() => {
    /**
     * Keyboard event handler
     */
    const handleKeyDown = (event: KeyboardEvent) => {
      // Get modifier keys
      const isMeta = event.metaKey;
      const isCtrl = event.ctrlKey;

      // Cmd/Ctrl + K: Toggle quick capture
      if ((isMeta || isCtrl) && event.key === "k") {
        event.preventDefault();
        toggleQuickCapture();
        return;
      }

      // Cmd/Ctrl + /: Toggle command palette
      if ((isMeta || isCtrl) && event.key === "/") {
        event.preventDefault();
        toggleCommandPalette();
        return;
      }

      // Escape: Close any open panels
      if (event.key === "Escape") {
        event.preventDefault();
        closeTaskDetail();
        // Note: Other components should also listen for Escape to close their panels
        // This is for the task detail specifically
        return;
      }

      // Cmd/Ctrl + N: Create new task (alternative to quick capture)
      if ((isMeta || isCtrl) && event.key === "n") {
        event.preventDefault();
        toggleQuickCapture();
        return;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
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
      callback();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [callback, key, options]);
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
    parts.push(isMac ? "Cmd" : "Win");
  }

  if (options?.shiftKey) {
    parts.push("Shift");
  }

  if (options?.altKey) {
    parts.push(isMac ? "Option" : "Alt");
  }

  parts.push(key.toUpperCase());

  return parts.join("+");
};

export default useKeyboardShortcuts;
