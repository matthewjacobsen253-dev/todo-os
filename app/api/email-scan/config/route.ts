import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { workspace_id, ...updates } = body;

    if (!workspace_id) {
      return NextResponse.json(
        { error: "workspace_id is required" },
        { status: 400 },
      );
    }

    // Validate confidence_threshold
    if (
      updates.confidence_threshold !== undefined &&
      (typeof updates.confidence_threshold !== "number" ||
        updates.confidence_threshold < 0 ||
        updates.confidence_threshold > 1)
    ) {
      return NextResponse.json(
        { error: "confidence_threshold must be between 0 and 1" },
        { status: 400 },
      );
    }

    // Validate scan_interval_hours
    if (
      updates.scan_interval_hours !== undefined &&
      (typeof updates.scan_interval_hours !== "number" ||
        updates.scan_interval_hours < 1 ||
        updates.scan_interval_hours > 24)
    ) {
      return NextResponse.json(
        { error: "scan_interval_hours must be between 1 and 24" },
        { status: 400 },
      );
    }

    // Only allow specific fields to be updated
    const allowedFields = [
      "scan_interval_hours",
      "quiet_hours_start",
      "quiet_hours_end",
      "weekend_scan",
      "confidence_threshold",
      "enabled",
    ];

    const sanitizedUpdates: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (updates[key] !== undefined) {
        sanitizedUpdates[key] = updates[key];
      }
    }

    const admin = createAdminClient();

    const { data, error } = await admin
      .from("email_scan_configs")
      .update(sanitizedUpdates)
      .eq("workspace_id", workspace_id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
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
