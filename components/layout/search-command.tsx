'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Inbox,
  Calendar,
  Zap,
  Clock,
  FolderOpen,
  Tag,
  Search,
  ArrowRight,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchResult {
  id: string;
  type: 'task' | 'project' | 'action';
  title: string;
  description?: string;
  icon: React.ReactNode;
}

interface SearchCommandProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  searchResults?: SearchResult[];
  onSearch?: (query: string) => void;
}

// Mock data for demo
const mockResults: SearchResult[] = [
  {
    id: '1',
    type: 'task',
    title: 'Complete project proposal',
    description: 'Due today at 5 PM',
    icon: <FileText className="h-4 w-4" />,
  },
  {
    id: '2',
    type: 'task',
    title: 'Review team feedback',
    description: 'From Sarah Chen',
    icon: <FileText className="h-4 w-4" />,
  },
  {
    id: '3',
    type: 'project',
    title: 'Q1 Planning',
    description: '8 tasks',
    icon: <FolderOpen className="h-4 w-4" />,
  },
  {
    id: '4',
    type: 'project',
    title: 'Feature Development',
    description: '15 tasks',
    icon: <FolderOpen className="h-4 w-4" />,
  },
];

const recentSearches = [
  'urgent tasks',
  'this week',
  'project alpha',
  'team feedback',
];

const quickActions: Array<{
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  shortcut?: string;
  action: string;
}> = [
  {
    id: '1',
    title: 'Create New Task',
    description: 'Add a new task to your inbox',
    icon: <Plus className="h-4 w-4" />,
    shortcut: 'Cmd+N',
    action: '/inbox?new=true',
  },
  {
    id: '2',
    title: 'Go to Inbox',
    description: 'View all your tasks',
    icon: <Inbox className="h-4 w-4" />,
    action: '/inbox',
  },
  {
    id: '3',
    title: 'Today View',
    description: 'See tasks due today',
    icon: <Calendar className="h-4 w-4" />,
    action: '/today',
  },
  {
    id: '4',
    title: 'Generate Briefing',
    description: 'Get your daily briefing',
    icon: <Zap className="h-4 w-4" />,
    action: '/briefing',
  },
  {
    id: '5',
    title: 'Review Queue',
    description: 'Check extracted tasks',
    icon: <Clock className="h-4 w-4" />,
    action: '/review',
  },
];

export const SearchCommand: React.FC<SearchCommandProps> = ({
  open = false,
  onOpenChange,
  searchResults = mockResults,
  onSearch,
}) => {
  const [isOpen, setIsOpen] = useState(open);
  const [searchQuery, setSearchQuery] = useState('');
  const [displayedResults, setDisplayedResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsOpen(open);
  }, [open]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setSelectedIndex(0);

    if (!value.trim()) {
      setDisplayedResults([]);
    } else {
      onSearch?.(value);
      // Mock filtering
      const filtered = searchResults.filter((result) =>
        result.title.toLowerCase().includes(value.toLowerCase())
      );
      setDisplayedResults(filtered);
    }
  };

  const handleSelect = (result: SearchResult | (typeof quickActions)[0]) => {
    if ('action' in result) {
      router.push(result.action);
    } else {
      router.push(`/tasks/${result.id}`);
    }
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleNavigate = (direction: 'up' | 'down') => {
    const allItems = [
      ...displayedResults,
      ...quickActions,
    ];

    if (direction === 'down') {
      setSelectedIndex((prev) => (prev + 1) % allItems.length);
    } else {
      setSelectedIndex((prev) => (prev - 1 + allItems.length) % allItems.length);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      handleNavigate('down');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      handleNavigate('up');
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const allItems = [...displayedResults, ...quickActions];
      if (allItems[selectedIndex]) {
        handleSelect(allItems[selectedIndex]);
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="overflow-hidden p-0 shadow-lg">
        <div className="flex flex-col h-screen sm:h-auto">
          {/* Search Input */}
          <div className="flex items-center border-b border-border px-4 py-3">
            <Search className="h-4 w-4 text-muted-foreground mr-3" />
            <Input
              ref={inputRef}
              placeholder="Search tasks, projects, or commands..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              className="border-0 shadow-none focus-visible:ring-0 text-base"
              autoFocus
            />
          </div>

          {/* Results */}
          <div className="overflow-y-auto flex-1">
            {!searchQuery && (
              <>
                {/* Quick Actions */}
                <div className="p-2">
                  <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Quick Actions
                  </p>
                  <div className="space-y-1">
                    {quickActions.map((action, idx) => (
                      <button
                        key={action.id}
                        onClick={() => handleSelect(action)}
                        className={cn(
                          'w-full text-left px-2 py-2 rounded-md hover:bg-muted transition-colors flex items-center justify-between',
                          selectedIndex === idx && 'bg-muted'
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
                          <Badge variant="secondary" className="text-xs ml-2 flex-shrink-0">
                            {action.shortcut}
                          </Badge>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Recent Searches */}
                <div className="p-2 border-t border-border">
                  <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Recent Searches
                  </p>
                  <div className="space-y-1">
                    {recentSearches.map((search, idx) => (
                      <button
                        key={search}
                        onClick={() => handleSearch(search)}
                        className={cn(
                          'w-full text-left px-2 py-2 rounded-md hover:bg-muted transition-colors flex items-center gap-3',
                          selectedIndex === quickActions.length + idx && 'bg-muted'
                        )}
                      >
                        <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm text-foreground">{search}</span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground ml-auto flex-shrink-0 opacity-0 group-hover:opacity-100" />
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {searchQuery && displayedResults.length === 0 && (
              <div className="p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  No results found for &ldquo;{searchQuery}&rdquo;
                </p>
              </div>
            )}

            {searchQuery && displayedResults.length > 0 && (
              <div className="p-2">
                <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Search Results
                </p>
                <div className="space-y-1">
                  {displayedResults.map((result, idx) => (
                    <button
                      key={result.id}
                      onClick={() => handleSelect(result)}
                      className={cn(
                        'w-full text-left px-2 py-2 rounded-md hover:bg-muted transition-colors flex items-center gap-3',
                        selectedIndex === idx && 'bg-muted'
                      )}
                    >
                      <span className="text-muted-foreground flex-shrink-0">
                        {result.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground line-clamp-1">
                          {result.title}
                        </p>
                        {result.description && (
                          <p className="text-xs text-muted-foreground">
                            {result.description}
                          </p>
                        )}
                      </div>
                      <Badge variant="secondary" className="text-xs capitalize flex-shrink-0">
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
                </kbd>{' '}
                Navigate
              </span>
              <span>
                <kbd className="px-1.5 py-0.5 rounded bg-background border border-border">
                  ↵
                </kbd>{' '}
                Select
              </span>
              <span>
                <kbd className="px-1.5 py-0.5 rounded bg-background border border-border">
                  Esc
                </kbd>{' '}
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
