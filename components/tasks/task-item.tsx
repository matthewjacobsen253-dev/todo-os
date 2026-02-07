"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  cn,
  getPriorityColor,
  getStatusColor,
  formatRelativeDate,
  truncate,
} from "@/lib/utils";
import type { Task, TaskStatus } from "@/types";

interface TaskItemProps {
  task: Task;
  onClick?: () => void;
  onStatusChange?: (status: TaskStatus) => void;
  onDelete?: () => void;
}

export function TaskItem({ task, onClick, onStatusChange }: TaskItemProps) {
  const isDone = task.status === "done";

  const handleCheckboxChange = (checked: boolean | "indeterminate") => {
    if (!onStatusChange) return;
    onStatusChange(checked === true ? "done" : "inbox");
  };

  return (
    <div
      className={cn(
        "group flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-muted/50 cursor-pointer",
        isDone && "opacity-60",
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`Open task: ${task.title}`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <Checkbox
          checked={isDone}
          onCheckedChange={handleCheckboxChange}
          aria-label={`Mark "${task.title}" as ${isDone ? "incomplete" : "complete"}`}
        />
      </div>

      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm font-medium text-foreground line-clamp-1",
            isDone && "line-through text-muted-foreground",
          )}
        >
          {task.title}
        </p>
        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
            {truncate(task.description, 80)}
          </p>
        )}
      </div>

      {task.priority !== "none" && (
        <Badge
          variant="secondary"
          className={cn(
            "text-xs capitalize flex-shrink-0",
            getPriorityColor(task.priority),
          )}
        >
          {task.priority}
        </Badge>
      )}

      {task.due_date && (
        <span className="text-xs text-muted-foreground flex-shrink-0">
          {formatRelativeDate(task.due_date)}
        </span>
      )}

      <Badge
        variant="secondary"
        className={cn(
          "text-xs capitalize flex-shrink-0",
          getStatusColor(task.status),
        )}
      >
        {task.status.replace("_", " ")}
      </Badge>
    </div>
  );
}
