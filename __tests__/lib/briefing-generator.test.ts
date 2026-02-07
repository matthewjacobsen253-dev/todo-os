import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Task, BriefingPreference } from "@/types";

const mockCreate = vi.fn();

vi.mock("@anthropic-ai/sdk", () => {
  return {
    default: class MockAnthropic {
      messages = { create: mockCreate };
    },
  };
});

vi.stubEnv("ANTHROPIC_API_KEY", "test-key");

const TODAY = new Date("2026-02-07T12:00:00Z");

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-1",
    workspace_id: "ws-1",
    project_id: null,
    title: "Test task",
    description: null,
    status: "todo",
    priority: "medium",
    due_date: null,
    assignee_id: null,
    creator_id: "user-1",
    source_type: "manual",
    source_id: null,
    confidence_score: null,
    needs_review: false,
    tags: [],
    position: 0,
    completed_at: null,
    created_at: "2026-02-01T00:00:00Z",
    updated_at: "2026-02-01T00:00:00Z",
    ...overrides,
  };
}

const defaultPreferences: BriefingPreference = {
  id: "pref-1",
  workspace_id: "ws-1",
  user_id: "user-1",
  delivery_time: "08:00",
  timezone: "America/New_York",
  enabled: true,
  include_email: false,
  filters: {},
  created_at: "2026-02-01T00:00:00Z",
};

