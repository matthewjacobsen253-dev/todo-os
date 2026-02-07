import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateBriefing } from "@/lib/claude/briefing-generator";
import type { BriefingPreference, Task } from "@/types";

const DEFAULT_PREFERENCES: Omit<
  BriefingPreference,
  "id" | "workspace_id" | "user_id" | "created_at"
> = {
  delivery_time: "08:00",
  timezone: "America/New_York",
  enabled: false,
  include_email: false,
  filters: {},
};

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { workspace_id } = body;

  if (!workspace_id) {
    return NextResponse.json(
      { error: "workspace_id is required" },
      { status: 400 },
    );
  }

  // Fetch preferences (or use defaults)
  const { data: prefs } = await supabase
    .from("briefing_preferences")
    .select("*")
    .eq("workspace_id", workspace_id)
    .eq("user_id", user.id)
    .maybeSingle();

  const preferences: BriefingPreference = prefs || {
    id: "",
    workspace_id,
    user_id: user.id,
    created_at: "",
    ...DEFAULT_PREFERENCES,
  };

  // Fetch active tasks for this workspace
  const { data: tasks, error: tasksError } = await supabase
    .from("tasks")
    .select("*")
    .eq("workspace_id", workspace_id);

  if (tasksError) {
    return NextResponse.json({ error: tasksError.message }, { status: 500 });
  }

  const content = await generateBriefing((tasks || []) as Task[], preferences);

  const today = new Date().toISOString().split("T")[0];

  // Upsert briefing (on conflict workspace_id, user_id, date)
  const { data: briefing, error: upsertError } = await supabase
    .from("briefings")
    .upsert(
      {
        workspace_id,
        user_id: user.id,
        date: today,
        content,
      },
      { onConflict: "workspace_id,user_id,date" },
    )
    .select()
    .single();

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  return NextResponse.json({ data: briefing }, { status: 201 });
}
