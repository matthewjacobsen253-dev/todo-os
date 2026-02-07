import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { workspace_id } = body;

    if (!workspace_id) {
      return NextResponse.json(
        { error: "workspace_id is required" },
        { status: 400 },
      );
    }

    // Verify task exists
    const { data: task, error: fetchError } = await supabase
      .from("tasks")
      .select("id, title, needs_review")
      .eq("id", id)
      .eq("workspace_id", workspace_id)
      .single();

    if (fetchError || !task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Delete the task
    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", id)
      .eq("workspace_id", workspace_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log audit entry
    await supabase.from("audit_logs").insert({
      workspace_id,
      entity_type: "task",
      entity_id: id,
      action: "review_rejected",
      details: { rejected_by: user.id, task_title: task.title },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
