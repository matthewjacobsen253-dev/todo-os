import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("SearchCommand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllTimers();
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
      expect(screen.getByText("Close")).toBeInTheDocument();
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

  describe("Search Functionality", () => {
    it("shows loading spinner while searching", async () => {
      vi.useFakeTimers();

      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: () => Promise.resolve({ results: [] }),
                }),
              500,
            ),
          ),
      );

      render(<SearchCommand open={true} />);

      const input = screen.getByRole("combobox");
      fireEvent.change(input, { target: { value: "test" } });

      // Advance past the debounce delay
      vi.advanceTimersByTime(300);

      // Should show loading spinner (check using DOM query)
      const spinner = document.querySelector(".animate-spin");
      expect(spinner).not.toBeNull();

      vi.useRealTimers();
    });

    it("shows no results message when search returns empty", async () => {
      vi.useFakeTimers();

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ results: [] }),
      });

      render(<SearchCommand open={true} />);

      const input = screen.getByRole("combobox");
      fireEvent.change(input, { target: { value: "nonexistent" } });

      // Advance past debounce and await response
      vi.advanceTimersByTime(400);
      await vi.runAllTimersAsync();

      await waitFor(() => {
        expect(
          screen.getByText(/No results found for "nonexistent"/),
        ).toBeInTheDocument();
      });

      vi.useRealTimers();
    });

    it("displays search results when search succeeds", async () => {
      vi.useFakeTimers();

      const mockResults = [
        { id: "task-1", title: "Test Task 1", type: "task" },
        { id: "task-2", title: "Test Task 2", type: "task" },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ results: mockResults }),
      });

      render(<SearchCommand open={true} />);

      const input = screen.getByRole("combobox");
      fireEvent.change(input, { target: { value: "test" } });

      // Advance past debounce and await response
      vi.advanceTimersByTime(400);
      await vi.runAllTimersAsync();

      await waitFor(() => {
        expect(screen.getByText("Search Results")).toBeInTheDocument();
        expect(screen.getByText("Test Task 1")).toBeInTheDocument();
        expect(screen.getByText("Test Task 2")).toBeInTheDocument();
      });

      vi.useRealTimers();
    });

    it("clears results when search input is cleared", async () => {
      vi.useFakeTimers();

      const mockResults = [{ id: "task-1", title: "Test Task", type: "task" }];

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ results: mockResults }),
      });

      render(<SearchCommand open={true} />);

      const input = screen.getByRole("combobox");

      // Enter search query
      fireEvent.change(input, { target: { value: "test" } });
      vi.advanceTimersByTime(400);
      await vi.runAllTimersAsync();

      await waitFor(() => {
        expect(screen.getByText("Test Task")).toBeInTheDocument();
      });

      // Clear search
      fireEvent.change(input, { target: { value: "" } });

      // Should show quick actions again
      await waitFor(() => {
        expect(screen.getByText("Quick Actions")).toBeInTheDocument();
        expect(screen.queryByText("Test Task")).not.toBeInTheDocument();
      });

      vi.useRealTimers();
    });
  });

  describe("Search Result Selection", () => {
    it("opens task detail when a search result is clicked", async () => {
      vi.useFakeTimers();

      const mockResults = [{ id: "task-123", title: "My Task", type: "task" }];

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ results: mockResults }),
      });

      const onOpenChange = vi.fn();
      render(<SearchCommand open={true} onOpenChange={onOpenChange} />);

      const input = screen.getByRole("combobox");
      fireEvent.change(input, { target: { value: "my" } });

      vi.advanceTimersByTime(400);
      await vi.runAllTimersAsync();

      await waitFor(() => {
        expect(screen.getByText("My Task")).toBeInTheDocument();
      });

      const resultButton = screen.getByText("My Task");
      fireEvent.click(resultButton);

      expect(mockOpenTaskDetail).toHaveBeenCalledWith("task-123");
      expect(mockPush).toHaveBeenCalledWith("/inbox");
      expect(onOpenChange).toHaveBeenCalledWith(false);

      vi.useRealTimers();
    });
  });

  describe("Dialog Controls", () => {
    it("calls onOpenChange when dialog is closed", async () => {
      const onOpenChange = vi.fn();
      render(<SearchCommand open={true} onOpenChange={onOpenChange} />);

      // Trigger escape key via global handler (simulated)
      const input = screen.getByRole("combobox");
      fireEvent.keyDown(input, { key: "Escape" });

      // The component handles Escape internally
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it("clears state when dialog is closed", async () => {
      const onOpenChange = vi.fn();
      const { rerender } = render(
        <SearchCommand open={true} onOpenChange={onOpenChange} />,
      );

      const input = screen.getByRole("combobox");
      fireEvent.change(input, { target: { value: "test" } });

      // Close dialog
      rerender(<SearchCommand open={false} onOpenChange={onOpenChange} />);

      // Reopen dialog
      rerender(<SearchCommand open={true} onOpenChange={onOpenChange} />);

      // Input should be cleared
      const newInput = screen.getByRole("combobox");
      expect(newInput).toHaveValue("");
    });
  });
});
