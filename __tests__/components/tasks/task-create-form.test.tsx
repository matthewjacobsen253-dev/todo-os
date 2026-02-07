import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TaskCreateForm } from "@/components/tasks/task-create-form";

describe("TaskCreateForm", () => {
  it("renders form fields", () => {
    render(<TaskCreateForm onSubmit={vi.fn()} />);
    expect(screen.getByLabelText("Title")).toBeInTheDocument();
    expect(screen.getByLabelText("Description")).toBeInTheDocument();
    expect(screen.getByLabelText("Due Date")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create Task" }),
    ).toBeInTheDocument();
  });

  it("shows error when submitting empty title", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<TaskCreateForm onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", { name: "Create Task" }));

    expect(screen.getByText("Title is required")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits form with valid data", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<TaskCreateForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("Title"), "My new task");
    await user.click(screen.getByRole("button", { name: "Create Task" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "My new task",
        }),
      );
    });
  });

  it("clears form after successful submission", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<TaskCreateForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("Title"), "My new task");
    await user.click(screen.getByRole("button", { name: "Create Task" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Title")).toHaveValue("");
    });
  });

  it("shows error message on submit failure", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue(new Error("Network error"));
    render(<TaskCreateForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("Title"), "My task");
    await user.click(screen.getByRole("button", { name: "Create Task" }));

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
  });

  it("calls onCancel when cancel button is clicked", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<TaskCreateForm onSubmit={vi.fn()} onCancel={onCancel} />);

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalled();
  });
});
