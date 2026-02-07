import Anthropic from "@anthropic-ai/sdk";
import {
  differenceInDays,
  startOfDay,
  parseISO,
  isToday,
  addDays,
} from "date-fns";
import type {
  Task,
  TaskPriority,
  BriefingContent,
  BriefingFilters,
  BriefingPreference,
} from "@/types";

// ============================================================================
// TYPES
// ============================================================================

export interface PreprocessedData {
  overdueTasks: Array<Task & { days_overdue: number }>;
  dueTodayTasks: Task[];
  urgentTasks: Task[];
  highPriorityTasks: Task[];
  waitingTasks: Task[];
  activeTasks: Task[];
  completedToday: Task[];
}

// ============================================================================
// DETERMINISTIC PRE-PROCESSOR
// ============================================================================

const PRIORITY_ORDER: TaskPriority[] = [
  "urgent",
  "high",
  "medium",
  "low",
  "none",
];

function sortByPriorityOrder(tasks: Task[]): Task[] {
  return [...tasks].sort(
    (a, b) =>
      PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority),
  );
}

export function preprocessTasks(
  tasks: Task[],
  filters: BriefingFilters,
  today?: Date,
): PreprocessedData {
  const todayDate = startOfDay(today || new Date());

  // Filter out done/cancelled (except for counting completedToday)
  const completedToday: Task[] = [];
  const activeTasks: Task[] = [];

  for (const task of tasks) {
    if (task.status === "done" || task.status === "cancelled") {
      if (task.completed_at) {
        try {
          if (isToday(parseISO(task.completed_at))) {
            completedToday.push(task);
          }
        } catch {
          // invalid date, skip
        }
      }
      continue;
    }
    activeTasks.push(task);
  }

  // Apply BriefingFilters
  let filtered = activeTasks;

  if (filters.projects && filters.projects.length > 0) {
    filtered = filtered.filter(
      (t) => t.project_id && filters.projects!.includes(t.project_id),
    );
  }

  if (filters.priorities && filters.priorities.length > 0) {
    filtered = filtered.filter((t) => filters.priorities!.includes(t.priority));
  }

  // Categorize
  const overdueTasks: Array<Task & { days_overdue: number }> = [];
  const dueTodayTasks: Task[] = [];
  const urgentTasks: Task[] = [];
  const highPriorityTasks: Task[] = [];
  const waitingTasks: Task[] = [];
  const remainingActive: Task[] = [];

  for (const task of filtered) {
    if (task.status === "waiting") {
      waitingTasks.push(task);
    }

    if (task.priority === "urgent") {
      urgentTasks.push(task);
    } else if (task.priority === "high") {
      highPriorityTasks.push(task);
    }

    if (task.due_date) {
      try {
        const dueDate = startOfDay(parseISO(task.due_date));
        const diff = differenceInDays(todayDate, dueDate);

        if (diff > 0) {
          overdueTasks.push({ ...task, days_overdue: diff });
          continue;
        } else if (diff === 0) {
          dueTodayTasks.push(task);
          continue;
        }
      } catch {
        // invalid date, skip categorization
      }
    }

    remainingActive.push(task);
  }

  // Sort overdue by days_overdue descending (most overdue first)
  overdueTasks.sort((a, b) => b.days_overdue - a.days_overdue);

  // Sort due-today by priority
  const sortedDueToday = sortByPriorityOrder(dueTodayTasks);

  return {
    overdueTasks,
    dueTodayTasks: sortedDueToday,
    urgentTasks: sortByPriorityOrder(urgentTasks),
    highPriorityTasks: sortByPriorityOrder(highPriorityTasks),
    waitingTasks,
    activeTasks: remainingActive,
    completedToday,
  };
}

// ============================================================================
// CLAUDE INTELLIGENCE LAYER
// ============================================================================

