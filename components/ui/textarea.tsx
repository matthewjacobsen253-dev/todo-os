import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  autoResize?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      label,
      error,
      helperText,
      autoResize = false,
      id,
      onChange,
      ...props
    },
    ref,
  ) => {
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (autoResize && textareaRef.current) {
        textareaRef.current.style.height = "auto";
        textareaRef.current.style.height =
          Math.max(textareaRef.current.scrollHeight, 80) + "px";
      }
      onChange?.(e);
    };

    React.useEffect(() => {
      if (autoResize && textareaRef.current) {
        textareaRef.current.style.height = "auto";
        textareaRef.current.style.height =
          Math.max(textareaRef.current.scrollHeight, 80) + "px";
      }
    }, [autoResize]);

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={id}
            className="mb-2 block text-sm font-medium text-foreground"
          >
            {label}
          </label>
        )}
        <textarea
          className={cn(
            "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm resize-none",
            error && "border-red-500 focus-visible:ring-red-500",
            className,
          )}
          ref={(el) => {
            if (typeof ref === "function") {
              ref(el);
            } else if (ref) {
              ref.current = el;
            }
            if (textareaRef) {
              textareaRef.current = el;
            }
          }}
          onChange={handleChange}
          id={id}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm font-medium text-red-500">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1 text-sm text-muted-foreground">{helperText}</p>
        )}
      </div>
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
