"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, X } from "lucide-react";
import type { TaskFilters, TaskPriority } from "@/types";

interface TaskFiltersBarProps {
  filters: TaskFilters;
  onFilterChange: (filters: Partial<TaskFilters>) => void;
  onClear: () => void;
}

const DEBOUNCE_MS = 300;

export function TaskFiltersBar({
  filters,
  onFilterChange,
  onClear,
}: TaskFiltersBarProps) {
  const [searchInput, setSearchInput] = useState(filters.search || "");

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      onFilterChange({ search: searchInput || undefined });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePriorityChange = useCallback(
    (value: string) => {
      if (value === "all") {
        onFilterChange({ priority: undefined });
      } else {
        onFilterChange({ priority: [value as TaskPriority] });
      }
    },
    [onFilterChange],
  );

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.priority && filters.priority.length > 0) count++;
    if (filters.status && filters.status.length > 0) count++;
    return count;
  }, [filters]);

  const currentPriorityValue =
    filters.priority && filters.priority.length === 1
      ? filters.priority[0]
      : "all";

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search tasks..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="pl-9"
        />
      </div>

      <Select value={currentPriorityValue} onValueChange={handlePriorityChange}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Priority" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All priorities</SelectItem>
          <SelectItem value="urgent">Urgent</SelectItem>
          <SelectItem value="high">High</SelectItem>
          <SelectItem value="medium">Medium</SelectItem>
          <SelectItem value="low">Low</SelectItem>
          <SelectItem value="none">None</SelectItem>
        </SelectContent>
      </Select>

      {activeFilterCount > 0 && (
        <Button variant="ghost" size="sm" onClick={onClear} className="gap-1">
          <X className="h-3 w-3" />
          Clear
          <Badge variant="secondary" className="ml-1 text-xs">
            {activeFilterCount}
          </Badge>
        </Button>
      )}
    </div>
  );
}
