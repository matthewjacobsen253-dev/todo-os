"use client";

import { useState, useEffect } from "react";
import { X, Keyboard } from "lucide-react";
import { cn } from "@/lib/utils";

interface ShortcutGroup {
  title: string;
  shortcuts: { keys: string[]; description: string }[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: "Navigation",
    shortcuts: [
      { keys: ["J"], description: "Next task" },
      { keys: ["K"], description: "Previous task" },
      { keys: ["⌘", "1-3"], description: "Switch workspace" },
      { keys: ["G", "I"], description: "Go to Inbox" },
      { keys: ["G", "T"], description: "Go to Today" },
      { keys: ["G", "P"], description: "Go to Projects" },
    ],
  },
  {
    title: "Task Actions",
    shortcuts: [
      { keys: ["X"], description: "Complete task" },
      { keys: ["E"], description: "Edit task" },
      { keys: ["D"], description: "Set due date" },
      { keys: ["P"], description: "Set priority" },
      { keys: ["Delete"], description: "Delete task" },
    ],
  },
  {
    title: "Global",
    shortcuts: [
      { keys: ["⌘", "K"], description: "Quick capture / Search" },
      { keys: ["⌘", "N"], description: "New task" },
      { keys: ["F"], description: "Toggle Focus Mode" },
      { keys: ["?"], description: "Show shortcuts" },
      { keys: ["Esc"], description: "Close / Cancel" },
    ],
  },
];

interface KeyboardHintsProps {
  open: boolean;
  onClose: () => void;
}

export function KeyboardHints({ open, onClose }: KeyboardHintsProps) {
  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card z-10">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Keyboard Shortcuts</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-muted transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-6">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.title}>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
                {group.title}
              </h3>
              <div className="space-y-2">
                {group.shortcuts.map((shortcut, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-3"
                  >
                    <span className="text-sm text-foreground">
                      {shortcut.description}
                    </span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, keyIdx) => (
                        <kbd
                          key={keyIdx}
                          className={cn(
                            "px-2 py-1 rounded text-xs font-mono",
                            "bg-muted border border-border shadow-sm",
                            "min-w-[24px] text-center",
                          )}
                        >
                          {key}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-border text-center">
          <p className="text-xs text-muted-foreground">
            Press{" "}
            <kbd className="px-1.5 py-0.5 rounded bg-muted border text-xs">
              ?
            </kbd>{" "}
            anytime to show this help
          </p>
        </div>
      </div>
    </div>
  );
}

// Small floating indicator showing available shortcuts
export function KeyboardHintsBadge({ onClick }: { onClick: () => void }) {
  const [isVisible, setIsVisible] = useState(true);

  // Hide after 5 seconds on first load
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <button
      onClick={onClick}
      className="fixed bottom-24 right-4 sm:bottom-28 sm:right-8 md:bottom-28 md:right-10 
                 flex items-center gap-2 px-3 py-2 rounded-full 
                 bg-card/80 backdrop-blur border border-border shadow-lg
                 text-xs text-muted-foreground hover:text-foreground transition
                 animate-fade-in"
    >
      <Keyboard className="w-4 h-4" />
      <span>Press</span>
      <kbd className="px-1.5 py-0.5 rounded bg-muted border text-xs">?</kbd>
      <span>for shortcuts</span>
    </button>
  );
}
