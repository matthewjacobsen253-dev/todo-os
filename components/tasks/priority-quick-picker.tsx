"use client";

import { useEffect, useState, useCallback } from "react";
import { Zap, AlertCircle, Circle, Minus } from "lucide-react";
import { useStore, useCurrentWorkspace } from "@/store";
import type { TaskPriority } from "@/types";

interface PriorityOption {
  label: string;
  key: string;
  value: TaskPriority;
  icon: React.ReactNode;
  color: string;
}

const priorityOptions: PriorityOption[] = [
  {
    label: "Urgent",
    key: "1",
    value: "urgent",
    icon: <Zap className="h-4 w-4" />,
    color: "text-red-500",
  },
  {
    label: "High",
    key: "2",
    value: "high",
    icon: <AlertCircle className="h-4 w-4" />,
    color: "text-orange-500",
  },
  {
    label: "Medium",
    key: "3",
    value: "medium",
    icon: <Circle className="h-4 w-4" />,
    color: "text-blue-500",
  },
  {
    label: "Low",
    key: "4",
    value: "low",
    icon: <Minus className="h-4 w-4" />,
    color: "text-gray-400",
  },
];

export function PriorityQuickPicker() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectedTaskIndex = useStore((state) => state.selectedTaskIndex);
  const tasks = useStore((state) => state.tasks);
  const updateTask = useStore((state) => state.updateTask);
  const currentWorkspace = useCurrentWorkspace();

  // Check if any modal is open
  const focusModeOpen = useStore((state) => state.focusModeOpen);
  const taskDetailOpen = useStore((state) => state.taskDetailOpen);
  const commandPaletteOpen = useStore((state) => state.commandPaletteOpen);
  const quickCaptureOpen = useStore((state) => state.quickCaptureOpen);

  const isModalOpen =
    focusModeOpen || taskDetailOpen || commandPaletteOpen || quickCaptureOpen;

  const getSelectedTask = useCallback(() => {
    const activeTasks = tasks.filter(
      (t) => t.status !== "done" && t.status !== "cancelled",
    );
    return activeTasks[selectedTaskIndex];
  }, [tasks, selectedTaskIndex]);

  const applyPriority = useCallback(
    async (option: PriorityOption) => {
      const task = getSelectedTask();
      if (!task || !currentWorkspace) return;

      await updateTask(currentWorkspace.id, task.id, {
        priority: option.value,
      });
      setIsOpen(false);
    },
    [getSelectedTask, currentWorkspace, updateTask],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      // P key opens the picker when a task is selected
      if (
        (e.key === "p" || e.key === "P") &&
        !e.metaKey &&
        !e.ctrlKey &&
        !isModalOpen &&
        !isOpen &&
        selectedTaskIndex >= 0
      ) {
        e.preventDefault();
        setIsOpen(true);
        // Set initial selection based on current task priority
        const task = getSelectedTask();
        if (task) {
          const idx = priorityOptions.findIndex(
            (o) => o.value === task.priority,
          );
          setSelectedIndex(idx >= 0 ? idx : 0);
        }
        return;
      }

      // When picker is open
      if (isOpen) {
        e.preventDefault();
        e.stopPropagation();

        if (e.key === "Escape") {
          setIsOpen(false);
          return;
        }

        if (e.key === "ArrowDown" || e.key === "j") {
          setSelectedIndex((i) => Math.min(i + 1, priorityOptions.length - 1));
          return;
        }

        if (e.key === "ArrowUp" || e.key === "k") {
          setSelectedIndex((i) => Math.max(i - 1, 0));
          return;
        }

        if (e.key === "Enter") {
          applyPriority(priorityOptions[selectedIndex]);
          return;
        }

        // Quick select by number key
        const option = priorityOptions.find((o) => o.key === e.key);
        if (option) {
          applyPriority(option);
          return;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [
    isOpen,
    isModalOpen,
    selectedTaskIndex,
    selectedIndex,
    applyPriority,
    getSelectedTask,
  ]);

  if (!isOpen) return null;

  const task = getSelectedTask();
  if (!task) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/20"
        onClick={() => setIsOpen(false)}
      />

      {/* Picker */}
      <div className="relative z-10 w-56 animate-in fade-in zoom-in-95 rounded-lg border bg-background p-2 shadow-xl">
        <div className="mb-2 border-b px-2 pb-2">
          <p className="text-sm font-medium">Set Priority</p>
          <p className="truncate text-xs text-muted-foreground">{task.title}</p>
        </div>

        <div className="space-y-1">
          {priorityOptions.map((option, index) => (
            <button
              key={option.key}
              onClick={() => applyPriority(option)}
              className={`flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm transition-colors ${
                index === selectedIndex
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-muted"
              }`}
            >
              <span className={option.color}>{option.icon}</span>
              <span className="flex-1">{option.label}</span>
              <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                {option.key}
              </kbd>
              {task.priority === option.value && (
                <span className="h-2 w-2 rounded-full bg-primary" />
              )}
            </button>
          ))}
        </div>

        <div className="mt-2 border-t pt-2">
          <p className="text-center text-xs text-muted-foreground">
            ↑↓ navigate • Enter select • Esc close
          </p>
        </div>
      </div>
    </div>
  );
}
