"use client";

import { useState, useMemo, memo, type ReactNode } from "react";
import { Inbox, ChevronDown, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TaskItem } from "./task-item";
import { cn, groupBy, getPriorityColor, getStatusColor } from "@/lib/utils";
import type {
  Task,
  TaskStatus,
  TaskGroupBy,
  Project,
  TaskPriority,
} from "@/types";
import {
  isBefore,
  isToday,
  isTomorrow,
  startOfDay,
  parseISO,
  isThisWeek,
} from "date-fns";

interface TaskListProps {
  tasks: Task[];
  loading?: boolean;
  emptyMessage?: string;
  emptySubMessage?: string;
  emptyIcon?: ReactNode;
  groupByField?: TaskGroupBy;
  projects?: Project[];
  onTaskClick: (taskId: string) => void;
  onTaskStatusChange: (taskId: string, status: TaskStatus) => void;
  onTaskDelete: (taskId: string) => void;
}

interface TaskGroup {
  key: string;
  label: string;
  tasks: Task[];
  colorClass?: string;
  dotColor?: string;
}

const STATUS_LABELS: Record<TaskStatus, string> = {
  inbox: "Inbox",
  todo: "To Do",
  in_progress: "In Progress",
  waiting: "Waiting",
  done: "Done",
  cancelled: "Cancelled",
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  urgent: "Urgent",
  high: "High",
  medium: "Medium",
  low: "Low",
  none: "No Priority",
};

function buildGroups(
  tasks: Task[],
  field: TaskGroupBy,
  projects?: Project[],
): TaskGroup[] {
  if (field === "none") {
    return [{ key: "all", label: "All", tasks }];
  }

  const projectMap = new Map(projects?.map((p) => [p.id, p]) ?? []);

  if (field === "project") {
    const grouped = groupBy(
      tasks.map((t) => ({ ...t, _groupKey: t.project_id || "__none__" })),
      "_groupKey" as keyof (typeof tasks)[0],
    );
    const groups: TaskGroup[] = [];
    // Projects first, then "No project"
    const projectIds = [
      ...new Set(tasks.map((t) => t.project_id).filter(Boolean)),
    ] as string[];
    for (const pid of projectIds) {
      const project = projectMap.get(pid);
      const key = pid;
      const items = grouped[key] || [];
      groups.push({
        key,
        label: project?.name || "Unknown Project",
        tasks: items as unknown as Task[],
        dotColor: project?.color,
      });
    }
    if (grouped["__none__"]) {
      groups.push({
        key: "__none__",
        label: "No Project",
        tasks: grouped["__none__"] as unknown as Task[],
      });
    }
    return groups;
  }

  if (field === "priority") {
    const order: TaskPriority[] = ["urgent", "high", "medium", "low", "none"];
    const grouped = groupBy(
      tasks as unknown as Record<string, unknown>[],
      "priority",
    ) as unknown as Record<string, Task[]>;
    return order
      .filter((p) => grouped[p]?.length)
      .map((p) => ({
        key: p,
        label: PRIORITY_LABELS[p],
        tasks: grouped[p],
        colorClass: getPriorityColor(p),
      }));
  }

  if (field === "status") {
    const order: TaskStatus[] = [
      "inbox",
      "todo",
      "in_progress",
      "waiting",
      "done",
      "cancelled",
    ];
    const grouped = groupBy(
      tasks as unknown as Record<string, unknown>[],
      "status",
    ) as unknown as Record<string, Task[]>;
    return order
      .filter((s) => grouped[s]?.length)
      .map((s) => ({
        key: s,
        label: STATUS_LABELS[s],
        tasks: grouped[s],
        colorClass: getStatusColor(s),
      }));
  }

  if (field === "due_date") {
    const today = startOfDay(new Date());
    const buckets: TaskGroup[] = [
      { key: "overdue", label: "Overdue", tasks: [] },
      { key: "today", label: "Today", tasks: [] },
      { key: "tomorrow", label: "Tomorrow", tasks: [] },
      { key: "this_week", label: "This Week", tasks: [] },
      { key: "later", label: "Later", tasks: [] },
      { key: "no_date", label: "No Date", tasks: [] },
    ];

    for (const task of tasks) {
      if (!task.due_date) {
        buckets[5].tasks.push(task);
        continue;
      }
      try {
        const dueDate = startOfDay(parseISO(task.due_date));
        if (isBefore(dueDate, today)) {
          buckets[0].tasks.push(task);
        } else if (isToday(dueDate)) {
          buckets[1].tasks.push(task);
        } else if (isTomorrow(dueDate)) {
          buckets[2].tasks.push(task);
        } else if (isThisWeek(dueDate)) {
          buckets[3].tasks.push(task);
        } else {
          buckets[4].tasks.push(task);
        }
      } catch {
        buckets[5].tasks.push(task);
      }
    }

    return buckets.filter((b) => b.tasks.length > 0);
  }

  return [{ key: "all", label: "All", tasks }];
}

