import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { inngest } from "@/lib/inngest/client";

export async function POST(request: NextRequest) {
  try {
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

    const admin = createAdminClient();

    // Verify config exists
    const { data: config, error: configError } = await admin
      .from("email_scan_configs")
      .select("id, enabled")
      .eq("workspace_id", workspace_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (configError) {
      return NextResponse.json({ error: configError.message }, { status: 500 });
    }

    if (!config) {
      return NextResponse.json(
        {
          error: "No email scan configuration found. Connect your email first.",
        },
        { status: 400 },
      );
    }

    // Send Inngest event
    await inngest.send({
      name: "email/scan.requested",
      data: { config_id: config.id },
    });

    return NextResponse.json({ success: true, message: "Scan started" });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
