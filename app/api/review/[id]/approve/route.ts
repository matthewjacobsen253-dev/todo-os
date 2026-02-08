import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
    const { workspace_id, title, description, priority, project_id, due_date } =
      body;

    if (!workspace_id) {
      return NextResponse.json(
        { error: "workspace_id is required" },
        { status: 400 },
      );
    }

    const admin = createAdminClient();

    // Verify task exists and needs review
    const { data: task, error: fetchError } = await admin
      .from("tasks")
      .select("id, needs_review")
      .eq("id", id)
      .eq("workspace_id", workspace_id)
      .single();

    if (fetchError || !task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (!task.needs_review) {
      return NextResponse.json(
        { error: "Task does not need review" },
        { status: 400 },
      );
    }

    // Build update object
    const updates: Record<string, unknown> = {
      needs_review: false,
      status: "inbox",
    };

    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (priority !== undefined) updates.priority = priority;
    if (project_id !== undefined) updates.project_id = project_id;
    if (due_date !== undefined) updates.due_date = due_date;

    const { data, error } = await admin
      .from("tasks")
      .update(updates)
      .eq("id", id)
      .eq("workspace_id", workspace_id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log audit entry
    await admin.from("audit_logs").insert({
      workspace_id,
      entity_type: "task",
      entity_id: id,
      action: "review_approved",
      details: { approved_by: user.id, edits: body },
    });

    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
