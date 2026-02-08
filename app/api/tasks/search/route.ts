import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
    const query = searchParams.get("q");
    const workspaceId = searchParams.get("workspace_id");

    if (!query || !query.trim()) {
      return NextResponse.json(
        { error: "q (query) parameter is required" },
        { status: 400 },
      );
    }

    if (!workspaceId) {
      return NextResponse.json(
        { error: "workspace_id is required" },
        { status: 400 },
      );
    }

    const admin = createAdminClient();

    // Try using the search_tasks RPC if available, otherwise fall back to ilike
    const { data: rpcData, error: rpcError } = await admin.rpc("search_tasks", {
      ws_id: workspaceId,
      query_text: query.trim(),
    });

    if (!rpcError && rpcData) {
      const results = (rpcData as Array<Record<string, unknown>>)
        .slice(0, 20)
        .map((row) => ({
          type: "task" as const,
          id: row.id as string,
          title: row.title as string,
          description: row.description as string | undefined,
        }));

      return NextResponse.json({ results });
    }

    // Fallback: simple ilike search
    const { data, error } = await admin
      .from("tasks")
      .select("id, title, description")
      .eq("workspace_id", workspaceId)
      .ilike("title", `%${query.trim()}%`)
      .limit(20);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const results = (data || []).map((task) => ({
      type: "task" as const,
      id: task.id,
      title: task.title,
      description: task.description,
    }));

    return NextResponse.json({ results });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
