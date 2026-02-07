"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjectList, ProjectCreateDialog } from "@/components/projects";
import { useProjectsWithSync } from "@/hooks/useProjects";
import type { ProjectWithStats } from "@/types";

export default function ProjectsPage() {
  const router = useRouter();
  const { projects, loading, createProject } = useProjectsWithSync();
  const [createOpen, setCreateOpen] = useState(false);

  // Cast projects for display (task counts come from API, store has basic Project)
  const projectsWithStats: ProjectWithStats[] = projects.map((p) => ({
    ...p,
    task_count: (p as ProjectWithStats).task_count || 0,
    completed_count: (p as ProjectWithStats).completed_count || 0,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-sm text-muted-foreground">
            {projects.length} project{projects.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </div>

      {/* Project List */}
      <ProjectList
        projects={projectsWithStats}
        loading={loading}
        onProjectClick={(id) => router.push(`/projects/${id}`)}
      />

      {/* Create Dialog */}
      <ProjectCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={createProject}
      />
    </div>
  );
}
