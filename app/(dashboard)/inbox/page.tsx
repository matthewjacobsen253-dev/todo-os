"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  TaskList,
  TaskFiltersBar,
  TaskDetailSidebar,
  QuickCaptureDialog,
} from "@/components/tasks";
import { useTasksWithSync } from "@/hooks/useTasks";
import { useUI, useUIActions } from "@/store";

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

  const { taskDetailOpen, selectedTaskId, quickCaptureOpen } = useUI();
  const { openTaskDetail, closeTaskDetail, toggleQuickCapture } =
    useUIActions();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inbox</h1>
          <p className="text-sm text-muted-foreground">
            {filteredTasks.length} task{filteredTasks.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={toggleQuickCapture} className="gap-2">
          <Plus className="h-4 w-4" />
          New Task
        </Button>
      </div>

      {/* Filters */}
      <TaskFiltersBar
        filters={filters}
        onFilterChange={setFilter}
        onClear={clearFilters}
      />

      {/* Task List */}
      <TaskList
        tasks={filteredTasks}
        loading={loading}
        emptyMessage="No tasks yet. Create one to get started!"
        onTaskClick={openTaskDetail}
        onTaskStatusChange={changeTaskStatus}
        onTaskDelete={deleteTask}
      />

      {/* Task Detail Sidebar */}
      <TaskDetailSidebar
        taskId={selectedTaskId}
        open={taskDetailOpen}
        onClose={closeTaskDetail}
      />

      {/* Quick Capture Dialog */}
      <QuickCaptureDialog
        open={quickCaptureOpen}
        onOpenChange={(open) => {
          if (!open) toggleQuickCapture();
        }}
      />
    </div>
  );
}
