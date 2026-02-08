import type { ExtractedTaskFromEmail } from "@/types";

/**
 * Ground truth entry shape from the synthetic dataset
 */
interface GroundTruthTask {
  title: string;
  expected_project: string | null;
  expected_owner: string | null;
  expected_due_date: string | null;
  expected_priority: string | null;
}

interface GroundTruthEntry {
  message_id: string;
  expected_should_create_task: boolean;
  expected_task_count: number;
  expected_tasks: GroundTruthTask[];
}

// In-memory cache for ground truth data
let groundTruthCache: Map<string, GroundTruthEntry> | null = null;

function loadGroundTruth(
  groundTruth: GroundTruthEntry[],
): Map<string, GroundTruthEntry> {
  if (!groundTruthCache) {
    groundTruthCache = new Map(groundTruth.map((g) => [g.message_id, g]));
  }
  return groundTruthCache;
}

/**
 * Map ground truth priority to extractor priority format
 */
function mapPriority(
  p: string | null,
): "urgent" | "high" | "medium" | "low" | "none" {
  if (!p) return "none";
  if (p === "urgent" || p === "high" || p === "medium" || p === "low") return p;
  return "none";
}

/**
 * Generate a realistic confidence score based on priority
 */
function generateConfidence(priority: string | null): number {
  // Higher priority tasks tend to be more clearly stated
  const base =
    priority === "high" || priority === "urgent"
      ? 0.85
      : priority === "medium"
        ? 0.75
        : priority === "low"
          ? 0.6
          : 0.5;

  // Add small random variation (-0.05 to +0.05)
  const variation = (Math.random() - 0.5) * 0.1;
  return (
    Math.round(Math.max(0.3, Math.min(0.98, base + variation)) * 100) / 100
  );
}

/**
 * Generate a brief description from the task title
 */
function generateDescription(
  title: string,
  project: string | null,
): string | null {
  if (Math.random() < 0.3) return null; // 30% chance of no description
  const projectNote = project ? ` (${project})` : "";
  return `Action item extracted from email${projectNote}`;
}

/**
 * Mock extractor that returns tasks based on ground truth data.
 * Simulates a ~200ms delay per email to mimic API latency.
 */
export async function mockExtractTasksFromEmail(
  email: {
    subject: string;
    sender: string;
    body: string;
    date: string;
  },
  messageId: string,
  groundTruth: GroundTruthEntry[],
): Promise<ExtractedTaskFromEmail[]> {
  // Simulate API latency (100-300ms)
  await new Promise((resolve) =>
    setTimeout(resolve, 100 + Math.random() * 200),
  );

  const gtMap = loadGroundTruth(groundTruth);
  const gt = gtMap.get(messageId);

  if (!gt || !gt.expected_should_create_task || gt.expected_task_count === 0) {
    return [];
  }

  return gt.expected_tasks.map((task) => ({
    title: task.title,
    description: generateDescription(task.title, task.expected_project),
    priority: mapPriority(task.expected_priority),
    due_date: task.expected_due_date,
    confidence_score: generateConfidence(task.expected_priority),
  }));
}
