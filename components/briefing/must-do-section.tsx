"use client";

import { CheckSquare, Coffee } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, getPriorityColor } from "@/lib/utils";
import type { BriefingContent } from "@/types";

interface MustDoSectionProps {
  items: BriefingContent["must_do"];
  onTaskClick?: (taskId: string) => void;
}

export function MustDoSection({ items, onTaskClick }: MustDoSectionProps) {
  // Show encouraging message when there are no must-dos
  if (items.length === 0) {
    return (
      <Card className="border-dashed bg-muted/30">
        <CardContent className="pt-6 pb-6 text-center">
          <Coffee className="h-8 w-8 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">
            Nothing urgent today. Enjoy your breathing room!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <CheckSquare className="h-5 w-5 text-orange-500" />
          Must Do Today
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {items.length} task{items.length !== 1 ? "s" : ""} requiring attention
        </p>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.task_id}
              className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 rounded-lg p-2.5 -mx-2 transition-colors group"
              onClick={() => onTaskClick?.(item.task_id)}
              data-testid={`must-do-${item.task_id}`}
            >
              <div className="h-2.5 w-2.5 rounded-full bg-orange-500 shrink-0 group-hover:scale-125 transition-transform" />
              <span className="flex-1 text-sm font-medium group-hover:text-primary transition-colors">
                {item.title}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <Badge
                  variant="outline"
                  className={`text-xs ${getPriorityColor(item.priority)}`}
                >
                  {item.priority}
                </Badge>
                {item.due_date && (
                  <Badge variant="secondary" className="text-xs">
                    {formatDate(item.due_date)}
                  </Badge>
                )}
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
