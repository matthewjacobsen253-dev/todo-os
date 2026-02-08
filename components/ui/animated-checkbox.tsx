"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface AnimatedCheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}

export function AnimatedCheckbox({
  checked,
  onCheckedChange,
  disabled = false,
  className,
  "aria-label": ariaLabel,
}: AnimatedCheckboxProps) {
  const [isAnimating, setIsAnimating] = React.useState(false);

  const handleClick = () => {
    if (disabled) return;

    setIsAnimating(true);
    onCheckedChange(!checked);

    // Reset animation state after animation completes
    setTimeout(() => setIsAnimating(false), 400);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <button
      role="checkbox"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        "relative flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        checked
          ? "border-primary bg-primary"
          : "border-muted-foreground/40 hover:border-primary/60 bg-transparent",
        isAnimating && checked && "animate-check-bounce",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      {/* Checkmark SVG */}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn(
          "h-3 w-3 text-primary-foreground transition-all duration-200",
          checked ? "opacity-100" : "opacity-0",
          isAnimating && checked && "animate-checkmark-draw",
        )}
      >
        <path
          d="M5 12l5 5L20 7"
          className={cn(
            checked && "stroke-dasharray-[24] stroke-dashoffset-0",
            isAnimating && checked && "animate-checkmark-stroke",
          )}
          style={{
            strokeDasharray: 24,
            strokeDashoffset: checked && !isAnimating ? 0 : 24,
          }}
        />
      </svg>

      {/* Ripple effect on check */}
      {isAnimating && checked && (
        <span className="absolute inset-0 animate-ripple rounded-full bg-primary/30" />
      )}
    </button>
  );
}

// Also export a simpler version that matches the existing checkbox API
export function TaskCheckbox({
  checked,
  onCheckedChange,
  disabled,
  className,
  "aria-label": ariaLabel,
}: AnimatedCheckboxProps) {
  return (
    <AnimatedCheckbox
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      className={className}
      aria-label={ariaLabel}
    />
  );
}
