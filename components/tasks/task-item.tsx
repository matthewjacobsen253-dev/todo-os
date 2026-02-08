"use client";

import { useState, useRef, useCallback } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  cn,
  getPriorityColor,
  getStatusColor,
  formatRelativeDate,
  truncate,
} from "@/lib/utils";
import type { Task, TaskStatus, Project } from "@/types";

interface TaskItemProps {
  task: Task;
  project?: Project | null;
  showProject?: boolean;
  onClick?: () => void;
  onStatusChange?: (status: TaskStatus) => void;
  onDelete?: () => void;
}

export function TaskItem({
  task,
  project,
  showProject = true,
  onClick,
  onStatusChange,
}: TaskItemProps) {
  const isDone = task.status === "done";
  const [completing, setCompleting] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  const handleCheckboxChange = useCallback(
    (checked: boolean | "indeterminate") => {
      if (!onStatusChange) return;

      if (checked === true) {
        setCompleting(true);
        timeoutRef.current = setTimeout(() => {
          onStatusChange("done");
          setCompleting(false);
        }, 300);
      } else {
        onStatusChange("inbox");
      }
    },
    [onStatusChange],
  );

  const showStatusBadge = task.status !== "inbox";

  return (
    <div
      className={cn(
        "group flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-all hover:bg-muted/50 cursor-pointer",
        isDone && "opacity-60",
        completing && "scale-[1.02] border-green-400 dark:border-green-600",
      )}
      style={{
        transitionDuration: "200ms",
      }}
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
          checked={isDone || completing}
          onCheckedChange={handleCheckboxChange}
          aria-label={`Mark "${task.title}" as ${isDone ? "incomplete" : "complete"}`}
          className={cn(completing && "text-green-500 border-green-500")}
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
        {showProject && project && (
          <div className="flex items-center gap-1.5 mt-1">
            <span
              className="inline-block w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: project.color }}
              data-testid="project-dot"
            />
            <span className="text-xs text-muted-foreground">
              {project.name}
            </span>
          </div>
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

      {showStatusBadge && (
        <Badge
          variant="secondary"
          className={cn(
            "text-xs capitalize flex-shrink-0",
            getStatusColor(task.status),
          )}
        >
          {task.status.replace("_", " ")}
        </Badge>
      )}
    </div>
  );
}
