import { createAdminClient } from "@/lib/supabase/admin";

export type WorkspaceRole = "owner" | "admin" | "member";

export interface WorkspaceAccess {
  role: WorkspaceRole;
}

/**
 * Verify that a user has access to a workspace
 * @returns The user's role in the workspace, or null if no access
 */
export async function verifyWorkspaceAccess(
  userId: string,
  workspaceId: string,
): Promise<WorkspaceAccess | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    return null;
  }

  return { role: data.role as WorkspaceRole };
}

/**
 * Require workspace access, throwing if denied
 * @throws Error if user doesn't have access or lacks required role
 */
export async function requireWorkspaceAccess(
  userId: string,
  workspaceId: string,
  requiredRoles?: WorkspaceRole[],
): Promise<WorkspaceAccess> {
  const access = await verifyWorkspaceAccess(userId, workspaceId);

  if (!access) {
    throw new Error("Workspace access denied");
  }

  if (requiredRoles && requiredRoles.length > 0) {
    if (!requiredRoles.includes(access.role)) {
      throw new Error(
        `Insufficient permissions. Required: ${requiredRoles.join(" or ")}`,
      );
    }
  }

  return access;
}

/**
 * Helper for API routes - returns a 403 response if access denied
 */
export async function checkWorkspaceAccess(
  userId: string,
  workspaceId: string,
  requiredRoles?: WorkspaceRole[],
): Promise<
  { allowed: true; access: WorkspaceAccess } | { allowed: false; error: string }
> {
  try {
    const access = await requireWorkspaceAccess(
      userId,
      workspaceId,
      requiredRoles,
    );
    return { allowed: true, access };
  } catch (err) {
    return {
      allowed: false,
      error: err instanceof Error ? err.message : "Access denied",
    };
  }
}
