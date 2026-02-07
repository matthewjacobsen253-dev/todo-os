import Anthropic from "@anthropic-ai/sdk";
import type { ExtractedTaskFromEmail } from "@/types";
import { sanitizeEmailContent } from "@/lib/email/sanitize";

const EXTRACTION_PROMPT = `You are an expert at identifying actionable tasks from email content.
Analyze the following email and extract any actionable tasks. For each task, provide:
- title: A clear, concise task title (imperative form, e.g. "Review Q3 report")
- description: Brief context from the email (1-2 sentences max), or null if self-explanatory
- priority: One of "urgent", "high", "medium", "low", "none" based on language urgency
- due_date: ISO 8601 date string if a deadline is mentioned, otherwise null
- confidence_score: 0.0-1.0 how confident you are this is a real actionable task

Rules:
- Only extract genuine action items, not FYI or informational content
- A task must have a clear action the recipient needs to take
- Set confidence_score >= 0.7 for clear action items with explicit asks
- Set confidence_score 0.4-0.7 for implied action items
- Set confidence_score < 0.4 for very uncertain/questionable items
- If no actionable tasks exist, return an empty array
- Do NOT extract tasks from automated notifications, newsletters, or marketing emails

Respond with ONLY a JSON array. No markdown, no explanation.`;

function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY environment variable is not set");
  }
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

/**
 * Extracts actionable tasks from an email using Claude.
 */
export async function extractTasksFromEmail(email: {
  subject: string;
  sender: string;
  body: string;
  date: string;
}): Promise<ExtractedTaskFromEmail[]> {
  const sanitizedBody = sanitizeEmailContent(email.body);

  if (!sanitizedBody.trim()) {
    return [];
  }

  const client = getClient();

  const emailContext = `From: ${email.sender}
Subject: ${email.subject}
Date: ${email.date}

${sanitizedBody}`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: `${EXTRACTION_PROMPT}\n\nEmail:\n${emailContext}`,
      },
    ],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    return [];
  }

  try {
    const parsed = JSON.parse(textBlock.text);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(
        (item: Record<string, unknown>) =>
          typeof item.title === "string" && item.title.trim().length > 0,
      )
      .map((item: Record<string, unknown>) => ({
        title: String(item.title).trim(),
        description: item.description ? String(item.description) : null,
        priority: validatePriority(item.priority),
        due_date: item.due_date ? String(item.due_date) : null,
        confidence_score: validateScore(item.confidence_score),
      }));
  } catch {
    return [];
  }
}

function validatePriority(
  value: unknown,
): "urgent" | "high" | "medium" | "low" | "none" {
  const valid = ["urgent", "high", "medium", "low", "none"];
  if (typeof value === "string" && valid.includes(value)) {
    return value as "urgent" | "high" | "medium" | "low" | "none";
  }
  return "none";
}

function validateScore(value: unknown): number {
  if (typeof value === "number" && value >= 0 && value <= 1) {
    return Math.round(value * 100) / 100;
  }
  return 0.5;
}