describe("preprocessTasks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("categorizes overdue tasks with days_overdue", async () => {
    const { preprocessTasks } = await import("@/lib/claude/briefing-generator");

    const tasks = [
      makeTask({
        id: "t1",
        title: "Overdue task",
        due_date: "2026-02-04",
        priority: "high",
      }),
    ];

    const result = preprocessTasks(tasks, {}, TODAY);

    expect(result.overdueTasks).toHaveLength(1);
    expect(result.overdueTasks[0].days_overdue).toBe(3);
    expect(result.overdueTasks[0].title).toBe("Overdue task");
  });

  it("categorizes due-today tasks", async () => {
    const { preprocessTasks } = await import("@/lib/claude/briefing-generator");

    const tasks = [
      makeTask({
        id: "t1",
        title: "Due today",
        due_date: "2026-02-07",
      }),
    ];

    const result = preprocessTasks(tasks, {}, TODAY);

    expect(result.dueTodayTasks).toHaveLength(1);
    expect(result.dueTodayTasks[0].title).toBe("Due today");
  });

  it("categorizes urgent and high priority tasks", async () => {
    const { preprocessTasks } = await import("@/lib/claude/briefing-generator");

    const tasks = [
      makeTask({ id: "t1", title: "Urgent task", priority: "urgent" }),
      makeTask({ id: "t2", title: "High task", priority: "high" }),
      makeTask({ id: "t3", title: "Low task", priority: "low" }),
    ];

    const result = preprocessTasks(tasks, {}, TODAY);

    expect(result.urgentTasks).toHaveLength(1);
    expect(result.urgentTasks[0].title).toBe("Urgent task");
    expect(result.highPriorityTasks).toHaveLength(1);
    expect(result.highPriorityTasks[0].title).toBe("High task");
  });

  it("categorizes waiting tasks", async () => {
    const { preprocessTasks } = await import("@/lib/claude/briefing-generator");

    const tasks = [
      makeTask({ id: "t1", title: "Waiting task", status: "waiting" }),
    ];

    const result = preprocessTasks(tasks, {}, TODAY);

    expect(result.waitingTasks).toHaveLength(1);
    expect(result.waitingTasks[0].title).toBe("Waiting task");
  });

  it("filters out done and cancelled tasks", async () => {
    const { preprocessTasks } = await import("@/lib/claude/briefing-generator");

    const tasks = [
      makeTask({ id: "t1", title: "Done task", status: "done" }),
      makeTask({ id: "t2", title: "Cancelled task", status: "cancelled" }),
      makeTask({ id: "t3", title: "Active task", status: "todo" }),
    ];

    const result = preprocessTasks(tasks, {}, TODAY);

    expect(result.activeTasks).toHaveLength(1);
    expect(result.activeTasks[0].title).toBe("Active task");
  });

  it("counts completed today tasks", async () => {
    const { preprocessTasks } = await import("@/lib/claude/briefing-generator");

    const tasks = [
      makeTask({
        id: "t1",
        title: "Completed today",
        status: "done",
        completed_at: "2026-02-07T10:00:00Z",
      }),
      makeTask({
        id: "t2",
        title: "Completed yesterday",
        status: "done",
        completed_at: "2026-02-06T10:00:00Z",
      }),
    ];

    const result = preprocessTasks(tasks, {}, TODAY);

    expect(result.completedToday).toHaveLength(1);
    expect(result.completedToday[0].title).toBe("Completed today");
  });

  it("applies project filter", async () => {
    const { preprocessTasks } = await import("@/lib/claude/briefing-generator");

    const tasks = [
      makeTask({ id: "t1", title: "Project A task", project_id: "proj-a" }),
      makeTask({ id: "t2", title: "Project B task", project_id: "proj-b" }),
      makeTask({ id: "t3", title: "No project task" }),
    ];

    const result = preprocessTasks(tasks, { projects: ["proj-a"] }, TODAY);

    // Only the proj-a task should remain in active
    const allTitles = [
      ...result.activeTasks.map((t) => t.title),
      ...result.overdueTasks.map((t) => t.title),
      ...result.dueTodayTasks.map((t) => t.title),
    ];
    expect(allTitles).toContain("Project A task");
    expect(allTitles).not.toContain("Project B task");
    expect(allTitles).not.toContain("No project task");
  });

  it("applies priority filter", async () => {
    const { preprocessTasks } = await import("@/lib/claude/briefing-generator");

    const tasks = [
      makeTask({ id: "t1", title: "Urgent task", priority: "urgent" }),
      makeTask({ id: "t2", title: "Low task", priority: "low" }),
    ];

    const result = preprocessTasks(tasks, { priorities: ["urgent"] }, TODAY);

    expect(result.urgentTasks).toHaveLength(1);
    expect(result.urgentTasks[0].title).toBe("Urgent task");
    // Low task is filtered out by priority filter
    const allTitles = [
      ...result.activeTasks.map((t) => t.title),
      ...result.urgentTasks.map((t) => t.title),
    ];
    expect(allTitles).not.toContain("Low task");
  });

  it("handles empty tasks array", async () => {
    const { preprocessTasks } = await import("@/lib/claude/briefing-generator");

    const result = preprocessTasks([], {}, TODAY);

    expect(result.overdueTasks).toEqual([]);
    expect(result.dueTodayTasks).toEqual([]);
    expect(result.urgentTasks).toEqual([]);
    expect(result.highPriorityTasks).toEqual([]);
    expect(result.waitingTasks).toEqual([]);
    expect(result.activeTasks).toEqual([]);
    expect(result.completedToday).toEqual([]);
  });

  it("handles all completed tasks", async () => {
    const { preprocessTasks } = await import("@/lib/claude/briefing-generator");

    const tasks = [
      makeTask({
        id: "t1",
        status: "done",
        completed_at: "2026-02-07T10:00:00Z",
      }),
      makeTask({
        id: "t2",
        status: "done",
        completed_at: "2026-02-07T11:00:00Z",
      }),
    ];

    const result = preprocessTasks(tasks, {}, TODAY);

    expect(result.completedToday).toHaveLength(2);
    expect(result.activeTasks).toHaveLength(0);
  });

  it("sorts overdue tasks by days_overdue descending", async () => {
    const { preprocessTasks } = await import("@/lib/claude/briefing-generator");

    const tasks = [
      makeTask({ id: "t1", title: "1 day overdue", due_date: "2026-02-06" }),
      makeTask({ id: "t2", title: "5 days overdue", due_date: "2026-02-02" }),
      makeTask({ id: "t3", title: "3 days overdue", due_date: "2026-02-04" }),
    ];

    const result = preprocessTasks(tasks, {}, TODAY);

    expect(result.overdueTasks[0].title).toBe("5 days overdue");
    expect(result.overdueTasks[1].title).toBe("3 days overdue");
    expect(result.overdueTasks[2].title).toBe("1 day overdue");
  });
});

