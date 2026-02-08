"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TaskList } from "@/components/tasks";
import { TaskDetailSidebar } from "@/components/tasks/task-detail-sidebar";
import { useTasksWithSync } from "@/hooks/useTasks";
import { useUI, useUIActions } from "@/store";
import { categorizeTodayTasks, cn } from "@/lib/utils";

const MOTIVATIONAL_MESSAGES = [
  "Enjoy the extra headroom!",
  "A clear day is a productive day.",
  "Time for deep work or a well-deserved break.",
  "No fires to fight today.",
  "Your future self thanks you.",
];

export default function TodayPage() {
  const { tasks, loading, changeTaskStatus, deleteTask } = useTasksWithSync();
  const { taskDetailOpen, selectedTaskId } = useUI();
  const { openTaskDetail, closeTaskDetail } = useUIActions();
  const [completedCollapsed, setCompletedCollapsed] = useState(false);

  const { overdue, dueToday, completedToday } = categorizeTodayTasks(tasks);
  const totalCount = overdue.length + dueToday.length;
  const todayDate = format(new Date(), "EEEE, MMMM d");

  const isEmpty =
    !loading &&
    overdue.length === 0 &&
    dueToday.length === 0 &&
    completedToday.length === 0;

  // Progress bar calculations
  const totalTodayTasks = totalCount + completedToday.length;
  const doneCount = completedToday.length;
  const progressPct =
    totalTodayTasks > 0 ? (doneCount / totalTodayTasks) * 100 : 0;
  const progressColor =
    progressPct >= 100
      ? "bg-green-500"
      : progressPct >= 50
        ? "bg-blue-500"
        : "bg-amber-500";

  const motivationalMsg = useMemo(() => {
    const idx = new Date().getDate() % MOTIVATIONAL_MESSAGES.length;
    return MOTIVATIONAL_MESSAGES[idx];
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Today</h1>
        <p className="text-sm text-muted-foreground">
          {todayDate}
          {totalCount > 0 && (
            <span>
              {" "}
              &middot; {totalCount} task{totalCount !== 1 ? "s" : ""}
            </span>
          )}
        </p>
      </div>

      {/* Progress bar */}
      {totalTodayTasks > 0 && (
        <div className="space-y-1.5" data-testid="progress-bar">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {doneCount}/{totalTodayTasks} done
            </span>
            <span>{Math.round(progressPct)}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                progressColor,
              )}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {isEmpty && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <CircleCheck className="h-12 w-12 mb-4 text-green-500" />
          <p className="text-lg font-medium text-foreground">
            You&apos;re all caught up!
          </p>
          <p className="text-sm">No tasks due today or overdue.</p>
          <p className="text-xs mt-1">{motivationalMsg}</p>
        </div>
      )}

      {/* Overdue Section */}
      {overdue.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <h2 className="text-sm font-semibold text-red-600 dark:text-red-400">
              Overdue
            </h2>
            <span className="text-xs text-muted-foreground">
              ({overdue.length})
            </span>
          </div>
          <div className="border-l-2 border-red-300 dark:border-red-800 pl-4">
            <TaskList
              tasks={overdue}
              loading={false}
              onTaskClick={openTaskDetail}
              onTaskStatusChange={changeTaskStatus}
              onTaskDelete={deleteTask}
            />
          </div>
        </section>
      )}

      {/* Due Today Section */}
      {dueToday.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="h-4 w-4 text-blue-500" />
            <h2 className="text-sm font-semibold text-blue-600 dark:text-blue-400">
              Due Today
            </h2>
            <span className="text-xs text-muted-foreground">
              ({dueToday.length})
            </span>
          </div>
          <div className="border-l-2 border-blue-300 dark:border-blue-800 pl-4">
            <TaskList
              tasks={dueToday}
              loading={false}
              onTaskClick={openTaskDetail}
              onTaskStatusChange={changeTaskStatus}
              onTaskDelete={deleteTask}
            />
          </div>
        </section>
      )}

      {/* Completed Today Section */}
      {completedToday.length > 0 && (
        <section>
          <Button
            variant="ghost"
            className="flex items-center gap-2 mb-3 px-0 hover:bg-transparent"
            onClick={() => setCompletedCollapsed(!completedCollapsed)}
          >
            {completedCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <h2 className="text-sm font-semibold text-green-600 dark:text-green-400">
              Completed Today
            </h2>
            <span className="text-xs text-muted-foreground">
              ({completedToday.length})
            </span>
          </Button>
          {!completedCollapsed && (
            <div className="border-l-2 border-green-300 dark:border-green-800 pl-4">
              <TaskList
                tasks={completedToday}
                loading={false}
                onTaskClick={openTaskDetail}
                onTaskStatusChange={changeTaskStatus}
                onTaskDelete={deleteTask}
              />
            </div>
          )}
        </section>
      )}

      {/* Loading state */}
      {loading && (
        <TaskList
          tasks={[]}
          loading={true}
          onTaskClick={openTaskDetail}
          onTaskStatusChange={changeTaskStatus}
          onTaskDelete={deleteTask}
        />
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
