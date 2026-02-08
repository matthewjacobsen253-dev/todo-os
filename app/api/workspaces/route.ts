import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const admin = createAdminClient();

    // Get workspace memberships for this user
    const { data: memberData, error: memberError } = await admin
      .from("workspace_members")
      .select("workspace_id, role")
      .eq("user_id", user.id);

    if (memberError) {
      return NextResponse.json({ error: memberError.message }, { status: 500 });
    }

    if (!memberData || memberData.length === 0) {
      return NextResponse.json({ data: [] });
    }

    const workspaceIds = memberData.map(
      (m: { workspace_id: string }) => m.workspace_id,
    );
    const roleMap = Object.fromEntries(
      memberData.map((m: { workspace_id: string; role: string }) => [
        m.workspace_id,
        m.role,
      ]),
    );

    const { data: workspaces, error: wsError } = await admin
      .from("workspaces")
      .select("*")
      .in("id", workspaceIds);

    if (wsError) {
      return NextResponse.json({ error: wsError.message }, { status: 500 });
    }

    const workspacesWithRole = (workspaces || []).map(
      (ws: Record<string, unknown>) => ({
        ...ws,
        role: roleMap[ws.id as string] || "member",
        member_count: 1,
      }),
    );

    return NextResponse.json({ data: workspacesWithRole });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { name, slug } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { error: "Name and slug are required" },
        { status: 400 },
      );
    }

    const admin = createAdminClient();

    const { data: workspace, error: wsError } = await admin
      .from("workspaces")
      .insert({ name, slug, owner_id: user.id })
      .select()
      .single();

    if (wsError) {
      return NextResponse.json({ error: wsError.message }, { status: 500 });
    }

    // Insert workspace member
    const { error: memberError } = await admin
      .from("workspace_members")
      .insert({
        workspace_id: workspace.id,
        user_id: user.id,
        role: "owner",
      });

    if (memberError) {
      console.error("Member insert failed:", memberError.message);
    }

    return NextResponse.json(workspace);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
