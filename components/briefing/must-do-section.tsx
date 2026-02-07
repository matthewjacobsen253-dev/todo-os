"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import type { BriefingContent } from "@/types";

interface MustDoSectionProps {
  items: BriefingContent["must_do"];
  onTaskClick?: (taskId: string) => void;
}

export function MustDoSection({ items, onTaskClick }: MustDoSectionProps) {
  if (items.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Must Do Today</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.task_id}
              className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 rounded-lg p-2 -mx-2 transition-colors"
              onClick={() => onTaskClick?.(item.task_id)}
            >
              <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
              <span className="flex-1 text-sm font-medium">{item.title}</span>
              {item.due_date && (
                <Badge variant="outline" className="text-xs shrink-0">
                  {formatDate(item.due_date)}
                </Badge>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
