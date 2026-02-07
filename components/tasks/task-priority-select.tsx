"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, getPriorityColor } from "@/lib/utils";
import type { TaskPriority } from "@/types";

const priorities: { value: TaskPriority; label: string }[] = [
  { value: "urgent", label: "Urgent" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
  { value: "none", label: "None" },
];

interface TaskPrioritySelectProps {
  value: TaskPriority;
  onChange: (priority: TaskPriority) => void;
  disabled?: boolean;
}

export function TaskPrioritySelect({
  value,
  onChange,
  disabled,
}: TaskPrioritySelectProps) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-[140px]">
        <SelectValue>
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
              getPriorityColor(value),
            )}
          >
            {priorities.find((p) => p.value === value)?.label}
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {priorities.map((priority) => (
          <SelectItem key={priority.value} value={priority.value}>
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                getPriorityColor(priority.value),
              )}
            >
              {priority.label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
