"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, Unplug } from "lucide-react";
import type { EmailConnectionStatus } from "@/types";

interface EmailConnectionCardProps {
  status: EmailConnectionStatus | null;
  loading: boolean;
  onConnectGmail: () => void;
  onConnectOutlook: () => void;
  onDisconnect: () => void;
}

export function EmailConnectionCard({
  status,
  loading,
  onConnectGmail,
  onConnectOutlook,
  onDisconnect,
}: EmailConnectionCardProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Email Connection</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-1/3" />
            <div className="h-4 bg-muted rounded w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (status?.connected) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Email Connection</CardTitle>
              <CardDescription>
                Your email is connected for task extraction.
              </CardDescription>
            </div>
            <Badge
              className="bg-green-50 text-green-600 dark:bg-green-900/20"
              data-testid="connected-badge"
            >
              Connected
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <Mail className="w-4 h-4 text-muted-foreground" />
            <span>{status.email}</span>
            <Badge variant="outline" className="text-xs capitalize">
              {status.provider}
            </Badge>
          </div>

          {status.last_scan_at && (
            <p className="text-xs text-muted-foreground">
              Last scan: {new Date(status.last_scan_at).toLocaleString()}
            </p>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={onDisconnect}
            className="gap-1 text-destructive hover:text-destructive"
          >
            <Unplug className="w-4 h-4" />
            Disconnect
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Email Connection</CardTitle>
        <CardDescription>
          Connect your email account to automatically extract tasks from
          incoming emails.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Button onClick={onConnectGmail} className="gap-2">
            <Mail className="w-4 h-4" />
            Connect Gmail
          </Button>
          <Button
            onClick={onConnectOutlook}
            variant="outline"
            className="gap-2"
          >
            <Mail className="w-4 h-4" />
            Connect Outlook
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          We only request read-only access to scan for actionable tasks.
        </p>
      </CardContent>
    </Card>
  );
}
