"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Play, RefreshCw } from "lucide-react";
import type {
  EmailConnectionStatus,
  EmailScanLog,
  UpdateEmailScanConfigInput,
} from "@/types";

interface EmailScanSettingsProps {
  status: EmailConnectionStatus | null;
  logs: EmailScanLog[];
  onUpdateConfig: (updates: UpdateEmailScanConfigInput) => Promise<void>;
  onStartScan: () => Promise<void>;
}

export function EmailScanSettings({
  status,
  logs,
  onUpdateConfig,
  onStartScan,
}: EmailScanSettingsProps) {
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);

  // Local state for form fields
  const [interval, setInterval] = useState(String(status?.connected ? 3 : 3));
  const [threshold, setThreshold] = useState("0.7");
  const [weekendScan, setWeekendScan] = useState(false);
  const [quietStart, setQuietStart] = useState("");
  const [quietEnd, setQuietEnd] = useState("");

  if (!status?.connected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Scan Settings</CardTitle>
          <CardDescription>
            Connect your email account first to configure scan settings.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdateConfig({
        scan_interval_hours: parseInt(interval, 10),
        confidence_threshold: parseFloat(threshold),
        weekend_scan: weekendScan,
        quiet_hours_start: quietStart || null,
        quiet_hours_end: quietEnd || null,
        enabled: status.enabled,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEnabled = async (enabled: boolean) => {
    await onUpdateConfig({ enabled });
  };

  const handleStartScan = async () => {
    setScanning(true);
    try {
      await onStartScan();
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Scan Settings</CardTitle>
              <CardDescription>
                Configure how often and when emails are scanned.
              </CardDescription>
            </div>
            <Switch
              checked={status.enabled}
              onCheckedChange={handleToggleEnabled}
              aria-label="Enable email scanning"
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Scan Interval</Label>
              <Select value={interval} onValueChange={setInterval}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Every hour</SelectItem>
                  <SelectItem value="2">Every 2 hours</SelectItem>
                  <SelectItem value="3">Every 3 hours</SelectItem>
                  <SelectItem value="6">Every 6 hours</SelectItem>
                  <SelectItem value="12">Every 12 hours</SelectItem>
                  <SelectItem value="24">Once a day</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Auto-approve Threshold</Label>
              <Select value={threshold} onValueChange={setThreshold}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.5">50% (more auto-approve)</SelectItem>
                  <SelectItem value="0.7">70% (balanced)</SelectItem>
                  <SelectItem value="0.85">85% (more review)</SelectItem>
                  <SelectItem value="1.0">100% (review all)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quiet-start">Quiet Hours Start</Label>
              <Input
                id="quiet-start"
                type="time"
                value={quietStart}
                onChange={(e) => setQuietStart(e.target.value)}
                placeholder="22:00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quiet-end">Quiet Hours End</Label>
              <Input
                id="quiet-end"
                type="time"
                value={quietEnd}
                onChange={(e) => setQuietEnd(e.target.value)}
                placeholder="06:00"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={weekendScan}
              onCheckedChange={setWeekendScan}
              id="weekend-scan"
            />
            <Label htmlFor="weekend-scan">Scan on weekends</Label>
          </div>

          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Settings"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleStartScan}
              disabled={scanning}
              className="gap-1"
            >
              {scanning ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              Scan Now
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Scan History */}
      {logs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Scan History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between text-sm border-b last:border-0 pb-2 last:pb-0"
                >
                  <div>
                    <span className="text-muted-foreground">
                      {new Date(log.started_at).toLocaleString()}
                    </span>
                    <span className="mx-2">-</span>
                    <span>
                      {log.emails_scanned} emails, {log.tasks_extracted} tasks
                    </span>
                  </div>
                  <Badge
                    variant="secondary"
                    className={
                      log.status === "completed"
                        ? "bg-green-50 text-green-600 dark:bg-green-900/20"
                        : log.status === "failed"
                          ? "bg-red-50 text-red-600 dark:bg-red-900/20"
                          : "bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20"
                    }
                  >
                    {log.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
