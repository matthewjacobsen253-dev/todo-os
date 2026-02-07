"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TaskCreateForm } from "./task-create-form";
import { useTasksWithSync } from "@/hooks/useTasks";
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
        </DialogHeader>
        <TaskCreateForm
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
