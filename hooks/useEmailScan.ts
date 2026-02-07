import { useState, useEffect, useCallback } from "react";
import { useCurrentWorkspace } from "@/store";
import type {
  EmailConnectionStatus,
  EmailScanLog,
  UpdateEmailScanConfigInput,
} from "@/types";

/**
 * Hook for email scan configuration and status
 */
export const useEmailScan = () => {
  const currentWorkspace = useCurrentWorkspace();
  const [status, setStatus] = useState<EmailConnectionStatus | null>(null);
  const [logs, setLogs] = useState<EmailScanLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!currentWorkspace?.id) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/email-scan/status?workspace_id=${currentWorkspace.id}`,
      );
      const json = await response.json();

      if (!response.ok) throw new Error(json.error);

      setStatus(json.status);
      setLogs(json.logs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch status");
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace?.id]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const connectGmail = useCallback(async () => {
    if (!currentWorkspace?.id) throw new Error("No workspace selected");

    const response = await fetch("/api/auth/gmail", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspace_id: currentWorkspace.id }),
    });

    const json = await response.json();
    if (!response.ok) throw new Error(json.error);

    window.location.href = json.url;
  }, [currentWorkspace?.id]);

  const connectOutlook = useCallback(async () => {
    if (!currentWorkspace?.id) throw new Error("No workspace selected");

    const response = await fetch("/api/auth/outlook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspace_id: currentWorkspace.id }),
    });

    const json = await response.json();
    if (!response.ok) throw new Error(json.error);

    window.location.href = json.url;
  }, [currentWorkspace?.id]);

  const disconnect = useCallback(async () => {
    if (!currentWorkspace?.id || !status?.provider) return;

    const endpoint =
      status.provider === "outlook"
        ? "/api/auth/outlook/disconnect"
        : "/api/auth/gmail/disconnect";

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspace_id: currentWorkspace.id }),
    });

    const json = await response.json();
    if (!response.ok) throw new Error(json.error);

    setStatus({
      connected: false,
      provider: null,
      email: null,
      last_scan_at: null,
      enabled: false,
      config_id: null,
    });
  }, [currentWorkspace?.id, status?.provider]);

  const updateConfig = useCallback(
    async (updates: UpdateEmailScanConfigInput) => {
      if (!currentWorkspace?.id) throw new Error("No workspace selected");

      const response = await fetch("/api/email-scan/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_id: currentWorkspace.id,
          ...updates,
        }),
      });

      const json = await response.json();
      if (!response.ok) throw new Error(json.error);

      // Refresh status
      await fetchStatus();
    },
    [currentWorkspace?.id, fetchStatus],
  );

  const startScan = useCallback(async () => {
    if (!currentWorkspace?.id) throw new Error("No workspace selected");

    const response = await fetch("/api/email-scan/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspace_id: currentWorkspace.id }),
    });

    const json = await response.json();
    if (!response.ok) throw new Error(json.error);
  }, [currentWorkspace?.id]);

  return {
    status,
    logs,
    loading,
    error,
    connectGmail,
    connectOutlook,
    disconnect,
    updateConfig,
    startScan,
    refresh: fetchStatus,
  };
};

export default useEmailScan;
