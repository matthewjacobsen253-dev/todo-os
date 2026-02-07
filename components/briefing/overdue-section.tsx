"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPriorityColor } from "@/lib/utils";
import type { BriefingContent } from "@/types";

interface OverdueSectionProps {
  items: BriefingContent["overdue"];
  onTaskClick?: (taskId: string) => void;
}

export function OverdueSection({ items, onTaskClick }: OverdueSectionProps) {
  if (items.length === 0) return null;

  return (
    <Card className="border-destructive/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg text-destructive">Overdue</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.task_id}
              className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 rounded-lg p-2 -mx-2 transition-colors"
              onClick={() => onTaskClick?.(item.task_id)}
              data-testid={`overdue-${item.task_id}`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{item.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge
                    variant="secondary"
                    className={`text-xs ${getPriorityColor(item.priority)}`}
                  >
                    {item.priority}
                  </Badge>
                  <Badge
                    variant="destructive"
                    className="text-xs"
                    data-testid={`days-overdue-${item.task_id}`}
                  >
                    {item.days_overdue >= 7
                      ? `Critical: ${item.days_overdue}d overdue`
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
