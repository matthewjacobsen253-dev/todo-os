"use client";

import { useState, useMemo } from "react";
import { Inbox, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  TaskList,
  TaskFiltersBar,
  TaskDetailSidebar,
} from "@/components/tasks";
import {
  QuickFiltersBar,
  applyQuickFilter,
  type QuickFilter,
} from "@/components/tasks/quick-filters-bar";
import { useTasksWithSync } from "@/hooks/useTasks";
import { useProjectsWithSync } from "@/hooks/useProjects";
import { useUI, useUIActions } from "@/store";
import { sortTasks } from "@/lib/utils";
import { ProgressStatsCompact } from "@/components/dashboard/progress-stats";
import type { TaskSortField, SortDirection, TaskGroupBy } from "@/types";

export default function InboxPage() {
  const {
    filteredTasks,
    filters,
    loading,
    changeTaskStatus,
    deleteTask,
    setFilter,
    clearFilters,
  } = useTasksWithSync();

  const { projects } = useProjectsWithSync();
  const { taskDetailOpen, selectedTaskId } = useUI();
  const { openTaskDetail, closeTaskDetail, toggleQuickCapture } =
    useUIActions();

  const [sortField, setSortField] = useState<TaskSortField | undefined>(
    undefined,
  );
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [groupBy, setGroupBy] = useState<TaskGroupBy>("none");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");

  // Apply quick filter first, then apply store filters
  const quickFilteredTasks = useMemo(() => {
    return applyQuickFilter(filteredTasks, quickFilter);
  }, [filteredTasks, quickFilter]);

  const sortedTasks = useMemo(() => {
    if (!sortField) return quickFilteredTasks;
    return sortTasks(quickFilteredTasks, sortField, sortDirection);
  }, [quickFilteredTasks, sortField, sortDirection]);

  const handleSortChange = (field: TaskSortField, dir: SortDirection) => {
    setSortField(field);
    setSortDirection(dir);
  };

  const handleClearFilters = () => {
    clearFilters();
    setSortField(undefined);
    setSortDirection("asc");
    setGroupBy("none");
    setQuickFilter("all");
  };

  const hasActiveFilters =
    (filters.search && filters.search.length > 0) ||
    (filters.priority && filters.priority.length > 0) ||
    (filters.status && filters.status.length > 0) ||
    filters.project ||
    quickFilter !== "all";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inbox</h1>
          <p className="text-sm text-muted-foreground">
            {sortedTasks.length} task{sortedTasks.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={toggleQuickCapture} className="gap-2">
          <Plus className="h-4 w-4" />
          New Task
        </Button>
      </div>

      {/* Progress Stats */}
      <ProgressStatsCompact />

      {/* Quick Filters */}
      <QuickFiltersBar
        tasks={filteredTasks}
        activeFilter={quickFilter}
        onFilterChange={setQuickFilter}
      />

      {/* Advanced Filters */}
      <TaskFiltersBar
        filters={filters}
        onFilterChange={setFilter}
        onClear={handleClearFilters}
        projects={projects}
        sortField={sortField}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
        groupBy={groupBy}
        onGroupByChange={setGroupBy}
      />

      {/* Task List */}
      <TaskList
        tasks={sortedTasks}
        loading={loading}
        groupByField={groupBy}
        projects={projects}
        emptyMessage={
          hasActiveFilters
            ? "No tasks match your filters"
            : "No tasks yet. Create your first task!"
        }
        emptySubMessage={
          hasActiveFilters ? undefined : 'Click "New Task" to get started.'
        }
        emptyIcon={
          hasActiveFilters ? undefined : (
            <Inbox className="h-12 w-12 mb-4 text-blue-500" />
          )
        }
        onTaskClick={openTaskDetail}
        onTaskStatusChange={changeTaskStatus}
        onTaskDelete={deleteTask}
      />

      {/* Clear filters shortcut in empty filtered state */}
      {!loading && sortedTasks.length === 0 && hasActiveFilters && (
        <div className="flex justify-center">
          <Button variant="outline" size="sm" onClick={handleClearFilters}>
            Clear all filters
          </Button>
        </div>
      )}

      {/* Task Detail Sidebar */}
      <TaskDetailSidebar
        taskId={selectedTaskId}
        open={taskDetailOpen}
        onClose={closeTaskDetail}
      />
    </div>
  );
}
