import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { mockExtractTasksFromEmail } from "@/lib/claude/mock-extractor";
import * as fs from "fs";
import * as path from "path";

const DATA_DIR = path.join(
  process.env.HOME || "/Users/chewsassistant",
  "Documents/JohnsonChew_Bot Output/Test Datasets and other",
);
const INBOX_PATH = path.join(DATA_DIR, "inbox.json");
const GROUND_TRUTH_PATH = path.join(DATA_DIR, "ground_truth.json");
const RESULTS_PATH = path.join(DATA_DIR, "extraction_results.json");

interface SyntheticEmail {
  message_id: string;
  thread_id: string;
  from_name: string;
  from_email: string;
  to_emails: string[];
  cc_emails: string[];
  subject: string;
  body_text: string;
  received_datetime: string;
  labels: string[];
  attachments: { filename: string; mimetype: string; description: string }[];
}

interface GroundTruthEntry {
  message_id: string;
  expected_should_create_task: boolean;
  expected_task_count: number;
  expected_tasks: {
    title: string;
    expected_project: string | null;
    expected_owner: string | null;
    expected_due_date: string | null;
    expected_priority: string | null;
  }[];
}

interface ExtractionResult {
  message_id: string;
  subject: string;
  from: string;
  extracted_tasks: {
    title: string;
    description: string | null;
    priority: string;
    due_date: string | null;
    confidence_score: number;
  }[];
  expected_task_count: number;
  actual_task_count: number;
  match: boolean;
  error: string | null;
}

/**
 * POST /api/test/extract
 * Processes synthetic emails through mock Claude extractor.
 * Query params:
 *   - start: first email index (1-based, default 1)
 *   - end: last email index (1-based, default 125)
 *   - create_tasks: "true" to create tasks in DB
 *   - workspace_id: required if create_tasks=true
 */
