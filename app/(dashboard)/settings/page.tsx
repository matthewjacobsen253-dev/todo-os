"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmailConnectionCard } from "@/components/settings/email-connection-card";
import { EmailScanSettings } from "@/components/settings/email-scan-settings";
import { useEmailScan } from "@/hooks/useEmailScan";

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const [connectionMessage, setConnectionMessage] = useState<string | null>(
    null,
  );

  const {
    status,
    logs,
    loading,
    connectGmail,
    connectOutlook,
    disconnect,
    updateConfig,
    startScan,
  } = useEmailScan();

  // Show connection success/error messages from OAuth callbacks
  useEffect(() => {
    const gmailStatus = searchParams.get("gmail");
    const outlookStatus = searchParams.get("outlook");
    const message = searchParams.get("message");

    if (gmailStatus === "connected") {
      setConnectionMessage("Gmail connected successfully!");
    } else if (gmailStatus === "error") {
      setConnectionMessage(
        `Gmail connection error: ${message || "Unknown error"}`,
      );
    } else if (outlookStatus === "connected") {
      setConnectionMessage("Outlook connected successfully!");
    } else if (outlookStatus === "error") {
      setConnectionMessage(
        `Outlook connection error: ${message || "Unknown error"}`,
      );
    }

    // Clear message after 5s
    if (gmailStatus || outlookStatus) {
      const timer = setTimeout(() => setConnectionMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      {connectionMessage && (
        <div
          className={`mb-4 px-4 py-3 rounded-lg text-sm ${
            connectionMessage.includes("error")
              ? "bg-destructive/10 text-destructive"
              : "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
          }`}
        >
          {connectionMessage}
        </div>
      )}

      <Tabs defaultValue="email" className="space-y-4">
        <TabsList>
          <TabsTrigger value="email">Email Integration</TabsTrigger>
          <TabsTrigger value="general">General</TabsTrigger>
        </TabsList>

        <TabsContent value="email" className="space-y-4">
          <EmailConnectionCard
            status={status}
            loading={loading}
            onConnectGmail={connectGmail}
            onConnectOutlook={connectOutlook}
            onDisconnect={disconnect}
          />
          <EmailScanSettings
            status={status}
            logs={logs}
            onUpdateConfig={updateConfig}
            onStartScan={startScan}
          />
        </TabsContent>

        <TabsContent value="general">
          <div className="text-muted-foreground text-sm">
            General workspace settings coming soon.
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
