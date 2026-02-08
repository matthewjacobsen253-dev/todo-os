"use client";

import { useEffect, useState, useMemo, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Inbox,
  CalendarDays,
  CalendarRange,
  Zap,
  FolderKanban,
  ClipboardCheck,
  Settings,
  Bell,
  Search,
  Plus,
  LogOut,
  Menu,
  ChevronLeft,
  BellOff,
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { WorkspaceSwitcher } from "@/components/layout/workspace-switcher";
import { SearchCommand } from "@/components/layout/search-command";
import { QuickCaptureDialog } from "@/components/tasks/quick-capture-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useUI,
  useUIActions,
  useReviewQueue,
  useWorkspaceActions,
  useTasks,
} from "@/store";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useProjectsWithSync } from "@/hooks/useProjects";
import { useToast } from "@/components/ui/toast";
import { categorizeTodayTasks, cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");

  const { quickCaptureOpen, commandPaletteOpen } = useUI();
  const { toggleQuickCapture, toggleCommandPalette } = useUIActions();
  const { fetchWorkspaces } = useWorkspaceActions();
  const { projects } = useProjectsWithSync();
  const { count: reviewCount } = useReviewQueue();
  const { addToast } = useToast();
  const { tasks } = useTasks();

  // Register keyboard shortcuts
  useKeyboardShortcuts();

  // Compute badge counts from store tasks
  const inboxCount = useMemo(
    () => tasks.filter((t) => t.status === "inbox").length,
    [tasks],
  );

  const todayCount = useMemo(() => {
    const { overdue, dueToday } = categorizeTodayTasks(tasks);
    return overdue.length + dueToday.length;
  }, [tasks]);

  const navItems: NavItem[] = [
    {
      label: "Inbox",
      href: "/inbox",
      icon: Inbox,
      badge: inboxCount > 0 ? inboxCount : undefined,
    },
    {
      label: "Today",
      href: "/today",
      icon: CalendarDays,
      badge: todayCount > 0 ? todayCount : undefined,
    },
    { label: "Upcoming", href: "/upcoming", icon: CalendarRange },
    { label: "Briefing", href: "/briefing", icon: Zap },
    { label: "Projects", href: "/projects", icon: FolderKanban },
    {
      label: "Review Queue",
      href: "/review",
      icon: ClipboardCheck,
      badge: reviewCount > 0 ? reviewCount : undefined,
    },
  ];

  useEffect(() => {
    checkAuth();
    fetchWorkspaces();
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleResize = () => {
    setIsMobile(window.innerWidth < 768);
  };

  const checkAuth = async () => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setIsAuthenticated(true);
        setUserEmail(user.email || "");
      } else {
        setIsAuthenticated(false);
        router.push("/auth/login");
      }
    } catch {
      setIsAuthenticated(false);
      router.push("/auth/login");
    }
  };

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/auth/login");
      router.refresh();
    } catch {
      addToast("Failed to log out. Please try again.", "error");
    }
  };

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-4 focus:left-4 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:text-sm focus:font-medium"
      >
        Skip to main content
      </a>

      {/* Sidebar */}
      <aside
        className={`bg-card border-r transition-all duration-300 ${
          sidebarOpen ? "w-64" : "w-20"
        } ${isMobile && !sidebarOpen ? "hidden" : ""} overflow-hidden flex flex-col`}
      >
        <div className="p-4 space-y-4 flex-1 flex flex-col">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            className="hidden md:flex items-center justify-end w-full h-10 hover:bg-muted rounded-lg transition text-muted-foreground hover:text-foreground"
          >
            {sidebarOpen ? (
              <ChevronLeft className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>

          <WorkspaceSwitcher />

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-3 px-3 py-2.5 rounded-lg transition",
                    isActive
                      ? "bg-muted text-foreground font-semibold"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                  )}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {sidebarOpen && (
                    <>
                      <span className="flex-1 text-sm font-medium truncate">
                        {item.label}
                      </span>
                      {item.badge !== undefined && item.badge > 0 && (
                        <span className="px-2 py-0.5 bg-primary text-primary-foreground text-xs font-semibold rounded-full flex-shrink-0">
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Project links */}
          {sidebarOpen && projects.length > 0 && (
            <div className="space-y-1">
              <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Projects
              </p>
              {projects.slice(0, 5).map((project) => {
                const isActive = pathname === `/projects/${project.id}`;
                return (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className={cn(
                      "group flex items-center gap-3 px-3 py-2 rounded-lg transition",
                      isActive
                        ? "bg-muted text-foreground font-semibold"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                    )}
                  >
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: project.color }}
                    />
                    <span className="text-sm truncate">{project.name}</span>
                  </Link>
                );
              })}
              {projects.length > 5 && (
                <Link
                  href="/projects"
                  className="block px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition"
                >
                  View all ({projects.length})
                </Link>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t space-y-2">
          <Link
            href="/settings"
            className={cn(
              "group flex items-center gap-3 px-3 py-2.5 rounded-lg transition",
              pathname === "/settings"
                ? "bg-muted text-foreground font-semibold"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
            )}
          >
            <Settings className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && (
              <span className="text-sm font-medium">Settings</span>
            )}
          </Link>

          {sidebarOpen && (
            <div className="px-3 py-2 bg-muted/50 rounded-lg">
              <p className="text-xs font-medium text-muted-foreground truncate">
                {userEmail}
              </p>
            </div>
          )}

          <button
            onClick={handleLogout}
            className="w-full group flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-destructive/10 transition text-muted-foreground hover:text-destructive"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span className="text-sm font-medium">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        <header className="bg-card border-b sticky top-0 z-40">
          <div className="flex items-center justify-between h-16 px-6">
            {isMobile && (
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                aria-label="Toggle navigation menu"
                className="text-muted-foreground hover:text-foreground transition md:hidden"
              >
                <Menu className="w-6 h-6" />
              </button>
            )}

            <div className="flex-1 max-w-md mx-auto px-4 md:px-6">
              <button
                onClick={toggleCommandPalette}
                className="w-full flex items-center gap-2 pl-10 pr-4 py-2 bg-muted border rounded-lg text-muted-foreground text-sm text-left relative hover:bg-muted/80 transition"
              >
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                Search tasks...
                <kbd className="ml-auto px-1.5 py-0.5 rounded bg-background border border-border text-xs">
                  ⌘K
                </kbd>
              </button>
            </div>

            <div className="flex items-center gap-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    aria-label="Notifications"
                    className="text-muted-foreground hover:text-foreground transition p-2"
                  >
                    <Bell className="w-5 h-5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <div className="p-4 text-center">
                    <BellOff className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm font-medium text-foreground">
                      No notifications
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      You&apos;re all caught up!
                    </p>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main id="main-content" className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>

        <button
          onClick={toggleQuickCapture}
          aria-label="Create new task"
          className="fixed bottom-4 right-4 sm:bottom-8 sm:right-8 md:bottom-10 md:right-10 w-14 h-14 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full shadow-lg hover:shadow-xl transition flex items-center justify-center group"
        >
          <Plus className="w-6 h-6 group-hover:scale-110 transition" />
        </button>
      </div>

      {/* Search Command Palette */}
      <SearchCommand
        open={commandPaletteOpen}
        onOpenChange={(open) => {
          if (open !== commandPaletteOpen) toggleCommandPalette();
        }}
      />

      {/* Quick Capture Dialog (layout-level for global keyboard shortcut) */}
      <QuickCaptureDialog
        open={quickCaptureOpen}
        onOpenChange={(open) => {
          if (!open && quickCaptureOpen) toggleQuickCapture();
        }}
      />
    </div>
  );
}
