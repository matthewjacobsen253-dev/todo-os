"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, getPriorityColor, getConfidenceLabel } from "@/lib/utils";
import { Check, X, Pencil, Mail } from "lucide-react";
import type { ReviewQueueItem } from "@/types";
import { ReviewEditDialog } from "./review-edit-dialog";

interface ReviewTaskCardProps {
  item: ReviewQueueItem;
  onApprove: (taskId: string, edits?: Record<string, unknown>) => void;
  onReject: (taskId: string) => void;
}

function getConfidenceColor(score: number): string {
  if (score >= 0.7) return "text-green-600 bg-green-50 dark:bg-green-900/20";
  if (score >= 0.4) return "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20";
  return "text-red-600 bg-red-50 dark:bg-red-900/20";
}

export function ReviewTaskCard({
  item,
  onApprove,
  onReject,
}: ReviewTaskCardProps) {
  const [editOpen, setEditOpen] = useState(false);

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base">{item.title}</CardTitle>
            <Badge
              className={cn(
                "text-xs flex-shrink-0",
                getConfidenceColor(item.confidence_score),
              )}
              data-testid="confidence-badge"
            >
              {getConfidenceLabel(item.confidence_score)} (
              {Math.round(item.confidence_score * 100)}%)
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="pb-3 space-y-2">
          {item.description && (
            <p className="text-sm text-muted-foreground">{item.description}</p>
          )}

          {item.priority !== "none" && (
            <Badge
              variant="secondary"
              className={cn(
                "text-xs capitalize",
                getPriorityColor(item.priority),
              )}
            >
              {item.priority}
            </Badge>
          )}

          {(item.source_email_sender || item.source_email_subject) && (
            <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md p-2">
              <Mail className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                {item.source_email_sender && (
                  <p className="truncate" data-testid="source-sender">
                    From: {item.source_email_sender}
                  </p>
                )}
                {item.source_email_subject && (
                  <p className="truncate" data-testid="source-subject">
                    Subject: {item.source_email_subject}
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="gap-2">
          <Button
            size="sm"
            onClick={() => onApprove(item.id)}
            className="gap-1"
            data-testid="approve-button"
          >
            <Check className="w-4 h-4" />
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setEditOpen(true)}
            className="gap-1"
            data-testid="edit-button"
          >
            <Pencil className="w-4 h-4" />
            Edit
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => onReject(item.id)}
            className="gap-1"
            data-testid="reject-button"
          >
            <X className="w-4 h-4" />
            Reject
          </Button>
        </CardFooter>
      </Card>

      <ReviewEditDialog
        item={item}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSave={(edits) => {
          onApprove(item.id, edits);
          setEditOpen(false);
        }}
      />
    </>
  );
}
