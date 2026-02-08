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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Search, X, SlidersHorizontal } from "lucide-react";
import type {
  TaskFilters,
  TaskPriority,
  TaskStatus,
  TaskSortField,
  SortDirection,
  TaskGroupBy,
  Project,
} from "@/types";

interface TaskFiltersBarProps {
  filters: TaskFilters;
  onFilterChange: (filters: Partial<TaskFilters>) => void;
  onClear: () => void;
  projects?: Project[];
  sortField?: TaskSortField;
  sortDirection?: SortDirection;
  onSortChange?: (field: TaskSortField, dir: SortDirection) => void;
  groupBy?: TaskGroupBy;
  onGroupByChange?: (groupBy: TaskGroupBy) => void;
}

const DEBOUNCE_MS = 300;

const ALL_STATUSES: { value: TaskStatus; label: string }[] = [
  { value: "inbox", label: "Inbox" },
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "waiting", label: "Waiting" },
  { value: "done", label: "Done" },
  { value: "cancelled", label: "Cancelled" },
];

type SortOption = {
  label: string;
  field: TaskSortField;
  direction: SortDirection;
};

const SORT_OPTIONS: SortOption[] = [
  { label: "Priority (High first)", field: "priority", direction: "asc" },
  { label: "Priority (Low first)", field: "priority", direction: "desc" },
  { label: "Due Date (Soonest)", field: "due_date", direction: "asc" },
  { label: "Due Date (Latest)", field: "due_date", direction: "desc" },
  { label: "Newest", field: "created_at", direction: "desc" },
  { label: "Oldest", field: "created_at", direction: "asc" },
  { label: "Title A-Z", field: "title", direction: "asc" },
];

export function TaskFiltersBar({
  filters,
  onFilterChange,
  onClear,
  projects,
  sortField,
  sortDirection,
  onSortChange,
  groupBy,
  onGroupByChange,
}: TaskFiltersBarProps) {
  const [searchInput, setSearchInput] = useState(filters.search || "");
  const [showMore, setShowMore] = useState(false);

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

  const handleStatusToggle = useCallback(
    (status: TaskStatus, checked: boolean) => {
      const current = filters.status || [];
      const updated = checked
        ? [...current, status]
        : current.filter((s) => s !== status);
      onFilterChange({ status: updated.length > 0 ? updated : undefined });
    },
    [filters.status, onFilterChange],
  );

  const handleProjectChange = useCallback(
    (value: string) => {
      onFilterChange({ project: value === "all" ? undefined : value });
    },
    [onFilterChange],
  );

  const handleSortChange = useCallback(
    (value: string) => {
      if (value === "default" || !onSortChange) return;
      const option = SORT_OPTIONS.find(
        (o) => `${o.field}-${o.direction}` === value,
      );
      if (option) {
        onSortChange(option.field, option.direction);
      }
    },
    [onSortChange],
  );

  const handleGroupByChange = useCallback(
    (value: string) => {
      onGroupByChange?.(value as TaskGroupBy);
    },
    [onGroupByChange],
  );

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.priority && filters.priority.length > 0) count++;
    if (filters.status && filters.status.length > 0) count++;
    if (filters.project) count++;
    return count;
  }, [filters]);

  const currentPriorityValue =
    filters.priority && filters.priority.length === 1
      ? filters.priority[0]
      : "all";

  const currentSortValue =
    sortField && sortDirection ? `${sortField}-${sortDirection}` : "default";

  const statusCount = filters.status?.length || 0;
  const hasAdvancedControls = projects || onSortChange || onGroupByChange;

  return (
    <div className="space-y-3">
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

        <Select
          value={currentPriorityValue}
          onValueChange={handlePriorityChange}
        >
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

        {hasAdvancedControls && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowMore(!showMore)}
            className="gap-1.5"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            More filters
          </Button>
        )}

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

      {showMore && (
        <div className="flex items-center gap-3 flex-wrap pl-1">
          {/* Status multi-select */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                Status
                {statusCount > 0 && (
                  <Badge variant="secondary" className="text-xs ml-1">
                    {statusCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-3" align="start">
              <div className="space-y-2">
                {ALL_STATUSES.map((s) => (
                  <label
                    key={s.value}
                    className="flex items-center gap-2 cursor-pointer text-sm"
                  >
                    <Checkbox
                      checked={filters.status?.includes(s.value) || false}
                      onCheckedChange={(checked) =>
                        handleStatusToggle(s.value, checked === true)
                      }
                    />
                    {s.label}
                  </label>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Project filter */}
          {projects && projects.length > 0 && (
            <Select
              value={filters.project || "all"}
              onValueChange={handleProjectChange}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All projects</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: p.color }}
                      />
                      {p.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Sort control */}
          {onSortChange && (
            <Select value={currentSortValue} onValueChange={handleSortChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default</SelectItem>
                {SORT_OPTIONS.map((o) => (
                  <SelectItem
                    key={`${o.field}-${o.direction}`}
                    value={`${o.field}-${o.direction}`}
                  >
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Group By control */}
          {onGroupByChange && (
            <Select
              value={groupBy || "none"}
              onValueChange={handleGroupByChange}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Group by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No grouping</SelectItem>
                <SelectItem value="project">By Project</SelectItem>
                <SelectItem value="priority">By Priority</SelectItem>
                <SelectItem value="status">By Status</SelectItem>
                <SelectItem value="due_date">By Due Date</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      )}
    </div>
  );
}
