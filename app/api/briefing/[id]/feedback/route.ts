import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
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
    const { workspace_id, feedback, feedback_notes } = body;

    if (!workspace_id) {
      return NextResponse.json(
        { error: "workspace_id is required" },
        { status: 400 },
      );
    }

    if (feedback !== "thumbs_up" && feedback !== "thumbs_down") {
      return NextResponse.json(
        { error: "feedback must be 'thumbs_up' or 'thumbs_down'" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("briefings")
      .update({
        feedback,
        feedback_notes: feedback_notes || null,
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .eq("workspace_id", workspace_id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Briefing not found" },
          { status: 404 },
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
