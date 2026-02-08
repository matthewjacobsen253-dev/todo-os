"use client";

import { useState, useMemo } from "react";
import {
  CalendarDays,
  CalendarCheck,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TaskItem } from "@/components/tasks/task-item";
import { TaskDetailSidebar } from "@/components/tasks/task-detail-sidebar";
import { useTasksWithSync } from "@/hooks/useTasks";
import { useProjectsWithSync } from "@/hooks/useProjects";
import { useUI, useUIActions } from "@/store";
import { categorizeUpcomingTasks } from "@/lib/utils";
import type { UpcomingDayBucket } from "@/lib/utils";
import type { Project, TaskStatus } from "@/types";

function DaySection({
  bucket,
  index,
  projectMap,
  onTaskClick,
  onStatusChange,
}: {
  bucket: UpcomingDayBucket;
  index: number;
  projectMap: Map<string, Project>;
  onTaskClick: (id: string) => void;
  onStatusChange: (id: string, status: TaskStatus) => void;
}) {
  const [collapsed, setCollapsed] = useState(bucket.tasks.length === 0);
  // Gradient: darker blue for sooner days
  const borderOpacity = Math.max(0.3, 1 - index * 0.1);

  return (
    <section>
      <Button
        variant="ghost"
        className="flex items-center gap-2 mb-2 px-0 hover:bg-transparent w-full justify-start"
        onClick={() => setCollapsed(!collapsed)}
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4 flex-shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 flex-shrink-0" />
        )}
        <CalendarDays className="h-4 w-4 text-blue-500 flex-shrink-0" />
        <span className="text-sm font-semibold">{bucket.label}</span>
        <span className="text-xs text-muted-foreground">
          ({bucket.tasks.length})
        </span>
      </Button>
      {!collapsed && (
        <div
          className="pl-4"
          style={{
            borderLeft: `2px solid rgba(59, 130, 246, ${borderOpacity})`,
          }}
        >
          {bucket.tasks.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">
              Nothing scheduled
            </p>
          ) : (
            <div className="space-y-2">
              {bucket.tasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  project={projectMap.get(task.project_id || "")}
                  onClick={() => onTaskClick(task.id)}
                  onStatusChange={(status) => onStatusChange(task.id, status)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default function UpcomingPage() {
  const { tasks, loading, changeTaskStatus, deleteTask } = useTasksWithSync();
  const { projects } = useProjectsWithSync();
  const { taskDetailOpen, selectedTaskId } = useUI();
  const { openTaskDetail, closeTaskDetail } = useUIActions();

  const projectMap = useMemo(
    () => new Map(projects.map((p) => [p.id, p])),
    [projects],
  );

  const buckets = useMemo(() => categorizeUpcomingTasks(tasks), [tasks]);

  const totalUpcoming = useMemo(
    () => buckets.reduce((sum, b) => sum + b.tasks.length, 0),
    [buckets],
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Upcoming</h1>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Upcoming</h1>
        <p className="text-sm text-muted-foreground">
          {totalUpcoming} task{totalUpcoming !== 1 ? "s" : ""} this week
        </p>
      </div>

      {/* Empty state */}
      {totalUpcoming === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <CalendarCheck className="h-12 w-12 mb-4 text-green-500" />
          <p className="text-lg font-medium text-foreground">
            Your week is clear!
          </p>
          <p className="text-sm">No tasks scheduled for the next 7 days.</p>
        </div>
      )}

      {/* Day sections */}
      {totalUpcoming > 0 &&
        buckets.map((bucket, i) => (
          <DaySection
            key={bucket.label}
            bucket={bucket}
            index={i}
            projectMap={projectMap}
            onTaskClick={openTaskDetail}
            onStatusChange={changeTaskStatus}
          />
        ))}

      {/* Task Detail Sidebar */}
      <TaskDetailSidebar
        taskId={selectedTaskId}
        open={taskDetailOpen}
        onClose={closeTaskDetail}
      />
    </div>
  );
}
