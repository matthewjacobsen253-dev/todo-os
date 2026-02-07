'use client';

import React, { useState, useEffect } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  Mail,
  CheckSquare,
  Zap,
  X,
} from 'lucide-react';
import type { NotificationType } from '@/types';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  actionUrl?: string;
  timestamp: string;
  icon?: React.ReactNode;
}

interface NotificationPanelProps {
  notifications?: NotificationItem[];
  onMarkAsRead?: (id: string) => void;
  onMarkAllAsRead?: () => void;
  onDismiss?: (id: string) => void;
}

const NotificationIcon: React.FC<{ type: NotificationType }> = ({ type }) => {
  const icons: Record<NotificationType, React.ReactNode> = {
    task_assigned: <CheckSquare className="h-4 w-4 text-blue-600" />,
    task_due: <AlertCircle className="h-4 w-4 text-amber-600" />,
    task_mentioned: <Mail className="h-4 w-4 text-purple-600" />,
    briefing_ready: <Zap className="h-4 w-4 text-yellow-600" />,
    workspace_invite: <AlertCircle className="h-4 w-4 text-green-600" />,
    scan_complete: <Mail className="h-4 w-4 text-blue-600" />,
    review_needed: <CheckCircle2 className="h-4 w-4 text-orange-600" />,
  };

  return icons[type] || <Bell className="h-4 w-4" />;
};

const formatRelativeTime = (dateStr: string): string => {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
};

// Mock notifications for demo
const mockNotifications: NotificationItem[] = [
  {
    id: '1',
    type: 'briefing_ready',
    title: 'Your Daily Briefing is Ready',
    message:
      'Your morning briefing has been generated with 3 top outcomes and 2 critical tasks.',
    read: false,
    actionUrl: '/briefing',
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    type: 'review_needed',
    title: '4 Tasks Need Review',
    message: 'You have 4 extracted tasks from emails waiting for approval.',
    read: false,
    actionUrl: '/review',
    timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
  },
  {
    id: '3',
    type: 'task_assigned',
    title: 'New Task Assigned',
    message: 'Sarah Chen assigned you "Review Q1 Strategy" task.',
    read: true,
    actionUrl: '/tasks',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '4',
    type: 'task_due',
    title: 'Task Due Tomorrow',
    message: 'Your task "Complete Project Proposal" is due tomorrow at 5 PM.',
    read: true,
    actionUrl: '/tasks',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '5',
    type: 'scan_complete',
    title: 'Email Scan Completed',
    message: 'Successfully scanned 12 emails and extracted 3 new tasks.',
    read: true,
    actionUrl: '/review',
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export const NotificationPanel: React.FC<NotificationPanelProps> = ({
  notifications = mockNotifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onDismiss,
}) => {
  const [open, setOpen] = useState(false);
  const [localNotifications, setLocalNotifications] = useState(notifications);
  const router = useRouter();

  useEffect(() => {
    setLocalNotifications(notifications);
  }, [notifications]);

  const unreadCount = localNotifications.filter((n) => !n.read).length;

  const handleNotificationClick = (notification: NotificationItem) => {
    if (!notification.read) {
      onMarkAsRead?.(notification.id);
      setLocalNotifications(
        localNotifications.map((n) =>
          n.id === notification.id ? { ...n, read: true } : n
        )
      );
    }
    if (notification.actionUrl) {
      router.push(notification.actionUrl);
      setOpen(false);
    }
  };

  const handleDismiss = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    onDismiss?.(id);
    setLocalNotifications(
      localNotifications.filter((n) => n.id !== id)
    );
  };

  const handleMarkAllAsRead = () => {
    onMarkAllAsRead?.();
    setLocalNotifications(
      localNotifications.map((n) => ({ ...n, read: true }))
    );
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 p-0">
        {/* Header */}
        <div className="sticky top-0 bg-background border-b border-border p-4 space-y-3 z-10">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Notifications</h2>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                className="text-xs"
              >
                Mark all as read
              </Button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <div className="max-h-96 overflow-y-auto">
          {localNotifications.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <CheckCircle2 className="h-8 w-8 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">
                All caught up!
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {localNotifications.map((notification, idx) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={cn(
                    'w-full px-4 py-3 text-left hover:bg-muted transition-colors',
                    !notification.read && 'bg-muted/50'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex-shrink-0">
                      <NotificationIcon type={notification.type} />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-sm text-foreground line-clamp-1">
                          {notification.title}
                        </p>
                        <button
                          onClick={(e) =>
                            handleDismiss(e, notification.id)
                          }
                          className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground pt-1">
                        {formatRelativeTime(notification.timestamp)}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="h-2 w-2 rounded-full bg-blue-600 flex-shrink-0 mt-1.5" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {localNotifications.length > 0 && (
          <>
            <Separator />
            <div className="p-3">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={() => {
                  router.push('/notifications');
                  setOpen(false);
                }}
              >
                View all notifications
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationPanel;
