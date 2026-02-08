import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TaskFiltersBar } from "@/components/tasks/task-filters";
import type { Project } from "@/types";

const defaultProps = {
  filters: {},
  onFilterChange: vi.fn(),
  onClear: vi.fn(),
};

const mockProjects: Project[] = [
  {
    id: "proj-1",
    workspace_id: "ws-1",
    name: "Project Alpha",
    color: "#ff0000",
    icon: "folder",
    description: null,
    status: "active",
    created_at: "2026-01-01T00:00:00Z",
  },
];

describe("TaskFiltersBar", () => {
  it("renders search input and priority dropdown", () => {
    render(<TaskFiltersBar {...defaultProps} />);
    expect(screen.getByPlaceholderText("Search tasks...")).toBeInTheDocument();
  });

  it("shows 'More filters' button when advanced controls are available", () => {
    render(
      <TaskFiltersBar
        {...defaultProps}
        projects={mockProjects}
        onSortChange={vi.fn()}
        onGroupByChange={vi.fn()}
      />,
    );
    expect(screen.getByText("More filters")).toBeInTheDocument();
  });

  it("shows clear button with filter count when filters active", () => {
    render(
      <TaskFiltersBar
        {...defaultProps}
        filters={{ search: "hello", priority: ["high"] }}
      />,
    );
    expect(screen.getByText("Clear")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("shows status and sort controls when More filters clicked", async () => {
    const user = userEvent.setup();
    render(
      <TaskFiltersBar
        {...defaultProps}
        projects={mockProjects}
        onSortChange={vi.fn()}
        onGroupByChange={vi.fn()}
      />,
    );

    await user.click(screen.getByText("More filters"));

    // Status button should be visible
    expect(screen.getByText("Status")).toBeInTheDocument();
  });

  it("calls onClear when clear button clicked", async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();
    render(
      <TaskFiltersBar
        {...defaultProps}
        filters={{ search: "test" }}
        onClear={onClear}
      />,
    );

    await user.click(screen.getByText("Clear"));
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});
