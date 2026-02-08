import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { categorizeUpcomingTasks, sortTasks } from "@/lib/utils";
import type { Task } from "@/types";

const createTask = (overrides: Partial<Task> = {}): Task => ({
  id: `task-${Math.random()}`,
  workspace_id: "ws-1",
  project_id: null,
  title: "Test task",
  description: null,
  status: "inbox",
  priority: "none",
  due_date: null,
  assignee_id: null,
  creator_id: "user-1",
  source_type: "manual",
  source_id: null,
  confidence_score: null,
  needs_review: false,
  tags: [],
  position: 1,
  completed_at: null,
  created_at: "2026-02-01T00:00:00Z",
  updated_at: "2026-02-01T00:00:00Z",
  ...overrides,
});

// Use local-time date strings to avoid timezone issues with startOfDay
const TODAY = "2026-02-07";
const TOMORROW = "2026-02-08";
const DAY3 = "2026-02-10";
const PAST = "2026-02-05";
const FAR_FUTURE = "2026-02-20";

describe("categorizeUpcomingTasks", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Set to noon local time to avoid any date boundary issues
    vi.setSystemTime(new Date(2026, 1, 7, 12, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 7 day buckets", () => {
    const buckets = categorizeUpcomingTasks([]);
    expect(buckets).toHaveLength(7);
    expect(buckets[0].label).toBe("Today");
    expect(buckets[1].label).toBe("Tomorrow");
  });

  it("sorts tasks into correct day buckets", () => {
    const tasks = [
      createTask({ id: "t1", due_date: TODAY }),
      createTask({ id: "t2", due_date: TOMORROW }),
      createTask({ id: "t3", due_date: DAY3 }),
    ];
    const buckets = categorizeUpcomingTasks(tasks);
    expect(buckets[0].tasks).toHaveLength(1); // Today
    expect(buckets[0].tasks[0].id).toBe("t1");
    expect(buckets[1].tasks).toHaveLength(1); // Tomorrow
    expect(buckets[1].tasks[0].id).toBe("t2");
    expect(buckets[3].tasks).toHaveLength(1); // Feb 10
    expect(buckets[3].tasks[0].id).toBe("t3");
  });

  it("excludes tasks with no due_date", () => {
    const tasks = [
      createTask({ id: "t1", due_date: null }),
      createTask({ id: "t2", due_date: TODAY }),
    ];
    const buckets = categorizeUpcomingTasks(tasks);
    const allTasks = buckets.flatMap((b) => b.tasks);
    expect(allTasks).toHaveLength(1);
    expect(allTasks[0].id).toBe("t2");
  });

  it("excludes terminal statuses (done/cancelled)", () => {
    const tasks = [
      createTask({ id: "t1", status: "done", due_date: TODAY }),
      createTask({ id: "t2", status: "cancelled", due_date: TODAY }),
      createTask({ id: "t3", status: "inbox", due_date: TODAY }),
    ];
    const buckets = categorizeUpcomingTasks(tasks);
    expect(buckets[0].tasks).toHaveLength(1);
    expect(buckets[0].tasks[0].id).toBe("t3");
  });

  it("excludes past-due tasks", () => {
    const tasks = [
      createTask({ id: "t1", due_date: PAST }),
      createTask({ id: "t2", due_date: TODAY }),
    ];
    const buckets = categorizeUpcomingTasks(tasks);
    const allTasks = buckets.flatMap((b) => b.tasks);
    expect(allTasks).toHaveLength(1);
    expect(allTasks[0].id).toBe("t2");
  });

  it("excludes tasks beyond 7 days", () => {
    const tasks = [createTask({ id: "t1", due_date: FAR_FUTURE })];
    const buckets = categorizeUpcomingTasks(tasks);
    const allTasks = buckets.flatMap((b) => b.tasks);
    expect(allTasks).toHaveLength(0);
  });

  it("sorts each day's tasks by priority", () => {
    const tasks = [
      createTask({ id: "t1", priority: "low", due_date: TODAY }),
      createTask({ id: "t2", priority: "urgent", due_date: TODAY }),
      createTask({ id: "t3", priority: "high", due_date: TODAY }),
    ];
    const buckets = categorizeUpcomingTasks(tasks);
    expect(buckets[0].tasks.map((t) => t.id)).toEqual(["t2", "t3", "t1"]);
  });
});

describe("sortTasks", () => {
  const tasks = [
    createTask({
      id: "t1",
      title: "Banana",
      priority: "low",
      status: "done",
      due_date: "2026-02-10",
      created_at: "2026-02-01T00:00:00Z",
    }),
    createTask({
      id: "t2",
      title: "Apple",
      priority: "urgent",
      status: "inbox",
      due_date: "2026-02-08",
      created_at: "2026-02-03T00:00:00Z",
    }),
    createTask({
      id: "t3",
      title: "Cherry",
      priority: "medium",
      status: "in_progress",
      due_date: null,
      created_at: "2026-02-02T00:00:00Z",
    }),
  ];

  it("sorts by priority ascending (urgent first)", () => {
    const sorted = sortTasks(tasks, "priority", "asc");
    expect(sorted.map((t) => t.id)).toEqual(["t2", "t3", "t1"]);
  });

  it("sorts by priority descending (low first)", () => {
    const sorted = sortTasks(tasks, "priority", "desc");
    expect(sorted.map((t) => t.id)).toEqual(["t1", "t3", "t2"]);
  });

  it("sorts by due_date ascending with nulls last", () => {
    const sorted = sortTasks(tasks, "due_date", "asc");
    expect(sorted.map((t) => t.id)).toEqual(["t2", "t1", "t3"]);
  });

  it("sorts by due_date descending with nulls last", () => {
    const sorted = sortTasks(tasks, "due_date", "desc");
    expect(sorted.map((t) => t.id)).toEqual(["t1", "t2", "t3"]);
  });

  it("sorts by status ascending", () => {
    const sorted = sortTasks(tasks, "status", "asc");
    expect(sorted.map((t) => t.id)).toEqual(["t2", "t3", "t1"]);
  });

  it("sorts by created_at ascending", () => {
    const sorted = sortTasks(tasks, "created_at", "asc");
    expect(sorted.map((t) => t.id)).toEqual(["t1", "t3", "t2"]);
  });

  it("sorts by title ascending", () => {
    const sorted = sortTasks(tasks, "title", "asc");
    expect(sorted.map((t) => t.id)).toEqual(["t2", "t1", "t3"]);
  });

  it("sorts by title descending", () => {
    const sorted = sortTasks(tasks, "title", "desc");
    expect(sorted.map((t) => t.id)).toEqual(["t3", "t1", "t2"]);
  });

  it("returns a new array without mutating the original", () => {
    const original = [...tasks];
    sortTasks(tasks, "priority", "asc");
    expect(tasks.map((t) => t.id)).toEqual(original.map((t) => t.id));
  });
});
