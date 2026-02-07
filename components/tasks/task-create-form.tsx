"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { TaskPrioritySelect } from "./task-priority-select";
import { ProjectSelect } from "@/components/projects/project-select";
import type { CreateTaskInput, TaskPriority, Project } from "@/types";

interface TaskCreateFormProps {
  onSubmit: (input: CreateTaskInput) => Promise<void>;
  onCancel?: () => void;
  projects?: Project[];
  defaultProjectId?: string | null;
}

export function TaskCreateForm({
  onSubmit,
  onCancel,
  projects,
  defaultProjectId,
}: TaskCreateFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("none");
  const [dueDate, setDueDate] = useState("");
  const [projectId, setProjectId] = useState<string | null>(
    defaultProjectId ?? null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        due_date: dueDate || null,
        project_id: projectId,
      });
      // Reset form on success
      setTitle("");
      setDescription("");
      setPriority("none");
      setDueDate("");
      setProjectId(defaultProjectId ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create task");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="task-title">Title</Label>
        <Input
          id="task-title"
          placeholder="What needs to be done?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="task-description">Description</Label>
        <Textarea
          id="task-description"
          placeholder="Add details..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          autoResize
        />
      </div>

      <div className="flex items-center gap-4">
        <div className="space-y-2">
          <Label>Priority</Label>
          <TaskPrioritySelect value={priority} onChange={setPriority} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="task-due-date">Due Date</Label>
          <Input
            id="task-due-date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Project</Label>
        <ProjectSelect
          projects={projects || []}
          value={projectId}
          onChange={setProjectId}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={loading}>
          {loading ? "Creating..." : "Create Task"}
        </Button>
      </div>
    </form>
  );
}