describe("generateBriefing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generates briefing with Claude output", async () => {
    const claudeResponse = {
      top_outcomes: [
        { task_id: "t1", title: "Urgent task", priority: "urgent" },
        { task_id: "t2", title: "High task", priority: "high" },
      ],
      defer_suggestions: [
        { task_id: "t3", title: "Low task", reason: "Not urgent" },
      ],
      summary: "You have 3 active tasks today.",
    };

    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify(claudeResponse) }],
    });

    const { generateBriefing } =
      await import("@/lib/claude/briefing-generator");

    const tasks = [
      makeTask({ id: "t1", title: "Urgent task", priority: "urgent" }),
      makeTask({ id: "t2", title: "High task", priority: "high" }),
      makeTask({ id: "t3", title: "Low task", priority: "low" }),
    ];

    const result = await generateBriefing(tasks, defaultPreferences, TODAY);

    expect(result.top_outcomes).toHaveLength(2);
    expect(result.top_outcomes[0].title).toBe("Urgent task");
    expect(result.defer_suggestions).toHaveLength(1);
    expect(result.summary).toBeDefined();
    expect(result.summary?.total_tasks).toBeGreaterThanOrEqual(0);
  });

  it("falls back to deterministic output when Claude fails", async () => {
    mockCreate.mockRejectedValue(new Error("API error"));

    const { generateBriefing } =
      await import("@/lib/claude/briefing-generator");

    const tasks = [
      makeTask({
        id: "t1",
        title: "Urgent task",
        priority: "urgent",
        due_date: "2026-02-07",
      }),
      makeTask({
        id: "t2",
        title: "Due today",
        priority: "high",
        due_date: "2026-02-07",
      }),
    ];

    const result = await generateBriefing(tasks, defaultPreferences, TODAY);

    // Should still have must_do and top_outcomes (from deterministic fallback)
    expect(result.must_do.length).toBeGreaterThan(0);
    expect(result.top_outcomes.length).toBeGreaterThan(0);
    // Defer suggestions should be empty on fallback
    expect(result.defer_suggestions).toEqual([]);
    expect(result.summary).toBeDefined();
  });

  it("falls back when Claude returns malformed JSON", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "not valid json {{{" }],
    });

    const { generateBriefing } =
      await import("@/lib/claude/briefing-generator");

    const tasks = [
      makeTask({
        id: "t1",
        title: "Task 1",
        priority: "urgent",
        due_date: "2026-02-07",
      }),
    ];

    const result = await generateBriefing(tasks, defaultPreferences, TODAY);

    // Should have deterministic fallback
    expect(result.must_do.length).toBeGreaterThan(0);
    expect(result.top_outcomes.length).toBeGreaterThan(0);
    expect(result.defer_suggestions).toEqual([]);
  });

  it("caps must_do at 5 items", async () => {
    mockCreate.mockResolvedValue({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            top_outcomes: [],
            defer_suggestions: [],
            summary: "Busy day.",
          }),
        },
      ],
    });

    const { generateBriefing } =
      await import("@/lib/claude/briefing-generator");

    const tasks = Array.from({ length: 8 }, (_, i) =>
      makeTask({
        id: `t${i}`,
        title: `Task ${i}`,
        priority: "urgent",
        due_date: "2026-02-07",
      }),
    );

    const result = await generateBriefing(tasks, defaultPreferences, TODAY);

    expect(result.must_do.length).toBeLessThanOrEqual(5);
  });

  it("builds overdue items deterministically", async () => {
    mockCreate.mockResolvedValue({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            top_outcomes: [],
            defer_suggestions: [],
            summary: "Tasks overdue.",
          }),
        },
      ],
    });

    const { generateBriefing } =
      await import("@/lib/claude/briefing-generator");

    const tasks = [
      makeTask({
        id: "t1",
        title: "Overdue task",
        due_date: "2026-02-04",
        priority: "high",
      }),
    ];

    const result = await generateBriefing(tasks, defaultPreferences, TODAY);

    expect(result.overdue).toHaveLength(1);
    expect(result.overdue[0].days_overdue).toBe(3);
    expect(result.overdue[0].title).toBe("Overdue task");
  });

  it("builds waiting_on from waiting status tasks", async () => {
    mockCreate.mockResolvedValue({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            top_outcomes: [],
            defer_suggestions: [],
            summary: "Waiting.",
          }),
        },
      ],
    });

    const { generateBriefing } =
      await import("@/lib/claude/briefing-generator");

    const tasks = [
      makeTask({
        id: "t1",
        title: "Waiting for Bob",
        status: "waiting",
        description: "Waiting on Bob's review",
      }),
    ];

    const result = await generateBriefing(tasks, defaultPreferences, TODAY);

    expect(result.waiting_on).toHaveLength(1);
    expect(result.waiting_on[0].waiting_for).toBe("Waiting on Bob's review");
  });
});
