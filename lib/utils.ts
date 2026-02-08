import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  format,
  formatDistance,
  isToday,
  isYesterday,
  isBefore,
  startOfDay,
  parseISO,
  addDays,
  differenceInCalendarDays,
} from "date-fns";
import { v4 as uuidv4 } from "uuid";
import type {
  Task,
  TaskPriority,
  TaskStatus,
  TaskSortField,
  SortDirection,
} from "@/types";

export const cn = (...inputs: ClassValue[]): string => {
  return twMerge(clsx(inputs));
};

export const hasEnvVars =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const formatDate = (date: string | Date): string => {
  try {
    const dateObj = typeof date === "string" ? parseISO(date) : date;
    return format(dateObj, "MMM d, yyyy");
  } catch {
    return "";
  }
};

export const formatRelativeDate = (date: string | Date): string => {
  try {
    const dateObj = typeof date === "string" ? parseISO(date) : date;

    if (isToday(dateObj)) {
      return "today";
    }

    if (isYesterday(dateObj)) {
      return "yesterday";
    }

    return formatDistance(dateObj, new Date(), { addSuffix: true });
  } catch {
    return "";
  }
};

export const getPriorityColor = (priority: TaskPriority): string => {
  const colors: Record<TaskPriority, string> = {
    urgent: "text-red-600 bg-red-50 dark:bg-red-900/20",
    high: "text-orange-600 bg-orange-50 dark:bg-orange-900/20",
    medium: "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20",
    low: "text-blue-600 bg-blue-50 dark:bg-blue-900/20",
    none: "text-gray-600 bg-gray-50 dark:bg-gray-900/20",
  };

  return colors[priority] || colors.none;
};

export const getStatusColor = (status: TaskStatus): string => {
  const colors: Record<TaskStatus, string> = {
    inbox: "text-gray-600 bg-gray-50 dark:bg-gray-900/20",
    todo: "text-blue-600 bg-blue-50 dark:bg-blue-900/20",
    in_progress: "text-purple-600 bg-purple-50 dark:bg-purple-900/20",
    waiting: "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20",
    done: "text-green-600 bg-green-50 dark:bg-green-900/20",
    cancelled: "text-red-600 bg-red-50 dark:bg-red-900/20",
  };

  return colors[status] || colors.inbox;
};

export const getConfidenceLabel = (score: number | null): string => {
  if (score === null) return "Unknown";

  if (score >= 0.7) return "High";
  if (score >= 0.4) return "Medium";
  return "Low";
};

export const truncate = (str: string, length: number): string => {
  if (str.length <= length) return str;
  return `${str.slice(0, length)}...`;
};

export const generateId = (): string => {
  return uuidv4();
};

export const slugify = (str: string): string => {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

export const debounce = <T extends (...args: unknown[]) => unknown>(
  fn: T,
  ms: number,
): ((...args: Parameters<T>) => void) => {
  let timeoutId: ReturnType<typeof setTimeout>;

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      fn(...args);
    }, ms);
  };
};

export const formatDuration = (milliseconds: number): string => {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }

  return `${seconds}s`;
};

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const groupBy = <T extends Record<string, unknown>>(
  array: T[],
  key: keyof T,
): Record<string, T[]> => {
  return array.reduce(
    (groups, item) => {
      const groupKey = String(item[key]);
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(item);
      return groups;
    },
    {} as Record<string, T[]>,
  );
};

export const deduplicate = <T extends Record<string, unknown>>(
  array: T[],
  key: keyof T,
): T[] => {
  const seen = new Set();
  return array.filter((item) => {
    const value = item[key];
    if (seen.has(value)) {
      return false;
    }
    seen.add(value);
    return true;
  });
};

export const sortByStatus = <T extends { status: TaskStatus }>(
  tasks: T[],
  statusOrder: TaskStatus[] = [
    "inbox",
    "todo",
    "in_progress",
    "waiting",
    "done",
    "cancelled",
  ],
): T[] => {
  return [...tasks].sort(
    (a, b) => statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status),
  );
};

export const sortByPriority = <T extends { priority: TaskPriority }>(
  tasks: T[],
  priorityOrder: TaskPriority[] = ["urgent", "high", "medium", "low", "none"],
): T[] => {
  return [...tasks].sort(
    (a, b) =>
      priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority),
  );
};

