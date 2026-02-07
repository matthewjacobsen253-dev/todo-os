"use client";

import type { ReactNode } from "react";
import { Inbox } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { TaskItem } from "./task-item";
import type { Task, TaskStatus } from "@/types";

interface TaskListProps {
  tasks: Task[];
  loading?: boolean;
  emptyMessage?: string;
  emptyIcon?: ReactNode;
  onTaskClick: (taskId: string) => void;
  onTaskStatusChange: (taskId: string, status: TaskStatus) => void;
  onTaskDelete: (taskId: string) => void;
}

export function TaskList({
  tasks,
  loading,
  emptyMessage = "No tasks yet",
  emptyIcon,
  onTaskClick,
  onTaskStatusChange,
  onTaskDelete,
}: TaskListProps) {
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
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          onClick={() => onTaskClick(task.id)}
          onStatusChange={(status) => onTaskStatusChange(task.id, status)}
          onDelete={() => onTaskDelete(task.id)}
        />
      ))}
    </div>
  );
}