const BRIEFING_PROMPT = `You are a productivity assistant analyzing a user's task list to create a morning briefing.

Given the preprocessed task data below, provide THREE things:

1. **top_outcomes**: Pick the 3 most impactful tasks the user should focus on today. Choose from the urgent, high-priority, and due-today tasks. Return their task_id, title, and priority.

2. **defer_suggestions**: From the active low-priority tasks that are NOT due this week, suggest up to 3 that could be safely deferred. For each, provide task_id, title, and a brief reason (1 sentence).

3. **summary**: A 1-2 sentence morning overview based on the statistics provided. Be encouraging but honest about workload.

Respond with ONLY valid JSON in this exact format:
{
  "top_outcomes": [{"task_id": "...", "title": "...", "priority": "..."}],
  "defer_suggestions": [{"task_id": "...", "title": "...", "reason": "..."}],
  "summary": "..."
}`;

interface ClaudeOutput {
  top_outcomes: Array<{
    task_id: string;
    title: string;
    priority: TaskPriority;
  }>;
  defer_suggestions: Array<{ task_id: string; title: string; reason: string }>;
  summary: string;
}

function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY environment variable is not set");
  }
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

export async function generateBriefingWithClaude(
  preprocessed: PreprocessedData,
  today?: Date,
): Promise<ClaudeOutput | null> {
  const todayDate = today || new Date();
  const endOfWeek = addDays(todayDate, 7 - todayDate.getDay());

  const taskData = {
    overdue: preprocessed.overdueTasks.map((t) => ({
      task_id: t.id,
      title: t.title,
      priority: t.priority,
      days_overdue: t.days_overdue,
    })),
    due_today: preprocessed.dueTodayTasks.map((t) => ({
      task_id: t.id,
      title: t.title,
      priority: t.priority,
    })),
    urgent: preprocessed.urgentTasks.map((t) => ({
      task_id: t.id,
      title: t.title,
      priority: t.priority,
    })),
    high_priority: preprocessed.highPriorityTasks.map((t) => ({
      task_id: t.id,
      title: t.title,
      priority: t.priority,
    })),
    active_low_priority: preprocessed.activeTasks
      .filter((t) => {
        if (t.priority !== "low" && t.priority !== "none") return false;
        if (!t.due_date) return true;
        try {
          return parseISO(t.due_date) > endOfWeek;
        } catch {
          return false;
        }
      })
      .map((t) => ({
        task_id: t.id,
        title: t.title,
        priority: t.priority,
        due_date: t.due_date,
      })),
    stats: {
      total_active:
        preprocessed.activeTasks.length +
        preprocessed.overdueTasks.length +
        preprocessed.dueTodayTasks.length +
        preprocessed.urgentTasks.length +
        preprocessed.highPriorityTasks.length +
        preprocessed.waitingTasks.length,
      overdue_count: preprocessed.overdueTasks.length,
      due_today_count: preprocessed.dueTodayTasks.length,
      urgent_count: preprocessed.urgentTasks.length,
      waiting_count: preprocessed.waitingTasks.length,
      completed_today: preprocessed.completedToday.length,
    },
  };

  try {
    const client = getClient();

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `${BRIEFING_PROMPT}\n\nTask Data:\n${JSON.stringify(taskData, null, 2)}`,
        },
      ],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") return null;

    const parsed = JSON.parse(textBlock.text);

    // Validate structure
    if (!Array.isArray(parsed.top_outcomes)) return null;

    return {
      top_outcomes: parsed.top_outcomes
        .filter(
          (item: Record<string, unknown>) =>
            typeof item.task_id === "string" && typeof item.title === "string",
        )
        .slice(0, 3)
        .map((item: Record<string, unknown>) => ({
          task_id: String(item.task_id),
          title: String(item.title),
          priority: validatePriority(item.priority),
        })),
      defer_suggestions: Array.isArray(parsed.defer_suggestions)
        ? parsed.defer_suggestions
            .filter(
              (item: Record<string, unknown>) =>
                typeof item.task_id === "string" &&
                typeof item.title === "string",
            )
            .slice(0, 3)
            .map((item: Record<string, unknown>) => ({
              task_id: String(item.task_id),
              title: String(item.title),
              reason: typeof item.reason === "string" ? item.reason : "",
            }))
        : [],
      summary: typeof parsed.summary === "string" ? parsed.summary : "",
    };
  } catch {
    return null;
  }
}

