"use client";

import { use, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import {
  TaskList,
  TaskFiltersBar,
  TaskDetailSidebar,
  QuickCaptureDialog,
} from "@/components/tasks";
import { ProjectEditDialog } from "@/components/projects/project-edit-dialog";
import { useProject } from "@/hooks/useProjects";
import { useProjectsWithSync } from "@/hooks/useProjects";
import { useTasksWithSync } from "@/hooks/useTasks";
import { useUI, useUIActions } from "@/store";
import { formatDate } from "@/lib/utils";

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const project = useProject(id);
  const { updateProject, deleteProject } = useProjectsWithSync();
  const {
    tasks,
    filteredTasks,
    filters,
    loading: tasksLoading,
    changeTaskStatus,
    deleteTask,
    setFilter,
    clearFilters,
  } = useTasksWithSync();

  const { taskDetailOpen, selectedTaskId, quickCaptureOpen } = useUI();
  const { openTaskDetail, closeTaskDetail, toggleQuickCapture } =
    useUIActions();
  const [editOpen, setEditOpen] = useState(false);

  // Filter tasks to this project
  const projectTasks = useMemo(() => {
    const source =
      filters && Object.keys(filters).length > 0 ? filteredTasks : tasks;
    return source.filter((t) => t.project_id === id);
  }, [tasks, filteredTasks, filters, id]);

  if (!project) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.push("/projects")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Projects
        </Button>
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <p className="text-sm">Project not found</p>
        </div>
      </div>
    );
  }

  const handleDelete = async () => {
    await deleteProject(project.id);
    router.push("/projects");
  };

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button
        variant="ghost"
        className="gap-2"
        onClick={() => router.push("/projects")}
      >
        <ArrowLeft className="h-4 w-4" />
        Projects
      </Button>

      {/* Project Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span
            className="inline-block w-4 h-4 rounded-full flex-shrink-0"
            style={{ backgroundColor: project.color }}
          />
          <div>
            <h1 className="text-2xl font-bold">{project.name}</h1>
            {project.description && (
              <p className="text-sm text-muted-foreground mt-1">
                {project.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant={project.status === "active" ? "default" : "secondary"}
          >
            {project.status}
          </Badge>
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Project</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete &quot;{project.name}&quot;?
                  Tasks in this project will be unassigned. This action cannot
                  be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Project metadata */}
      <div className="text-xs text-muted-foreground">
        Created {formatDate(project.created_at)} &middot; {projectTasks.length}{" "}
        task{projectTasks.length !== 1 ? "s" : ""}
      </div>

      {/* Filters */}
      <TaskFiltersBar
        filters={filters}
        onFilterChange={setFilter}
        onClear={clearFilters}
      />

      {/* Task List scoped to this project */}
      <TaskList
        tasks={projectTasks}
        loading={tasksLoading}
        emptyMessage="No tasks in this project yet."
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

      {/* Quick Capture with project pre-set */}
      <QuickCaptureDialog
        open={quickCaptureOpen}
        onOpenChange={(open) => {
          if (!open) toggleQuickCapture();
        }}
      />

      {/* Edit Dialog */}
      {editOpen && (
        <ProjectEditDialog
          project={project}
          open={editOpen}
          onOpenChange={setEditOpen}
          onSubmit={(updates) => updateProject(project.id, updates)}
        />
      )}
    </div>
  );
}