export async function POST(request: NextRequest) {
  try {
    // Auth: optional for extraction-only, required for task creation
    const { searchParams } = new URL(request.url);
    const start = parseInt(searchParams.get("start") || "1", 10);
    const end = parseInt(searchParams.get("end") || "125", 10);
    const createTasks = searchParams.get("create_tasks") === "true";
    const workspaceId = searchParams.get("workspace_id");

    let userId: string | null = null;
    let resolvedWorkspaceId = workspaceId;

    if (createTasks) {
      // Try session auth first
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        userId = user.id;
      } else {
        // Fallback: use admin client to find first workspace owner
        const admin = createAdminClient();
        const { data: ws } = await admin
          .from("workspaces")
          .select("id, owner_id")
          .order("created_at", { ascending: true })
          .limit(1)
          .single();
        if (!ws) {
          return NextResponse.json(
            { error: "No workspace found. Create one in the app first." },
            { status: 400 },
          );
        }
        userId = ws.owner_id;
        if (!resolvedWorkspaceId) resolvedWorkspaceId = ws.id;
      }

      if (!resolvedWorkspaceId) {
        // If logged in but no workspace_id, auto-detect
        const admin = createAdminClient();
        const { data: ws } = await admin
          .from("workspaces")
          .select("id")
          .eq("owner_id", userId!)
          .order("created_at", { ascending: true })
          .limit(1)
          .single();
        if (!ws) {
          return NextResponse.json(
            { error: "No workspace found for user" },
            { status: 400 },
          );
        }
        resolvedWorkspaceId = ws.id;
      }
    }

    // Load data files
    if (!fs.existsSync(INBOX_PATH)) {
      return NextResponse.json(
        { error: `inbox.json not found at ${INBOX_PATH}` },
        { status: 404 },
      );
    }
    if (!fs.existsSync(GROUND_TRUTH_PATH)) {
      return NextResponse.json(
        { error: `ground_truth.json not found at ${GROUND_TRUTH_PATH}` },
        { status: 404 },
      );
    }

    const inbox: SyntheticEmail[] = JSON.parse(
      fs.readFileSync(INBOX_PATH, "utf-8"),
    );
    const groundTruth: GroundTruthEntry[] = JSON.parse(
      fs.readFileSync(GROUND_TRUTH_PATH, "utf-8"),
    );
    const gtMap = new Map(groundTruth.map((g) => [g.message_id, g]));

    // Slice to requested range (1-based inclusive)
    const emails = inbox.slice(start - 1, end);
    const results: ExtractionResult[] = [];
    let tasksCreated = 0;

    const admin = createTasks ? createAdminClient() : null;

    for (const email of emails) {
      const gt = gtMap.get(email.message_id);
      const expectedCount = gt?.expected_task_count ?? 0;

      try {
        const extracted = await mockExtractTasksFromEmail(
          {
            subject: email.subject,
            sender: `${email.from_name} <${email.from_email}>`,
            body: email.body_text,
            date: email.received_datetime,
          },
          email.message_id,
          groundTruth,
        );

        const result: ExtractionResult = {
          message_id: email.message_id,
          subject: email.subject,
          from: `${email.from_name} <${email.from_email}>`,
          extracted_tasks: extracted,
          expected_task_count: expectedCount,
          actual_task_count: extracted.length,
          match:
            (expectedCount === 0 && extracted.length === 0) ||
            (expectedCount > 0 && extracted.length > 0),
          error: null,
        };
        results.push(result);

        // Create tasks in DB if requested
        if (
          createTasks &&
          admin &&
          resolvedWorkspaceId &&
          userId &&
          extracted.length > 0
        ) {
          for (const task of extracted) {
            const { error } = await admin.from("tasks").insert({
              workspace_id: resolvedWorkspaceId,
              title: task.title,
              description: task.description,
              status: "inbox",
              priority: task.priority === "urgent" ? "high" : task.priority,
              due_date: task.due_date,
              creator_id: userId,
              source_type: "email",
              confidence_score: task.confidence_score,
              needs_review: task.confidence_score < 0.7,
              position: 0,
            });
            if (!error) tasksCreated++;
          }
        }
      } catch (err) {
        results.push({
          message_id: email.message_id,
          subject: email.subject,
          from: `${email.from_name} <${email.from_email}>`,
          extracted_tasks: [],
          expected_task_count: expectedCount,
          actual_task_count: 0,
          match: expectedCount === 0,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    // Calculate metrics
    const totalProcessed = results.length;
    const totalMatches = results.filter((r) => r.match).length;
    const totalExtracted = results.reduce(
      (sum, r) => sum + r.actual_task_count,
      0,
    );
    const totalExpected = results.reduce(
      (sum, r) => sum + r.expected_task_count,
      0,
    );

    // Confusion matrix
    const truePositives = results.filter(
      (r) => r.expected_task_count > 0 && r.actual_task_count > 0,
    ).length;
    const falsePositives = results.filter(
      (r) => r.expected_task_count === 0 && r.actual_task_count > 0,
    ).length;
    const falseNegatives = results.filter(
      (r) => r.expected_task_count > 0 && r.actual_task_count === 0,
    ).length;
    const trueNegatives = results.filter(
      (r) => r.expected_task_count === 0 && r.actual_task_count === 0,
    ).length;

    const precision =
      truePositives + falsePositives > 0
        ? truePositives / (truePositives + falsePositives)
        : 0;
    const recall =
      truePositives + falseNegatives > 0
        ? truePositives / (truePositives + falseNegatives)
        : 0;
    const f1 =
      precision + recall > 0
        ? (2 * precision * recall) / (precision + recall)
        : 0;

    const summary = {
      total_processed: totalProcessed,
      total_expected_tasks: totalExpected,
      total_extracted_tasks: totalExtracted,
      tasks_created_in_db: tasksCreated,
      detection_accuracy: `${((totalMatches / totalProcessed) * 100).toFixed(1)}%`,
      true_positives: truePositives,
      false_positives: falsePositives,
      false_negatives: falseNegatives,
      true_negatives: trueNegatives,
      precision: `${(precision * 100).toFixed(1)}%`,
      recall: `${(recall * 100).toFixed(1)}%`,
      f1_score: `${(f1 * 100).toFixed(1)}%`,
    };

    // Save results to file
    const output = { summary, results, ran_at: new Date().toISOString() };
    fs.writeFileSync(RESULTS_PATH, JSON.stringify(output, null, 2));

    return NextResponse.json(output);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/test/extract
 * Returns previously saved extraction results.
 */
export async function GET() {
  try {
    if (!fs.existsSync(RESULTS_PATH)) {
      return NextResponse.json(
        { error: "No results yet. POST to this endpoint to run extraction." },
        { status: 404 },
      );
    }

    const data = JSON.parse(fs.readFileSync(RESULTS_PATH, "utf-8"));
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
