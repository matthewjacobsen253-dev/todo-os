"use client";

import { Clock, Inbox } from "lucide-react";
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
  // Show positive message when not waiting on anything
  if (items.length === 0) {
    return (
      <Card className="border-dashed bg-muted/30">
        <CardContent className="pt-6 pb-6 text-center">
          <Inbox className="h-8 w-8 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">
            No blockers — everything is in your hands
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber-200/50 bg-gradient-to-br from-amber-50/50 to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5 text-amber-600" />
          Waiting On
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {items.length} task{items.length !== 1 ? "s" : ""} blocked or awaiting
          response
        </p>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.task_id}
              className="flex items-start gap-3 cursor-pointer hover:bg-background/80 rounded-lg p-2.5 -mx-2 transition-colors group"
              onClick={() => onTaskClick?.(item.task_id)}
              data-testid={`waiting-${item.task_id}`}
            >
              <div className="h-2.5 w-2.5 rounded-full bg-amber-500 shrink-0 mt-1.5 animate-pulse" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium group-hover:text-amber-700 transition-colors">
                  {item.title}
                </p>
                <p className="text-xs text-amber-600/70 mt-0.5 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
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
