"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BriefingContent } from "@/types";

interface WaitingOnSectionProps {
  items: BriefingContent["waiting_on"];
  onTaskClick?: (taskId: string) => void;
}

export function WaitingOnSection({
  items,
  onTaskClick,
}: WaitingOnSectionProps) {
  if (items.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Waiting On</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.task_id}
              className="flex items-start gap-3 cursor-pointer hover:bg-muted/50 rounded-lg p-2 -mx-2 transition-colors"
              onClick={() => onTaskClick?.(item.task_id)}
            >
              <div className="h-2 w-2 rounded-full bg-amber-500 shrink-0 mt-1.5" />
              <div className="min-w-0">
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {item.waiting_for}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
