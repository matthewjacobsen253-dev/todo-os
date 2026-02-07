"use client";

import { FolderKanban } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ProjectCard } from "./project-card";
import type { ProjectWithStats } from "@/types";

interface ProjectListProps {
  projects: ProjectWithStats[];
  loading?: boolean;
  onProjectClick: (projectId: string) => void;
}

export function ProjectList({
  projects,
  loading,
  onProjectClick,
}: ProjectListProps) {
  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <FolderKanban className="h-12 w-12 mb-4" />
        <p className="text-sm">No projects yet</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          onClick={() => onProjectClick(project.id)}
        />
      ))}
    </div>
  );
}
