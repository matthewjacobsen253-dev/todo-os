import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { EmailConnectionStatus } from "@/types";

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

    // Get scan config
    const { data: config } = await supabase
      .from("email_scan_configs")
      .select("id, provider, enabled, last_scan_at, email_address")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .maybeSingle();

    const status: EmailConnectionStatus = config
      ? {
          connected: true,
          provider: config.provider,
          email: config.email_address,
          last_scan_at: config.last_scan_at,
          enabled: config.enabled,
          config_id: config.id,
        }
      : {
          connected: false,
          provider: null,
          email: null,
          last_scan_at: null,
          enabled: false,
          config_id: null,
        };

    // Get recent scan logs
    const { data: logs } = await supabase
      .from("email_scan_logs")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("started_at", { ascending: false })
      .limit(10);

    return NextResponse.json({ status, logs: logs || [] });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
