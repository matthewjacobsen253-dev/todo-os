"use client";

import { useEffect, useState, useCallback } from "react";
import { Calendar, Sun, ArrowRight, CalendarDays } from "lucide-react";
import { useStore, useCurrentWorkspace } from "@/store";

interface DateOption {
  label: string;
  key: string;
  icon: React.ReactNode;
  getValue: () => string;
}

const dateOptions: DateOption[] = [
  {
    label: "Today",
    key: "t",
    icon: <Sun className="h-4 w-4 text-yellow-500" />,
    getValue: () => new Date().toISOString().split("T")[0],
  },
  {
    label: "Tomorrow",
    key: "m",
    icon: <ArrowRight className="h-4 w-4 text-blue-500" />,
    getValue: () => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      return d.toISOString().split("T")[0];
    },
  },
  {
    label: "Next Week",
    key: "w",
    icon: <CalendarDays className="h-4 w-4 text-purple-500" />,
    getValue: () => {
      const d = new Date();
      d.setDate(d.getDate() + 7);
      return d.toISOString().split("T")[0];
    },
  },
  {
    label: "No Date",
    key: "n",
    icon: <Calendar className="h-4 w-4 text-gray-400" />,
    getValue: () => "",
  },
];

export function DueDateQuickPicker() {
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

  const applyDate = useCallback(
    async (option: DateOption) => {
      const task = getSelectedTask();
      if (!task || !currentWorkspace) return;

      const dueDate = option.getValue();
      await updateTask(currentWorkspace.id, task.id, {
        due_date: dueDate || null,
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

      // D key opens the picker when a task is selected
      if (
        (e.key === "d" || e.key === "D") &&
        !isModalOpen &&
        !isOpen &&
        selectedTaskIndex >= 0
      ) {
        e.preventDefault();
        setIsOpen(true);
        setSelectedIndex(0);
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
          setSelectedIndex((i) => Math.min(i + 1, dateOptions.length - 1));
          return;
        }

        if (e.key === "ArrowUp" || e.key === "k") {
          setSelectedIndex((i) => Math.max(i - 1, 0));
          return;
        }

        if (e.key === "Enter") {
          applyDate(dateOptions[selectedIndex]);
          return;
        }

        // Quick select by key
        const option = dateOptions.find(
          (o) => o.key.toLowerCase() === e.key.toLowerCase(),
        );
        if (option) {
          applyDate(option);
          return;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [isOpen, isModalOpen, selectedTaskIndex, selectedIndex, applyDate]);

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
      <div className="relative z-10 w-64 animate-in fade-in zoom-in-95 rounded-lg border bg-background p-2 shadow-xl">
        <div className="mb-2 border-b px-2 pb-2">
          <p className="text-sm font-medium">Set Due Date</p>
          <p className="truncate text-xs text-muted-foreground">{task.title}</p>
        </div>

        <div className="space-y-1">
          {dateOptions.map((option, index) => (
            <button
              key={option.key}
              onClick={() => applyDate(option)}
              className={`flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm transition-colors ${
                index === selectedIndex
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-muted"
              }`}
            >
              {option.icon}
              <span className="flex-1">{option.label}</span>
              <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                {option.key.toUpperCase()}
              </kbd>
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
