import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProjectCard } from "@/components/projects/project-card";
import type { ProjectWithStats } from "@/types";

const mockProject: ProjectWithStats = {
  id: "proj-1",
  workspace_id: "ws-1",
  name: "Test Project",
  color: "#6366f1",
  icon: "folder",
  description: "A test project description",
  status: "active",
  created_at: "2026-02-01T00:00:00Z",
  task_count: 10,
  completed_count: 3,
};

describe("ProjectCard", () => {
  it("renders project name and description", () => {
    render(<ProjectCard project={mockProject} />);
    expect(screen.getByText("Test Project")).toBeInTheDocument();
    expect(screen.getByText("A test project description")).toBeInTheDocument();
  });

  it("renders task count and progress", () => {
    render(<ProjectCard project={mockProject} />);
    expect(screen.getByText("10 tasks")).toBeInTheDocument();
    expect(screen.getByText("30% complete")).toBeInTheDocument();
  });

  it("renders status badge", () => {
    render(<ProjectCard project={mockProject} />);
    expect(screen.getByText("active")).toBeInTheDocument();
  });

  it("renders archived badge for archived projects", () => {
    render(<ProjectCard project={{ ...mockProject, status: "archived" }} />);
    expect(screen.getByText("archived")).toBeInTheDocument();
  });

  it("fires onClick when clicked", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<ProjectCard project={mockProject} onClick={onClick} />);

    await user.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("shows 0% for projects with no tasks", () => {
    render(
      <ProjectCard
        project={{ ...mockProject, task_count: 0, completed_count: 0 }}
      />,
    );
    expect(screen.getByText("0% complete")).toBeInTheDocument();
    expect(screen.getByText("0 tasks")).toBeInTheDocument();
  });

  it("handles singular task count", () => {
    render(
      <ProjectCard
        project={{ ...mockProject, task_count: 1, completed_count: 0 }}
      />,
    );
    expect(screen.getByText("1 task")).toBeInTheDocument();
  });
});
