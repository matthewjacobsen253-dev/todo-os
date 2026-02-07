"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function DebugPage() {
  const [info, setInfo] = useState<Record<string, unknown>>({ loading: true });

  useEffect(() => {
    async function check() {
      const supabase = createClient();
      const results: Record<string, unknown> = {};

      // 1. Auth - getUser
      try {
        const { data, error } = await supabase.auth.getUser();
        results.user = data?.user
          ? { id: data.user.id, email: data.user.email }
          : null;
        results.authError = error?.message || null;
      } catch (e) {
        results.authException = String(e);
      }

      // 2. Auth - getSession
      try {
        const { data, error } = await supabase.auth.getSession();
        results.session = data?.session
          ? { userId: data.session.user.id, expiresAt: data.session.expires_at }
          : null;
        results.sessionError = error?.message || null;
      } catch (e) {
        results.sessionException = String(e);
      }

      // 3. Workspaces
      try {
        const { data, error } = await supabase.from("workspaces").select("*");
        results.workspaces = data;
        results.workspacesError = error?.message || null;
      } catch (e) {
        results.workspacesException = String(e);
      }

      // 4. Workspace members
      try {
        const { data, error } = await supabase
          .from("workspace_members")
          .select("*");
        results.members = data;
        results.membersError = error?.message || null;
      } catch (e) {
        results.membersException = String(e);
      }

      results.loading = false;
      setInfo(results);
    }
    check();
  }, []);

  return (
    <div style={{ padding: 20, fontFamily: "monospace", fontSize: 14 }}>
      <h1 style={{ fontSize: 24, marginBottom: 20 }}>
        Debug Page (outside dashboard layout)
      </h1>
      <pre
        style={{
          background: "#1a1a2e",
          color: "#eee",
          padding: 20,
          borderRadius: 8,
          overflow: "auto",
          whiteSpace: "pre-wrap",
        }}
      >
        {JSON.stringify(info, null, 2)}
      </pre>
    </div>
  );
}
