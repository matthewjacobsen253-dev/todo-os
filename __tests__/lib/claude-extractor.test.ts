import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCreate = vi.fn();

vi.mock("@anthropic-ai/sdk", () => {
  return {
    default: class MockAnthropic {
      messages = { create: mockCreate };
    },
  };
});

vi.stubEnv("ANTHROPIC_API_KEY", "test-key");

describe("extractTasksFromEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("extracts tasks from email content", async () => {
    mockCreate.mockResolvedValue({
      content: [
        {
          type: "text",
          text: JSON.stringify([
            {
              title: "Review Q3 report",
              description: "Bob needs the Q3 report reviewed by Friday",
              priority: "high",
              due_date: "2026-02-14",
              confidence_score: 0.85,
            },
          ]),
        },
      ],
    });

    const { extractTasksFromEmail } = await import("@/lib/claude/extractor");
    const tasks = await extractTasksFromEmail({
      subject: "Q3 Report Review",
      sender: "bob@example.com",
      body: "Please review the Q3 report by Friday.",
      date: "2026-02-07",
    });

    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toBe("Review Q3 report");
    expect(tasks[0].priority).toBe("high");
    expect(tasks[0].confidence_score).toBe(0.85);
  });

  it("returns empty array for empty email body", async () => {
    const { extractTasksFromEmail } = await import("@/lib/claude/extractor");
    const tasks = await extractTasksFromEmail({
      subject: "Empty",
      sender: "test@example.com",
      body: "",
      date: "2026-02-07",
    });

    expect(tasks).toEqual([]);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("returns empty array when Claude returns non-array", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: '"not an array"' }],
    });

    const { extractTasksFromEmail } = await import("@/lib/claude/extractor");
    const tasks = await extractTasksFromEmail({
      subject: "Test",
      sender: "test@example.com",
      body: "Some email content",
      date: "2026-02-07",
    });

    expect(tasks).toEqual([]);
  });

  it("validates and defaults invalid priority values", async () => {
    mockCreate.mockResolvedValue({
      content: [
        {
          type: "text",
          text: JSON.stringify([
            {
              title: "Task with bad priority",
              priority: "invalid",
              confidence_score: 0.7,
            },
          ]),
        },
      ],
    });

    const { extractTasksFromEmail } = await import("@/lib/claude/extractor");
    const tasks = await extractTasksFromEmail({
      subject: "Test",
      sender: "test@example.com",
      body: "Content here",
      date: "2026-02-07",
    });

    expect(tasks[0].priority).toBe("none");
  });

  it("handles malformed JSON gracefully", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "not valid json {{{" }],
    });

    const { extractTasksFromEmail } = await import("@/lib/claude/extractor");
    const tasks = await extractTasksFromEmail({
      subject: "Test",
      sender: "test@example.com",
      body: "Content here",
      date: "2026-02-07",
    });

    expect(tasks).toEqual([]);
  });
});
