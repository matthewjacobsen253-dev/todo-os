import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  verifyWorkspaceAccess,
  requireWorkspaceAccess,
  checkWorkspaceAccess,
} from "@/lib/auth/workspace-guard";

// Mock the admin client
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(),
          })),
        })),
      })),
    })),
  })),
}));

import { createAdminClient } from "@/lib/supabase/admin";

function createMockClient(singleResult: { data: unknown; error: unknown }) {
  const mockSingle = vi.fn().mockResolvedValue(singleResult);
  const mockEq2 = vi.fn(() => ({ single: mockSingle }));
  const mockEq1 = vi.fn(() => ({ eq: mockEq2 }));
  const mockSelect = vi.fn(() => ({ eq: mockEq1 }));
  const mockFrom = vi.fn(() => ({ select: mockSelect }));

  return {
    client: { from: mockFrom },
    mockFrom,
    mockSelect,
  };
}

describe("workspace-guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("verifyWorkspaceAccess", () => {
    it("returns role when user has access", async () => {
      const { client, mockFrom, mockSelect } = createMockClient({
        data: { role: "member" },
        error: null,
      });

      vi.mocked(createAdminClient).mockReturnValue(
        client as unknown as ReturnType<typeof createAdminClient>,
      );

      const result = await verifyWorkspaceAccess("user-123", "workspace-456");

      expect(result).toEqual({ role: "member" });
      expect(mockFrom).toHaveBeenCalledWith("workspace_members");
      expect(mockSelect).toHaveBeenCalledWith("role");
    });

    it("returns null when user has no access", async () => {
      const { client } = createMockClient({
        data: null,
        error: { message: "Not found" },
      });

      vi.mocked(createAdminClient).mockReturnValue(
        client as unknown as ReturnType<typeof createAdminClient>,
      );

      const result = await verifyWorkspaceAccess("user-123", "workspace-456");

      expect(result).toBeNull();
    });
  });

  describe("requireWorkspaceAccess", () => {
    it("returns access when user has access", async () => {
      const { client } = createMockClient({
        data: { role: "owner" },
        error: null,
      });

      vi.mocked(createAdminClient).mockReturnValue(
        client as unknown as ReturnType<typeof createAdminClient>,
      );

      const result = await requireWorkspaceAccess("user-123", "workspace-456");

      expect(result).toEqual({ role: "owner" });
    });

    it("throws when user has no access", async () => {
      const { client } = createMockClient({
        data: null,
        error: { message: "Not found" },
      });

      vi.mocked(createAdminClient).mockReturnValue(
        client as unknown as ReturnType<typeof createAdminClient>,
      );

      await expect(
        requireWorkspaceAccess("user-123", "workspace-456"),
      ).rejects.toThrow("Workspace access denied");
    });

    it("throws when user lacks required role", async () => {
      const { client } = createMockClient({
        data: { role: "member" },
        error: null,
      });

      vi.mocked(createAdminClient).mockReturnValue(
        client as unknown as ReturnType<typeof createAdminClient>,
      );

      await expect(
        requireWorkspaceAccess("user-123", "workspace-456", ["owner", "admin"]),
      ).rejects.toThrow("Insufficient permissions");
    });

    it("succeeds when user has one of required roles", async () => {
      const { client } = createMockClient({
        data: { role: "admin" },
        error: null,
      });

      vi.mocked(createAdminClient).mockReturnValue(
        client as unknown as ReturnType<typeof createAdminClient>,
      );

      const result = await requireWorkspaceAccess("user-123", "workspace-456", [
        "owner",
        "admin",
      ]);

      expect(result).toEqual({ role: "admin" });
    });
  });

  describe("checkWorkspaceAccess", () => {
    it("returns allowed: true when access granted", async () => {
      const { client } = createMockClient({
        data: { role: "member" },
        error: null,
      });

      vi.mocked(createAdminClient).mockReturnValue(
        client as unknown as ReturnType<typeof createAdminClient>,
      );

      const result = await checkWorkspaceAccess("user-123", "workspace-456");

      expect(result).toEqual({
        allowed: true,
        access: { role: "member" },
      });
    });

    it("returns allowed: false when access denied", async () => {
      const { client } = createMockClient({
        data: null,
        error: { message: "Not found" },
      });

      vi.mocked(createAdminClient).mockReturnValue(
        client as unknown as ReturnType<typeof createAdminClient>,
      );

      const result = await checkWorkspaceAccess("user-123", "workspace-456");

      expect(result).toEqual({
        allowed: false,
        error: "Workspace access denied",
      });
    });
  });
});
