"use client";

import { useState } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface FeedbackWidgetProps {
  currentFeedback: "thumbs_up" | "thumbs_down" | null;
  onFeedback: (feedback: "thumbs_up" | "thumbs_down", notes?: string) => void;
}

export function FeedbackWidget({
  currentFeedback,
  onFeedback,
}: FeedbackWidgetProps) {
  const [notesOpen, setNotesOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [pendingFeedback, setPendingFeedback] = useState<
    "thumbs_up" | "thumbs_down" | null
  >(null);

  const handleThumbsUp = () => {
    onFeedback("thumbs_up");
  };

  const handleThumbsDown = () => {
    setPendingFeedback("thumbs_down");
    setNotesOpen(true);
  };

  const submitWithNotes = () => {
    if (pendingFeedback) {
      onFeedback(pendingFeedback, notes || undefined);
    }
    setNotesOpen(false);
    setNotes("");
    setPendingFeedback(null);
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Was this helpful?</span>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleThumbsUp}
        className={cn(
          currentFeedback === "thumbs_up" && "text-green-600 bg-green-50",
        )}
        data-testid="feedback-thumbs-up"
      >
        <ThumbsUp className="h-4 w-4" />
      </Button>
      <Popover open={notesOpen} onOpenChange={setNotesOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleThumbsDown}
            className={cn(
              currentFeedback === "thumbs_down" && "text-red-600 bg-red-50",
            )}
            data-testid="feedback-thumbs-down"
          >
            <ThumbsDown className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72">
          <div className="space-y-3">
            <p className="text-sm font-medium">What could be improved?</p>
            <Textarea
              placeholder="Optional feedback..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[60px]"
            />
            <Button size="sm" onClick={submitWithNotes} className="w-full">
              Submit
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
