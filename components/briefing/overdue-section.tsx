"use client";

import { AlertCircle, PartyPopper } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPriorityColor } from "@/lib/utils";
import type { BriefingContent } from "@/types";

interface OverdueSectionProps {
  items: BriefingContent["overdue"];
  onTaskClick?: (taskId: string) => void;
}

export function OverdueSection({ items, onTaskClick }: OverdueSectionProps) {
  // Show celebration when there are no overdue items
  if (items.length === 0) {
    return (
      <Card className="border-dashed border-green-200 bg-green-50/30">
        <CardContent className="pt-6 pb-6 text-center">
          <PartyPopper className="h-8 w-8 mx-auto text-green-600/50 mb-3" />
          <p className="text-sm text-green-700">
            No overdue tasks — you&apos;re on track!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-destructive/50 bg-gradient-to-br from-destructive/5 to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg text-destructive flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          Overdue
        </CardTitle>
        <p className="text-xs text-destructive/70">
          {items.length} task{items.length !== 1 ? "s" : ""} past due date
        </p>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.task_id}
              className="flex items-center gap-3 cursor-pointer hover:bg-background/80 rounded-lg p-2.5 -mx-2 transition-colors group"
              onClick={() => onTaskClick?.(item.task_id)}
              data-testid={`overdue-${item.task_id}`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium group-hover:text-destructive transition-colors">
                  {item.title}
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  <Badge
                    variant="secondary"
                    className={`text-xs ${getPriorityColor(item.priority)}`}
                  >
                    {item.priority}
                  </Badge>
                  <Badge
                    variant="destructive"
                    className="text-xs font-medium"
                    data-testid={`days-overdue-${item.task_id}`}
                  >
                    {item.days_overdue >= 7
                      ? `🚨 Critical: ${item.days_overdue}d overdue`
                      : `${item.days_overdue}d overdue`}
                  </Badge>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
