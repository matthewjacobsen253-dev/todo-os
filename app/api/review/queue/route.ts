import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspace_id");

    if (!workspaceId) {
      return NextResponse.json(
        { error: "workspace_id is required" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("tasks")
      .select("*, source:sources(*)")
      .eq("workspace_id", workspaceId)
      .eq("needs_review", true)
      .eq("source_type", "email")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform to review queue items
    const items = (data || []).map((task: Record<string, unknown>) => {
      const source = task.source as Record<string, unknown> | null;
      const metadata = (source?.metadata || {}) as Record<string, unknown>;

      return {
        id: task.id,
        title: task.title,
        description: task.description,
        priority: task.priority,
        due_date: task.due_date,
        confidence_score: task.confidence_score,
        source_type: task.source_type,
        source_email_subject: metadata.subject || null,
        source_email_sender: metadata.sender || null,
        source_email_date: metadata.date || null,
        review_status: "pending",
        created_at: task.created_at,
      };
    });

    return NextResponse.json({ data: items, count: items.length });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
