"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { TaskStatusSelect } from "./task-status-select";
import { TaskPrioritySelect } from "./task-priority-select";
import { useTask } from "@/hooks/useTasks";
import { useTasksWithSync } from "@/hooks/useTasks";
import { formatDate } from "@/lib/utils";
import { Trash2 } from "lucide-react";
import type { TaskStatus, TaskPriority } from "@/types";

interface TaskDetailSidebarProps {
  taskId: string | null;
  open: boolean;
  onClose: () => void;
}

export function TaskDetailSidebar({
  taskId,
  open,
  onClose,
}: TaskDetailSidebarProps) {
  const task = useTask(taskId);
  const { updateTask, deleteTask } = useTasksWithSync();
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState("");
  const [descriptionValue, setDescriptionValue] = useState("");

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) onClose();
  };

  if (!task) {
    return (
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent side="right" className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Task Not Found</SheetTitle>
            <SheetDescription>
              This task may have been deleted.
            </SheetDescription>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    );
  }

  const handleTitleFocus = () => {
    setEditingTitle(true);
    setTitleValue(task.title);
  };

  const handleTitleBlur = async () => {
    setEditingTitle(false);
    if (titleValue.trim() && titleValue.trim() !== task.title) {
      await updateTask(task.id, { title: titleValue.trim() });
    }
  };

  const handleDescriptionFocus = () => {
    setDescriptionValue(task.description || "");
  };

  const handleDescriptionBlur = async () => {
    const newValue = descriptionValue.trim();
    const oldValue = task.description || "";
    if (newValue !== oldValue) {
      await updateTask(task.id, { description: newValue || undefined });
    }
  };

  const handleStatusChange = async (status: TaskStatus) => {
    await updateTask(task.id, { status });
  };

  const handlePriorityChange = async (priority: TaskPriority) => {
    await updateTask(task.id, { priority });
  };

  const handleDueDateChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value = e.target.value;
    await updateTask(task.id, { due_date: value || null });
  };

  const handleDelete = async () => {
    await deleteTask(task.id);
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="sr-only">Task Details</SheetTitle>
          <SheetDescription className="sr-only">
            Edit task details
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-4">
          {/* Title */}
          <div className="space-y-2">
            <Label>Title</Label>
            {editingTitle ? (
              <Input
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                onBlur={handleTitleBlur}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                }}
                autoFocus
              />
            ) : (
              <p
                className="text-lg font-semibold cursor-pointer hover:bg-muted/50 rounded px-2 py-1 -mx-2"
                onClick={handleTitleFocus}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleTitleFocus();
                }}
              >
                {task.title}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="task-detail-description">Description</Label>
            <Textarea
              id="task-detail-description"
              placeholder="Add a description..."
              defaultValue={task.description || ""}
              onFocus={handleDescriptionFocus}
              onChange={(e) => setDescriptionValue(e.target.value)}
              onBlur={handleDescriptionBlur}
              autoResize
            />
          </div>

          <Separator />

          {/* Status */}
          <div className="space-y-2">
            <Label>Status</Label>
            <TaskStatusSelect
              value={task.status}
              onChange={handleStatusChange}
            />
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label>Priority</Label>
            <TaskPrioritySelect
              value={task.priority}
              onChange={handlePriorityChange}
            />
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label htmlFor="task-detail-due-date">Due Date</Label>
            <Input
              id="task-detail-due-date"
              type="date"
              value={task.due_date || ""}
              onChange={handleDueDateChange}
            />
          </div>

          <Separator />

          {/* Metadata */}
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex justify-between">
              <span>Created</span>
              <span>{formatDate(task.created_at)}</span>
            </div>
            <div className="flex justify-between">
              <span>Updated</span>
              <span>{formatDate(task.updated_at)}</span>
            </div>
            <div className="flex justify-between">
              <span>Source</span>
              <span className="capitalize">{task.source_type}</span>
            </div>
            {task.completed_at && (
              <div className="flex justify-between">
                <span>Completed</span>
                <span>{formatDate(task.completed_at)}</span>
              </div>
            )}
          </div>

          <Separator />

          {/* Delete */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full gap-2">
                <Trash2 className="h-4 w-4" />
                Delete Task
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Task</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete &quot;{task.title}&quot;? This
                  action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </SheetContent>
    </Sheet>
  );
}
