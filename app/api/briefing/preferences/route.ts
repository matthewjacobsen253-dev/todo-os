import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const DEFAULTS = {
  delivery_time: "08:00",
  timezone: "America/New_York",
  enabled: false,
  include_email: false,
  filters: {},
};

export async function GET(request: NextRequest) {
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
    .from("briefing_preferences")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Return data or defaults
  return NextResponse.json({
    data: data || {
      id: null,
      workspace_id: workspaceId,
      user_id: user.id,
      ...DEFAULTS,
      created_at: null,
    },
  });
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    workspace_id,
    delivery_time,
    timezone,
    enabled,
    include_email,
    filters,
  } = body;

  if (!workspace_id) {
    return NextResponse.json(
      { error: "workspace_id is required" },
      { status: 400 },
    );
  }

  const updates: Record<string, unknown> = {};
  if (delivery_time !== undefined) updates.delivery_time = delivery_time;
  if (timezone !== undefined) updates.timezone = timezone;
  if (enabled !== undefined) updates.enabled = enabled;
  if (include_email !== undefined) updates.include_email = include_email;
  if (filters !== undefined) updates.filters = filters;

  const { data, error } = await supabase
    .from("briefing_preferences")
    .upsert(
      {
        workspace_id,
        user_id: user.id,
        ...DEFAULTS,
        ...updates,
      },
      { onConflict: "workspace_id,user_id" },
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
