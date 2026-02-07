"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, getStatusColor } from "@/lib/utils";
import type { TaskStatus } from "@/types";

const statuses: { value: TaskStatus; label: string }[] = [
  { value: "inbox", label: "Inbox" },
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "waiting", label: "Waiting" },
  { value: "done", label: "Done" },
  { value: "cancelled", label: "Cancelled" },
];

interface TaskStatusSelectProps {
  value: TaskStatus;
  onChange: (status: TaskStatus) => void;
  disabled?: boolean;
}

export function TaskStatusSelect({
  value,
  onChange,
  disabled,
}: TaskStatusSelectProps) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-[160px]">
        <SelectValue>
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
              getStatusColor(value),
            )}
          >
            {statuses.find((s) => s.value === value)?.label}
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {statuses.map((status) => (
          <SelectItem key={status.value} value={status.value}>
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                getStatusColor(status.value),
              )}
            >
              {status.label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
