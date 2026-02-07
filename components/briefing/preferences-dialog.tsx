"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface PreferencesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preferences: {
    delivery_time?: string;
    timezone?: string;
    enabled?: boolean;
    include_email?: boolean;
  } | null;
  onSave: (updates: Record<string, unknown>) => Promise<void>;
}

export function PreferencesDialog({
  open,
  onOpenChange,
  preferences,
  onSave,
}: PreferencesDialogProps) {
  const [deliveryTime, setDeliveryTime] = useState("08:00");
  const [timezone, setTimezone] = useState("America/New_York");
  const [enabled, setEnabled] = useState(false);
  const [includeEmail, setIncludeEmail] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (preferences) {
      setDeliveryTime(preferences.delivery_time || "08:00");
      setTimezone(preferences.timezone || "America/New_York");
      setEnabled(preferences.enabled ?? false);
      setIncludeEmail(preferences.include_email ?? false);
    }
  }, [preferences]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        delivery_time: deliveryTime,
        timezone,
        enabled,
        include_email: includeEmail,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Briefing Preferences</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="enabled">Enable auto-delivery</Label>
            <Switch
              id="enabled"
              checked={enabled}
              onCheckedChange={setEnabled}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="delivery-time">Delivery time</Label>
            <Input
              id="delivery-time"
              type="time"
              value={deliveryTime}
              onChange={(e) => setDeliveryTime(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Input
              id="timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              placeholder="America/New_York"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="include-email">Include email tasks</Label>
            <Switch
              id="include-email"
              checked={includeEmail}
              onCheckedChange={setIncludeEmail}
            />
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? "Saving..." : "Save Preferences"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
