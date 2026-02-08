"use client";

import { useMemo } from "react";
import { Calendar, AlertCircle, Flame, List } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Task } from "@/types";
import { isToday, isBefore, startOfDay, parseISO } from "date-fns";

export type QuickFilter = "all" | "today" | "overdue" | "high-priority";

interface FilterOption {
  id: QuickFilter;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  count: number;
  colorClass?: string;
}

interface QuickFiltersBarProps {
  tasks: Task[];
  activeFilter: QuickFilter;
  onFilterChange: (filter: QuickFilter) => void;
}

function countFilteredTasks(tasks: Task[], filter: QuickFilter): number {
  const today = startOfDay(new Date());
  const activeTasks = tasks.filter(
    (t) => t.status !== "done" && t.status !== "cancelled",
  );

  switch (filter) {
    case "all":
      return activeTasks.length;
    case "today":
      return activeTasks.filter((t) => {
        if (!t.due_date) return false;
        try {
          return isToday(parseISO(t.due_date));
        } catch {
          return false;
        }
      }).length;
    case "overdue":
      return activeTasks.filter((t) => {
        if (!t.due_date) return false;
        try {
          const dueDate = startOfDay(parseISO(t.due_date));
          return isBefore(dueDate, today);
        } catch {
          return false;
        }
      }).length;
    case "high-priority":
      return activeTasks.filter(
        (t) => t.priority === "urgent" || t.priority === "high",
      ).length;
    default:
      return 0;
  }
}

export function QuickFiltersBar({
  tasks,
  activeFilter,
  onFilterChange,
}: QuickFiltersBarProps) {
  const filters: FilterOption[] = useMemo(() => {
    return [
      {
        id: "all" as const,
        label: "All",
        icon: List,
        count: countFilteredTasks(tasks, "all"),
      },
      {
        id: "today" as const,
        label: "Today",
        icon: Calendar,
        count: countFilteredTasks(tasks, "today"),
        colorClass: "text-blue-600 dark:text-blue-400",
      },
      {
        id: "overdue" as const,
        label: "Overdue",
        icon: AlertCircle,
        count: countFilteredTasks(tasks, "overdue"),
        colorClass: "text-red-600 dark:text-red-400",
      },
      {
        id: "high-priority" as const,
        label: "High Priority",
        icon: Flame,
        count: countFilteredTasks(tasks, "high-priority"),
        colorClass: "text-orange-600 dark:text-orange-400",
      },
    ];
  }, [tasks]);

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {filters.map((filter) => {
        const Icon = filter.icon;
        const isActive = activeFilter === filter.id;

        return (
          <button
            key={filter.id}
            onClick={() => onFilterChange(filter.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap",
              "border hover:shadow-sm",
              isActive
                ? "bg-primary text-primary-foreground border-primary shadow-md"
                : "bg-card text-muted-foreground border-border hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon
              className={cn(
                "w-4 h-4",
                isActive ? "text-primary-foreground" : filter.colorClass,
              )}
            />
            <span>{filter.label}</span>
            {filter.count > 0 && (
              <span
                className={cn(
                  "px-1.5 py-0.5 rounded-full text-xs font-semibold min-w-[20px] text-center",
                  isActive
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {filter.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// Helper to apply filter to task list
export function applyQuickFilter(tasks: Task[], filter: QuickFilter): Task[] {
  const today = startOfDay(new Date());
  const activeTasks = tasks.filter(
    (t) => t.status !== "done" && t.status !== "cancelled",
  );

  switch (filter) {
    case "all":
      return activeTasks;
    case "today":
      return activeTasks.filter((t) => {
        if (!t.due_date) return false;
        try {
          return isToday(parseISO(t.due_date));
        } catch {
          return false;
        }
      });
    case "overdue":
      return activeTasks.filter((t) => {
        if (!t.due_date) return false;
        try {
          const dueDate = startOfDay(parseISO(t.due_date));
          return isBefore(dueDate, today);
        } catch {
          return false;
        }
      });
    case "high-priority":
      return activeTasks.filter(
        (t) => t.priority === "urgent" || t.priority === "high",
      );
    default:
      return activeTasks;
  }
}
