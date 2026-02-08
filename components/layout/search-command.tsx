"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Inbox,
  Calendar,
  Zap,
  Clock,
  FileText,
  Search,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrentWorkspace, useUIActions } from "@/store";

interface SearchResultItem {
  id: string;
  type: "task" | "project" | "action";
  title: string;
  description?: string;
}

interface SearchCommandProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const quickActions: Array<{
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  shortcut?: string;
  action: string;
}> = [
  {
    id: "qa-1",
    title: "Create New Task",
    description: "Add a new task to your inbox",
    icon: <Plus className="h-4 w-4" />,
    shortcut: "Cmd+N",
    action: "quick-capture",
  },
  {
    id: "qa-2",
    title: "Go to Inbox",
    description: "View all your tasks",
    icon: <Inbox className="h-4 w-4" />,
    action: "/inbox",
  },
  {
    id: "qa-3",
    title: "Today View",
    description: "See tasks due today",
    icon: <Calendar className="h-4 w-4" />,
    action: "/today",
  },
  {
    id: "qa-4",
    title: "Generate Briefing",
    description: "Get your daily briefing",
    icon: <Zap className="h-4 w-4" />,
    action: "/briefing",
  },
  {
    id: "qa-5",
    title: "Review Queue",
    description: "Check extracted tasks",
    icon: <Clock className="h-4 w-4" />,
    action: "/review",
  },
];

export const SearchCommand: React.FC<SearchCommandProps> = ({
  open = false,
  onOpenChange,
}) => {
  const [isOpen, setIsOpen] = useState(open);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const currentWorkspace = useCurrentWorkspace();
  const { toggleQuickCapture, openTaskDetail } = useUIActions();

  useEffect(() => {
    setIsOpen(open);
  }, [open]);

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      setIsOpen(newOpen);
      onOpenChange?.(newOpen);
      if (!newOpen) {
        setSearchQuery("");
        setSearchResults([]);
        setSelectedIndex(0);
      }
    },
    [onOpenChange],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        handleOpenChange(true);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
      if (e.key === "Escape" && isOpen) {
        handleOpenChange(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleOpenChange]);

  // Debounced search
  const performSearch = useCallback(
    async (query: string) => {
      if (!query.trim() || !currentWorkspace?.id) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      try {
        const res = await fetch(
          `/api/tasks/search?q=${encodeURIComponent(query)}&workspace_id=${currentWorkspace.id}`,
        );
        if (res.ok) {
          const data = await res.json();
          setSearchResults(
            (data.results || []).map((r: SearchResultItem) => ({
              ...r,
              type: r.type || "task",
            })),
          );
        } else {
          setSearchResults([]);
        }
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [currentWorkspace?.id],
  );

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setSelectedIndex(0);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!value.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceRef.current = setTimeout(() => {
      performSearch(value);
    }, 300);
  };

  const handleSelect = (item: SearchResultItem | (typeof quickActions)[0]) => {
    if ("action" in item) {
      if (item.action === "quick-capture") {
        handleOpenChange(false);
        toggleQuickCapture();
      } else {
        router.push(item.action);
        handleOpenChange(false);
      }
    } else {
      // Open task detail sidebar
      openTaskDetail(item.id);
      router.push("/inbox");
      handleOpenChange(false);
    }
  };

  const getAllItems = () => {
    if (searchQuery.trim()) {
      return searchResults;
    }
    return [];
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const allItems = [
      ...getAllItems(),
      ...(!searchQuery.trim() ? quickActions : []),
    ];

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(allItems.length, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(
        (prev) => (prev - 1 + allItems.length) % Math.max(allItems.length, 1),
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (allItems[selectedIndex]) {
        handleSelect(allItems[selectedIndex]);
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className="overflow-hidden p-0 shadow-lg"
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">Search</DialogTitle>
        <div className="flex flex-col h-screen sm:h-auto">
          {/* Search Input */}
          <div className="flex items-center border-b border-border px-4 py-3">
            {isSearching ? (
              <Loader2 className="h-4 w-4 text-muted-foreground mr-3 animate-spin" />
            ) : (
              <Search className="h-4 w-4 text-muted-foreground mr-3" />
            )}
            <Input
              ref={inputRef}
              placeholder="Search tasks, projects, or commands..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              className="border-0 shadow-none focus-visible:ring-0 text-base"
              autoFocus
              role="combobox"
              aria-expanded={searchResults.length > 0 || !searchQuery}
              aria-activedescendant={
                searchQuery && searchResults.length > 0
                  ? `search-result-${selectedIndex}`
                  : !searchQuery
                    ? `quick-action-${selectedIndex}`
                    : undefined
              }
            />
          </div>

          {/* Results */}
          <div className="overflow-y-auto flex-1">
            {!searchQuery && (
              <div className="p-2">
                <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Quick Actions
                </p>
                <div className="space-y-1" role="listbox">
                  {quickActions.map((action, idx) => (
                    <button
                      key={action.id}
                      id={`quick-action-${idx}`}
                      role="option"
                      aria-selected={selectedIndex === idx}
                      onClick={() => handleSelect(action)}
                      className={cn(
                        "w-full text-left px-2 py-2 rounded-md hover:bg-muted transition-colors flex items-center justify-between",
                        selectedIndex === idx && "bg-muted",
                      )}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="text-muted-foreground flex-shrink-0">
                          {action.icon}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">
                            {action.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {action.description}
                          </p>
                        </div>
                      </div>
                      {action.shortcut && (
                        <Badge
                          variant="secondary"
                          className="text-xs ml-2 flex-shrink-0"
                        >
                          {action.shortcut}
                        </Badge>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {searchQuery && !isSearching && searchResults.length === 0 && (
              <div className="p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  No results found for &ldquo;{searchQuery}&rdquo;
                </p>
              </div>
            )}

            {searchQuery && searchResults.length > 0 && (
              <div className="p-2">
                <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Search Results
                </p>
                <div className="space-y-1" role="listbox">
                  {searchResults.map((result, idx) => (
                    <button
                      key={result.id}
                      id={`search-result-${idx}`}
                      role="option"
                      aria-selected={selectedIndex === idx}
                      onClick={() => handleSelect(result)}
                      className={cn(
                        "w-full text-left px-2 py-2 rounded-md hover:bg-muted transition-colors flex items-center gap-3",
                        selectedIndex === idx && "bg-muted",
                      )}
                    >
                      <span className="text-muted-foreground flex-shrink-0">
                        <FileText className="h-4 w-4" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground line-clamp-1">
                          {result.title}
                        </p>
                        {result.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {result.description}
                          </p>
                        )}
                      </div>
                      <Badge
                        variant="secondary"
                        className="text-xs capitalize flex-shrink-0"
                      >
                        {result.type}
                      </Badge>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer Help Text */}
          <div className="border-t border-border px-4 py-2 bg-muted/30 flex items-center justify-between text-xs text-muted-foreground">
            <div className="space-x-4">
              <span>
                <kbd className="px-1.5 py-0.5 rounded bg-background border border-border">
                  ↓↑
                </kbd>{" "}
                Navigate
              </span>
              <span>
                <kbd className="px-1.5 py-0.5 rounded bg-background border border-border">
                  ↵
                </kbd>{" "}
                Select
              </span>
              <span>
                <kbd className="px-1.5 py-0.5 rounded bg-background border border-border">
                  Esc
                </kbd>{" "}
                Close
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SearchCommand;
