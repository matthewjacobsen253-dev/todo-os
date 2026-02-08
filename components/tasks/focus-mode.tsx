"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { X, Target, CheckCircle2, Sparkles, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Task, TaskStatus } from "@/types";

interface FocusModeProps {
  tasks: Task[];
  open: boolean;
  onClose: () => void;
  onTaskComplete: (taskId: string, status: TaskStatus) => void;
}

// Get top 3 priority tasks for today
function getTopTasks(tasks: Task[]): Task[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Filter for non-completed tasks
  const activeTasks = tasks.filter(
    (t) => t.status !== "done" && t.status !== "cancelled",
  );

  // Score tasks by priority and due date
  const scored = activeTasks.map((task) => {
    let score = 0;

    // Priority scoring
    switch (task.priority) {
      case "urgent":
        score += 100;
        break;
      case "high":
        score += 75;
        break;
      case "medium":
        score += 50;
        break;
      case "low":
        score += 25;
        break;
      default:
        score += 10;
    }

    // Due date scoring
    if (task.due_date) {
      const dueDate = new Date(task.due_date);
      dueDate.setHours(0, 0, 0, 0);
      const daysUntilDue = Math.floor(
        (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (daysUntilDue < 0) {
        // Overdue - highest priority
        score += 200;
      } else if (daysUntilDue === 0) {
        // Due today
        score += 150;
      } else if (daysUntilDue === 1) {
        // Due tomorrow
        score += 100;
      } else if (daysUntilDue <= 7) {
        // Due this week
        score += 50;
      }
    }

    return { task, score };
  });

  // Sort by score and return top 3
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((s) => s.task);
}

export function FocusMode({
  tasks,
  open,
  onClose,
  onTaskComplete,
}: FocusModeProps) {
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [currentIndex, setCurrentIndex] = useState(0);

  const topTasks = useMemo(() => getTopTasks(tasks), [tasks]);

  // Reset state when opening
  useEffect(() => {
    if (open) {
      setCompletedIds(new Set());
      setCurrentIndex(0);
    }
  }, [open]);

  const handleComplete = useCallback(
    (taskId: string) => {
      setCompletedIds((prev) => new Set(prev).add(taskId));
      onTaskComplete(taskId, "done");

      // Move to next task after animation
      setTimeout(() => {
        if (currentIndex < topTasks.length - 1) {
          setCurrentIndex((prev) => prev + 1);
        }
      }, 500);
    },
    [currentIndex, topTasks.length, onTaskComplete],
  );

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onClose();
      }
      // X to complete current task
      if (e.key === "x" && open && topTasks[currentIndex]) {
        const task = topTasks[currentIndex];
        if (!completedIds.has(task.id)) {
          handleComplete(task.id);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose, topTasks, currentIndex, completedIds, handleComplete]);

  if (!open) return null;

  const allCompleted = topTasks.every((t) => completedIds.has(t.id));
  const completedCount = topTasks.filter((t) => completedIds.has(t.id)).length;
  const progressPct =
    topTasks.length > 0 ? (completedCount / topTasks.length) * 100 : 0;

  return (
    <div
      className="fixed inset-0 z-50 bg-background flex flex-col animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Focus Mode"
    >
      {/* Live region for screen reader announcements */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {allCompleted
          ? "Congratulations! All focus tasks completed."
          : `${completedCount} of ${topTasks.length} tasks completed`}
      </div>

      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Target className="w-6 h-6 text-primary" />
          <h1 className="text-lg font-semibold">Focus Mode</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            {completedCount}/{topTasks.length} completed
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Exit focus mode"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Progress bar */}
      <div className="h-1 bg-muted">
        <div
          className="h-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center p-8">
        {topTasks.length === 0 ? (
          <div className="text-center space-y-4">
            <Sparkles className="w-16 h-16 mx-auto text-primary/50" />
            <h2 className="text-2xl font-bold">You&apos;re all caught up!</h2>
            <p className="text-muted-foreground">
              No urgent tasks to focus on. Enjoy!
            </p>
            <Button onClick={onClose}>Exit Focus Mode</Button>
          </div>
        ) : allCompleted ? (
          <div className="text-center space-y-4 animate-fade-in">
            <div className="relative">
              <CheckCircle2 className="w-24 h-24 mx-auto text-green-500 animate-bounce" />
              <Sparkles className="w-8 h-8 absolute top-0 right-1/4 text-yellow-500 animate-pulse" />
            </div>
            <h2 className="text-3xl font-bold">Amazing work! 🎉</h2>
            <p className="text-lg text-muted-foreground">
              You completed all your focus tasks for today.
            </p>
            <Button onClick={onClose} size="lg" className="mt-4">
              Exit Focus Mode
            </Button>
          </div>
        ) : (
          <div className="w-full max-w-2xl space-y-8">
            {/* Task cards */}
            <div className="space-y-4">
              {topTasks.map((task, idx) => {
                const isCompleted = completedIds.has(task.id);
                const isCurrent = idx === currentIndex && !isCompleted;
                const isPast = idx < currentIndex || isCompleted;

                return (
                  <div
                    key={task.id}
                    className={cn(
                      "relative rounded-2xl border transition-all duration-300",
                      isCurrent
                        ? "bg-card border-primary shadow-xl scale-100 p-8"
                        : isPast
                          ? "bg-muted/50 border-muted opacity-50 scale-95 p-4"
                          : "bg-card/50 border-border opacity-70 scale-95 p-4",
                    )}
                  >
                    {/* Task number */}
                    <div
                      className={cn(
                        "absolute -left-3 -top-3 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                        isCompleted
                          ? "bg-green-500 text-white"
                          : isCurrent
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground",
                      )}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        idx + 1
                      )}
                    </div>

                    {/* Task content */}
                    <div
                      className={cn(
                        "transition-all",
                        isCompleted && "line-through text-muted-foreground",
                      )}
                    >
                      <h3
                        className={cn(
                          "font-semibold",
                          isCurrent ? "text-2xl" : "text-lg",
                        )}
                      >
                        {task.title}
                      </h3>
                      {task.description && isCurrent && (
                        <p className="text-muted-foreground mt-2">
                          {task.description}
                        </p>
                      )}
                      {isCurrent && (
                        <div className="flex items-center gap-4 mt-6">
                          {task.priority !== "none" && (
                            <span
                              className={cn(
                                "px-3 py-1 rounded-full text-sm font-medium",
                                task.priority === "urgent"
                                  ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                  : task.priority === "high"
                                    ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                                    : task.priority === "medium"
                                      ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                                      : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
                              )}
                            >
                              {task.priority}
                            </span>
                          )}
                          {task.due_date && (
                            <span className="text-sm text-muted-foreground">
                              Due:{" "}
                              {new Date(task.due_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Complete button for current task */}
                    {isCurrent && (
                      <Button
                        onClick={() => handleComplete(task.id)}
                        size="lg"
                        className="mt-6 w-full text-lg py-6 group"
                      >
                        <CheckCircle2 className="w-5 h-5 mr-2 group-hover:scale-110 transition" />
                        Mark Complete
                        <kbd className="ml-3 px-2 py-0.5 rounded bg-primary-foreground/20 text-xs">
                          X
                        </kbd>
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Navigation hint */}
            <div className="text-center text-sm text-muted-foreground">
              <p>
                Press{" "}
                <kbd className="px-1.5 py-0.5 rounded bg-muted border">X</kbd>{" "}
                to complete •{" "}
                <kbd className="px-1.5 py-0.5 rounded bg-muted border">Esc</kbd>{" "}
                to exit
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
