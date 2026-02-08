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
    const workspaceId = searchParams.get("workspace_id");

    if (!workspaceId) {
      return NextResponse.json(
        { error: "workspace_id is required" },
        { status: 400 },
      );
    }

    const admin = createAdminClient();

    const { data, error } = await admin
      .from("projects")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get task counts per project
    const projectIds = (data || []).map((p: { id: string }) => p.id);
    const taskCounts: Record<string, { total: number; completed: number }> = {};

    if (projectIds.length > 0) {
      // Limit to 1000 tasks per project query for performance
      const { data: tasks } = await admin
        .from("tasks")
        .select("project_id, status")
        .eq("workspace_id", workspaceId)
        .in("project_id", projectIds)
        .limit(1000);

      if (tasks) {
        for (const task of tasks) {
          const pid = task.project_id as string;
          if (!taskCounts[pid]) {
            taskCounts[pid] = { total: 0, completed: 0 };
          }
          taskCounts[pid].total++;
          if (task.status === "done") {
            taskCounts[pid].completed++;
          }
        }
      }
    }

    const projectsWithStats = (data || []).map((project: { id: string }) => ({
      ...project,
      task_count: taskCounts[project.id]?.total || 0,
      completed_count: taskCounts[project.id]?.completed || 0,
    }));

    // Add cache headers - projects change infrequently
    return NextResponse.json(
      { data: projectsWithStats },
      {
        headers: {
          "Cache-Control": "private, max-age=15, stale-while-revalidate=30",
        },
      },
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}

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
    const { workspace_id, name, description, color, icon } = body;

    if (!workspace_id) {
      return NextResponse.json(
        { error: "workspace_id is required" },
        { status: 400 },
      );
    }

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const projectData = {
      workspace_id,
      name: name.trim(),
      description: description || null,
      color: color || "#6366f1",
      icon: icon || "folder",
      status: "active" as const,
    };

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("projects")
      .insert([projectData])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
