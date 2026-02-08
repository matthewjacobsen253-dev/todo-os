import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchCommand } from "@/components/layout/search-command";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
  })),
  usePathname: vi.fn(() => "/inbox"),
}));

// Mock store
const mockToggleQuickCapture = vi.fn();
const mockOpenTaskDetail = vi.fn();

vi.mock("@/store", () => ({
  useCurrentWorkspace: vi.fn(() => ({ id: "ws-1", name: "Test Workspace" })),
  useUIActions: vi.fn(() => ({
    toggleQuickCapture: mockToggleQuickCapture,
    openTaskDetail: mockOpenTaskDetail,
    closeTaskDetail: vi.fn(),
  })),
}));

describe("SearchCommand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Basic Rendering", () => {
    it("renders dialog when open", () => {
      render(<SearchCommand open={true} />);

      expect(
        screen.getByPlaceholderText("Search tasks, projects, or commands..."),
      ).toBeInTheDocument();
    });

    it("does not render dialog when closed", () => {
      render(<SearchCommand open={false} />);

      expect(
        screen.queryByPlaceholderText("Search tasks, projects, or commands..."),
      ).not.toBeInTheDocument();
    });

    it("shows quick actions when no search query", () => {
      render(<SearchCommand open={true} />);

      expect(screen.getByText("Quick Actions")).toBeInTheDocument();
      expect(screen.getByText("Create New Task")).toBeInTheDocument();
      expect(screen.getByText("Go to Inbox")).toBeInTheDocument();
      expect(screen.getByText("Today View")).toBeInTheDocument();
      expect(screen.getByText("Generate Briefing")).toBeInTheDocument();
      expect(screen.getByText("Review Queue")).toBeInTheDocument();
    });

    it("shows keyboard shortcuts in footer", () => {
      render(<SearchCommand open={true} />);

      expect(screen.getByText("Navigate")).toBeInTheDocument();
      expect(screen.getByText("Select")).toBeInTheDocument();
      // "Close" appears twice (footer + sr-only button), use getAllByText
      expect(screen.getAllByText("Close").length).toBeGreaterThan(0);
    });
  });

  describe("Quick Actions", () => {
    it("navigates to inbox when Go to Inbox is clicked", async () => {
      const user = userEvent.setup();
      render(<SearchCommand open={true} />);

      const inboxButton = screen.getByText("Go to Inbox");
      await user.click(inboxButton);

      expect(mockPush).toHaveBeenCalledWith("/inbox");
    });

    it("navigates to today view when Today View is clicked", async () => {
      const user = userEvent.setup();
      render(<SearchCommand open={true} />);

      const todayButton = screen.getByText("Today View");
      await user.click(todayButton);

      expect(mockPush).toHaveBeenCalledWith("/today");
    });

    it("navigates to briefing when Generate Briefing is clicked", async () => {
      const user = userEvent.setup();
      render(<SearchCommand open={true} />);

      const briefingButton = screen.getByText("Generate Briefing");
      await user.click(briefingButton);

      expect(mockPush).toHaveBeenCalledWith("/briefing");
    });

    it("navigates to review when Review Queue is clicked", async () => {
      const user = userEvent.setup();
      render(<SearchCommand open={true} />);

      const reviewButton = screen.getByText("Review Queue");
      await user.click(reviewButton);

      expect(mockPush).toHaveBeenCalledWith("/review");
    });

    it("toggles quick capture when Create New Task is clicked", async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      render(<SearchCommand open={true} onOpenChange={onOpenChange} />);

      const createButton = screen.getByText("Create New Task");
      await user.click(createButton);

      expect(mockToggleQuickCapture).toHaveBeenCalled();
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe("Keyboard Navigation", () => {
    it("navigates down with ArrowDown key", async () => {
      render(<SearchCommand open={true} />);

      const input = screen.getByRole("combobox");

      // Initially first item should be selected
      const firstAction = screen.getByText("Create New Task").closest("button");
      expect(firstAction).toHaveClass("bg-muted");

      // Press down arrow
      fireEvent.keyDown(input, { key: "ArrowDown" });

      // Second item should now be selected
      const secondAction = screen.getByText("Go to Inbox").closest("button");
      expect(secondAction).toHaveClass("bg-muted");
      expect(firstAction).not.toHaveClass("bg-muted");
    });

    it("navigates up with ArrowUp key", async () => {
      render(<SearchCommand open={true} />);

      const input = screen.getByRole("combobox");

      // Navigate down first
      fireEvent.keyDown(input, { key: "ArrowDown" });
      fireEvent.keyDown(input, { key: "ArrowDown" });

      // Now navigate up
      fireEvent.keyDown(input, { key: "ArrowUp" });

      const secondAction = screen.getByText("Go to Inbox").closest("button");
      expect(secondAction).toHaveClass("bg-muted");
    });

    it("selects item with Enter key", async () => {
      const onOpenChange = vi.fn();
      render(<SearchCommand open={true} onOpenChange={onOpenChange} />);

      const input = screen.getByRole("combobox");

      // Navigate to inbox option
      fireEvent.keyDown(input, { key: "ArrowDown" });

      // Press enter
      fireEvent.keyDown(input, { key: "Enter" });

      expect(mockPush).toHaveBeenCalledWith("/inbox");
    });

    it("wraps around when navigating past the last item", async () => {
      render(<SearchCommand open={true} />);

      const input = screen.getByRole("combobox");

      // Navigate down 5 times (there are 5 quick actions)
      for (let i = 0; i < 5; i++) {
        fireEvent.keyDown(input, { key: "ArrowDown" });
      }

      // Should wrap to first item
      const firstAction = screen.getByText("Create New Task").closest("button");
      expect(firstAction).toHaveClass("bg-muted");
    });
  });

  describe("Search Input", () => {
    it("hides quick actions when search query is entered", async () => {
      render(<SearchCommand open={true} />);

      const input = screen.getByRole("combobox");

      // Type a search query
      fireEvent.change(input, { target: { value: "test" } });

      // Quick actions should be hidden
      expect(screen.queryByText("Quick Actions")).not.toBeInTheDocument();
    });

    it("shows quick actions again when search is cleared", async () => {
      render(<SearchCommand open={true} />);

      const input = screen.getByRole("combobox");

      // Type and clear search
      fireEvent.change(input, { target: { value: "test" } });
      fireEvent.change(input, { target: { value: "" } });

      // Quick actions should reappear
      await waitFor(() => {
        expect(screen.getByText("Quick Actions")).toBeInTheDocument();
      });
    });

    it("has accessible combobox role", () => {
      render(<SearchCommand open={true} />);

      const input = screen.getByRole("combobox");
      expect(input).toHaveAttribute("aria-expanded");
    });
  });

  describe("Dialog Controls", () => {
    it("calls onOpenChange when dialog is closed via escape", async () => {
      const onOpenChange = vi.fn();
      render(<SearchCommand open={true} onOpenChange={onOpenChange} />);

      const input = screen.getByRole("combobox");
      fireEvent.keyDown(input, { key: "Escape" });

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it("clears state when dialog is closed via callback", async () => {
      const onOpenChange = vi.fn();
      render(<SearchCommand open={true} onOpenChange={onOpenChange} />);

      const input = screen.getByRole("combobox");
      fireEvent.change(input, { target: { value: "test" } });

      // Trigger close via escape key
      fireEvent.keyDown(input, { key: "Escape" });

      // onOpenChange should be called with false
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe("Accessibility", () => {
    it("has accessible dialog title", () => {
      render(<SearchCommand open={true} />);

      // The dialog should have a title (even if visually hidden)
      expect(screen.getByText("Search")).toBeInTheDocument();
    });

    it("quick action buttons have role=option", () => {
      render(<SearchCommand open={true} />);

      const options = screen.getAllByRole("option");
      expect(options.length).toBe(5); // 5 quick actions
    });

    it("sets aria-selected on current option", () => {
      render(<SearchCommand open={true} />);

      const options = screen.getAllByRole("option");
      const firstOption = options[0];

      expect(firstOption).toHaveAttribute("aria-selected", "true");
    });
  });
});
