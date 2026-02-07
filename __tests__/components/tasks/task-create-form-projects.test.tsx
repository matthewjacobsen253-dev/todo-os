import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TaskCreateForm } from "@/components/tasks/task-create-form";
import type { Project } from "@/types";

const mockProjects: Project[] = [
  {
    id: "proj-1",
    workspace_id: "ws-1",
    name: "Project Alpha",
    color: "#6366f1",
    icon: "folder",
    description: "First project",
    status: "active",
    created_at: "2026-02-01T00:00:00Z",
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
  },
];

describe("TaskCreateForm with Projects", () => {
  it("renders project select even when no projects provided", () => {
    render(<TaskCreateForm onSubmit={vi.fn()} />);
    expect(screen.getByText("Project")).toBeInTheDocument();
  });

  it("renders project select even when projects array is empty", () => {
    render(<TaskCreateForm onSubmit={vi.fn()} projects={[]} />);
    expect(screen.getByText("Project")).toBeInTheDocument();
  });

  it("renders project select when projects are provided", () => {
    render(<TaskCreateForm onSubmit={vi.fn()} projects={mockProjects} />);
    expect(screen.getByText("Project")).toBeInTheDocument();
  });

  it("submits with project_id null by default", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(<TaskCreateForm onSubmit={onSubmit} projects={mockProjects} />);

    await user.type(
      screen.getByPlaceholderText("What needs to be done?"),
      "Test task",
    );
    await user.click(screen.getByText("Create Task"));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Test task",
        project_id: null,
      }),
    );
  });
});