export const categorizeTodayTasks = (
  tasks: Task[],
): {
  overdue: Task[];
  dueToday: Task[];
  completedToday: Task[];
} => {
  const today = startOfDay(new Date());
  const terminalStatuses: TaskStatus[] = ["done", "cancelled"];

  const overdue: Task[] = [];
  const dueToday: Task[] = [];
  const completedToday: Task[] = [];

  for (const task of tasks) {
    // Check if completed today
    if (task.completed_at) {
      try {
        const completedDate = parseISO(task.completed_at);
        if (isToday(completedDate)) {
          completedToday.push(task);
          continue;
        }
      } catch {
        // invalid date, skip
      }
    }

    // Skip terminal-status tasks for overdue/dueToday
    if (terminalStatuses.includes(task.status)) continue;

    if (task.due_date) {
      try {
        const dueDate = startOfDay(parseISO(task.due_date));
        if (isBefore(dueDate, today)) {
          overdue.push(task);
        } else if (isToday(dueDate)) {
          dueToday.push(task);
        }
      } catch {
        // invalid date, skip
      }
    }
  }

  // Sort overdue by due_date ascending
  overdue.sort((a, b) => (a.due_date || "").localeCompare(b.due_date || ""));

  // Sort dueToday by priority
  const priorityOrder: TaskPriority[] = [
    "urgent",
    "high",
    "medium",
    "low",
    "none",
  ];
  dueToday.sort(
    (a, b) =>
      priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority),
  );

  return { overdue, dueToday, completedToday };
};

export interface UpcomingDayBucket {
  day: Date;
  label: string;
  tasks: Task[];
}

export const categorizeUpcomingTasks = (tasks: Task[]): UpcomingDayBucket[] => {
  const today = startOfDay(new Date());
  const terminalStatuses: TaskStatus[] = ["done", "cancelled"];
  const priorityOrder: TaskPriority[] = [
    "urgent",
    "high",
    "medium",
    "low",
    "none",
  ];

  const buckets: UpcomingDayBucket[] = [];
  for (let i = 0; i < 7; i++) {
    const day = addDays(today, i);
    const label =
      i === 0 ? "Today" : i === 1 ? "Tomorrow" : format(day, "EEEE, MMM d");
    buckets.push({ day, label, tasks: [] });
  }

  for (const task of tasks) {
    if (terminalStatuses.includes(task.status)) continue;
    if (!task.due_date) continue;

    try {
      const dueDate = startOfDay(parseISO(task.due_date));
      if (isBefore(dueDate, today)) continue; // past-due excluded

      const diff = differenceInCalendarDays(dueDate, today);
      if (diff >= 0 && diff < 7) {
        buckets[diff].tasks.push(task);
      }
    } catch {
      // invalid date, skip
    }
  }

  // Sort each day's tasks by priority
  for (const bucket of buckets) {
    bucket.tasks.sort(
      (a, b) =>
        priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority),
    );
  }

  return buckets;
};

export const sortTasks = (
  tasks: Task[],
  field: TaskSortField,
  direction: SortDirection,
): Task[] => {
  const priorityOrder: TaskPriority[] = [
    "urgent",
    "high",
    "medium",
    "low",
    "none",
  ];
  const statusOrder: TaskStatus[] = [
    "inbox",
    "todo",
    "in_progress",
    "waiting",
    "done",
    "cancelled",
  ];

  return [...tasks].sort((a, b) => {
    let cmp = 0;

    switch (field) {
      case "priority":
        cmp =
          priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority);
        break;
      case "status":
        cmp = statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status);
        break;
      case "due_date": {
        // null dates go last regardless of direction
        if (!a.due_date && !b.due_date) cmp = 0;
        else if (!a.due_date) return 1;
        else if (!b.due_date) return -1;
        else cmp = a.due_date.localeCompare(b.due_date);
        break;
      }
      case "created_at":
        cmp = a.created_at.localeCompare(b.created_at);
        break;
      case "title":
        cmp = a.title.localeCompare(b.title);
        break;
    }

    return direction === "asc" ? cmp : -cmp;
  });
};