/**
 * GroupSection component - memoized for performance
 * Renders a collapsible group of tasks
 */
const GroupSection = memo(function GroupSection({
  group,
  projects,
  defaultCollapsed = false,
  onTaskClick,
  onTaskStatusChange,
  onTaskDelete,
}: {
  group: TaskGroup;
  projects?: Project[];
  defaultCollapsed?: boolean;
  onTaskClick: (taskId: string) => void;
  onTaskStatusChange: (taskId: string, status: TaskStatus) => void;
  onTaskDelete: (taskId: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const projectMap = useMemo(
    () => new Map(projects?.map((p) => [p.id, p]) ?? []),
    [projects],
  );

  return (
    <section>
      <Button
        variant="ghost"
        className="flex items-center gap-2 mb-2 px-0 hover:bg-transparent w-full justify-start"
        onClick={() => setCollapsed(!collapsed)}
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4 flex-shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 flex-shrink-0" />
        )}
        {group.dotColor && (
          <span
            className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: group.dotColor }}
          />
        )}
        {group.colorClass && !group.dotColor && (
          <Badge
            variant="secondary"
            className={cn("text-xs", group.colorClass)}
          >
            {group.label}
          </Badge>
        )}
        {!group.colorClass && !group.dotColor && (
          <span className="text-sm font-semibold">{group.label}</span>
        )}
        {group.colorClass && !group.dotColor ? null : (
          <span className="text-sm font-semibold">
            {group.dotColor ? group.label : ""}
          </span>
        )}
        <span className="text-xs text-muted-foreground ml-1">
          ({group.tasks.length})
        </span>
      </Button>
      {!collapsed && (
        <div className="space-y-2 pl-2">
          {group.tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              project={projectMap.get(task.project_id || "")}
              showProject={!group.dotColor} // Don't show project dot when already grouped by project
              onClick={() => onTaskClick(task.id)}
              onStatusChange={(status) => onTaskStatusChange(task.id, status)}
              onDelete={() => onTaskDelete(task.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
});

GroupSection.displayName = "GroupSection";

export function TaskList({
  tasks,
  loading,
  emptyMessage = "No tasks yet",
  emptySubMessage,
  emptyIcon,
  groupByField = "none",
  projects,
  onTaskClick,
  onTaskStatusChange,
  onTaskDelete,
}: TaskListProps) {
  const projectMap = useMemo(
    () => new Map(projects?.map((p) => [p.id, p]) ?? []),
    [projects],
  );

  const groups = useMemo(
    () => buildGroups(tasks, groupByField, projects),
    [tasks, groupByField, projects],
  );

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        {emptyIcon || <Inbox className="h-12 w-12 mb-4" />}
        <p className="text-sm">{emptyMessage}</p>
        {emptySubMessage && <p className="text-xs mt-1">{emptySubMessage}</p>}
      </div>
    );
  }

  // Keyboard navigation handler for flat list
  const handleListKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const focusableItems = Array.from(
      e.currentTarget.querySelectorAll('[role="button"][tabindex="0"]'),
    ) as HTMLElement[];
    const currentIndex = focusableItems.findIndex(
      (el) => el === document.activeElement,
    );

    if (e.key === "ArrowDown") {
      e.preventDefault();
      const nextIndex = Math.min(currentIndex + 1, focusableItems.length - 1);
      focusableItems[nextIndex]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prevIndex = Math.max(currentIndex - 1, 0);
      focusableItems[prevIndex]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      focusableItems[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      focusableItems[focusableItems.length - 1]?.focus();
    }
  };

  // Flat list when no grouping
  if (groupByField === "none") {
    return (
      <div
        className="space-y-2"
        role="list"
        aria-label="Task list"
        onKeyDown={handleListKeyDown}
      >
        {tasks.map((task) => (
          <div key={task.id} role="listitem">
            <TaskItem
              task={task}
              project={projectMap.get(task.project_id || "")}
              onClick={() => onTaskClick(task.id)}
              onStatusChange={(status) => onTaskStatusChange(task.id, status)}
              onDelete={() => onTaskDelete(task.id)}
            />
          </div>
        ))}
      </div>
    );
  }

  // Grouped list
  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <GroupSection
          key={group.key}
          group={group}
          projects={projects}
          onTaskClick={onTaskClick}
          onTaskStatusChange={onTaskStatusChange}
          onTaskDelete={onTaskDelete}
        />
      ))}
    </div>
  );
}
