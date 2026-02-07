import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProjectList } from "@/components/projects/project-list";
import type { ProjectWithStats } from "@/types";

const mockProjects: ProjectWithStats[] = [
  {
    id: "proj-1",
    workspace_id: "ws-1",
    name: "Project Alpha",
    color: "#6366f1",
    icon: "folder",
    description: "First project",
    status: "active",
    created_at: "2026-02-01T00:00:00Z",
    task_count: 5,
    completed_count: 2,
  },
  {
    id: "proj-2",
    workspace_id: "ws-1",
    name: "Project Beta",
    color: "#ec4899",
    icon: "folder",
    description: null,
    status: "active",
    created_at: "2026-02-02T00:00:00Z",
    task_count: 0,
    completed_count: 0,
  },
];

describe("ProjectList", () => {
  it("renders loading skeletons", () => {
    const { container } = render(
      <ProjectList projects={[]} loading={true} onProjectClick={vi.fn()} />,
    );
    // Skeletons should be present
    const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders empty state when no projects", () => {
    render(
      <ProjectList projects={[]} loading={false} onProjectClick={vi.fn()} />,
    );
    expect(screen.getByText("No projects yet")).toBeInTheDocument();
  });

  it("renders project cards", () => {
    render(
      <ProjectList
        projects={mockProjects}
        loading={false}
        onProjectClick={vi.fn()}
      />,
    );
    expect(screen.getByText("Project Alpha")).toBeInTheDocument();
    expect(screen.getByText("Project Beta")).toBeInTheDocument();
  });

  it("calls onProjectClick when a project card is clicked", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <ProjectList
        projects={mockProjects}
        loading={false}
        onProjectClick={onClick}
      />,
    );

    await user.click(screen.getByText("Project Alpha"));
    expect(onClick).toHaveBeenCalledWith("proj-1");
  });
});