function validatePriority(value: unknown): TaskPriority {
  const valid: TaskPriority[] = ["urgent", "high", "medium", "low", "none"];
  if (typeof value === "string" && valid.includes(value as TaskPriority)) {
    return value as TaskPriority;
  }
  return "none";
}

// ============================================================================
// ASSEMBLER — Main exported function
// ============================================================================

export async function generateBriefing(
  tasks: Task[],
  preferences: BriefingPreference,
  today?: Date,
): Promise<BriefingContent> {
  const preprocessed = preprocessTasks(tasks, preferences.filters, today);

  // Build must_do deterministically: overdue + due-today + urgent (capped at 5, sorted by priority)
  const mustDoCandidates: Array<{
    task_id: string;
    title: string;
    due_date: string | null;
    priority: TaskPriority;
  }> = [];

  const seenIds = new Set<string>();

  for (const task of preprocessed.overdueTasks) {
    if (seenIds.has(task.id)) continue;
    seenIds.add(task.id);
    mustDoCandidates.push({
      task_id: task.id,
      title: task.title,
      due_date: task.due_date,
      priority: task.priority,
    });
  }

  for (const task of preprocessed.dueTodayTasks) {
    if (seenIds.has(task.id)) continue;
    seenIds.add(task.id);
    mustDoCandidates.push({
      task_id: task.id,
      title: task.title,
      due_date: task.due_date,
      priority: task.priority,
    });
  }

  for (const task of preprocessed.urgentTasks) {
    if (seenIds.has(task.id)) continue;
    seenIds.add(task.id);
    mustDoCandidates.push({
      task_id: task.id,
      title: task.title,
      due_date: task.due_date,
      priority: task.priority,
    });
  }

  // Sort by priority, cap at 5
  mustDoCandidates.sort(
    (a, b) =>
      PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority),
  );
  const mustDo = mustDoCandidates.slice(0, 5);

  // Build overdue deterministically
  const overdue = preprocessed.overdueTasks.map((t) => ({
    task_id: t.id,
    title: t.title,
    days_overdue: t.days_overdue,
    priority: t.priority,
  }));

  // Build waiting_on deterministically
  const waitingOn = preprocessed.waitingTasks.map((t) => ({
    task_id: t.id,
    title: t.title,
    waiting_for: t.description || "Waiting on response",
  }));

  // Summary stats (always deterministic) — count unique tasks across categories
  const allActiveIds = new Set<string>();
  for (const t of preprocessed.activeTasks) allActiveIds.add(t.id);
  for (const t of preprocessed.overdueTasks) allActiveIds.add(t.id);
  for (const t of preprocessed.dueTodayTasks) allActiveIds.add(t.id);
  for (const t of preprocessed.urgentTasks) allActiveIds.add(t.id);
  for (const t of preprocessed.highPriorityTasks) allActiveIds.add(t.id);
  for (const t of preprocessed.waitingTasks) allActiveIds.add(t.id);

  const summary: BriefingContent["summary"] = {
    total_tasks: allActiveIds.size,
    urgent_count: preprocessed.urgentTasks.length,
    completed_today: preprocessed.completedToday.length,
  };

  // Call Claude for smart parts
  const claudeOutput = await generateBriefingWithClaude(preprocessed, today);

  // Fallback: if Claude fails, use deterministic top_outcomes (first 3 from must_do)
  const topOutcomes =
    claudeOutput?.top_outcomes ??
    mustDo.slice(0, 3).map((t) => ({
      task_id: t.task_id,
      title: t.title,
      priority: t.priority,
    }));

  const deferSuggestions = claudeOutput?.defer_suggestions ?? [];

  return {
    top_outcomes: topOutcomes,
    must_do: mustDo,
    defer_suggestions: deferSuggestions,
    waiting_on: waitingOn,
    overdue,
    summary,
  };
}
