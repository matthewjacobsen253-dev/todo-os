"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ReviewQueueItem, TaskPriority } from "@/types";

interface ReviewEditDialogProps {
  item: ReviewQueueItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (edits: Record<string, unknown>) => void;
}

export function ReviewEditDialog({
  item,
  open,
  onOpenChange,
  onSave,
}: ReviewEditDialogProps) {
  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description || "");
  const [priority, setPriority] = useState<TaskPriority>(item.priority);
  const [dueDate, setDueDate] = useState(
    item.due_date ? item.due_date.split("T")[0] : "",
  );

  const handleSave = () => {
    const edits: Record<string, unknown> = {};

    if (title !== item.title) edits.title = title;
    if (description !== (item.description || ""))
      edits.description = description || null;
    if (priority !== item.priority) edits.priority = priority;
    if (dueDate !== (item.due_date ? item.due_date.split("T")[0] : ""))
      edits.due_date = dueDate || null;

    onSave(edits);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit & Approve Task</DialogTitle>
          <DialogDescription>
            Edit the task details before approving.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Title</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={priority}
                onValueChange={(v) => setPriority(v as TaskPriority)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-due-date">Due Date</Label>
              <Input
                id="edit-due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!title.trim()}>
            Approve with Edits
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
