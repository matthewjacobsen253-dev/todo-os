"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TaskCreateForm } from "./task-create-form";
import { useTasksWithSync } from "@/hooks/useTasks";
import { useProjectsWithSync } from "@/hooks/useProjects";
import { useCurrentWorkspace } from "@/store";
import type { CreateTaskInput } from "@/types";

interface QuickCaptureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickCaptureDialog({
  open,
  onOpenChange,
}: QuickCaptureDialogProps) {
  const { createTask } = useTasksWithSync();
  const { projects } = useProjectsWithSync();
  const currentWorkspace = useCurrentWorkspace();

  const handleSubmit = async (input: CreateTaskInput) => {
    if (!currentWorkspace?.id) {
      throw new Error("No workspace selected");
    }
    await createTask(input);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Quick Capture</DialogTitle>
          <DialogDescription>
            Quickly add a new task to your inbox
          </DialogDescription>
        </DialogHeader>
        <TaskCreateForm
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          projects={projects}
        />
      </DialogContent>
    </Dialog>
  );
}
