import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
  const limit = parseInt(searchParams.get("limit") || "7", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  if (!workspaceId) {
    return NextResponse.json(
      { error: "workspace_id is required" },
      { status: 400 },
    );
  }

  const { data, error, count } = await supabase
    .from("briefings")
    .select("*", { count: "exact" })
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .order("date", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data || [], count });
}
