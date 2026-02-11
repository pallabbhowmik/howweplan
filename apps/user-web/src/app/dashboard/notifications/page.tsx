'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Filter,
  Loader2,
  MessageSquare,
  Calendar,
  MapPin,
  CreditCard,
  Star,
  AlertCircle,
  Clock,
  ChevronRight,
  Sparkles,
  Users,
  FileText,
  Settings,
  RefreshCw,
  Inbox,
  BellOff,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useUserSession } from '@/lib/user/session';
import { 
  fetchUserNotifications, 
  markNotificationRead, 
  type Notification 
} from '@/lib/data/api';

type NotificationFilter = 'all' | 'unread' | 'proposals' | 'messages' | 'bookings';

const POLL_INTERVAL = 30000; // 30 seconds for real-time updates

import { usePageTitle } from '@/hooks/use-page-title';

export default function NotificationsPage() {
  usePageTitle('Notifications');
  const { user, loading: userLoading } = useUserSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<NotificationFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isPolling, setIsPolling] = useState(true);

  const loadNotifications = useCallback(async (silent = false) => {
    if (!user?.userId) return;
    
    try {
      const data = await fetchUserNotifications(user.userId, 100);
      setNotifications(prev => {
        // Check if there are new notifications
        const newNotifications = data.filter(
          n => !prev.find(p => p.id === n.id)
        );
        if (newNotifications.length > 0 && !silent) {
          // Could trigger a toast or sound here
        }
        return data;
      });
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.userId]);

  // Initial load
  useEffect(() => {
    if (user?.userId) {
      loadNotifications();
    }
  }, [user?.userId, loadNotifications]);

  // Real-time polling
  useEffect(() => {
    if (!user?.userId || !isPolling) return;

    const interval = setInterval(() => {
      loadNotifications(true); // Silent update
    }, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [user?.userId, isPolling, loadNotifications]);

  // Pause polling when tab is not visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPolling(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const handleMarkAsRead = async (notificationId: string) => {
    await markNotificationRead(notificationId);
    setNotifications(prev =>
      prev.map(n =>
        n.id === notificationId
          ? { ...n, isRead: true, readAt: new Date().toISOString() }
          : n
      )
    );
  };

  const handleMarkAllAsRead = async () => {
    setMarkingAllRead(true);
    try {
      const unreadNotifications = notifications.filter(n => !n.isRead);
      await Promise.all(unreadNotifications.map(n => markNotificationRead(n.id)));
      setNotifications(prev =>
        prev.map(n => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
      );
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    } finally {
      setMarkingAllRead(false);
    }
  };

  const handleMarkSelectedAsRead = async () => {
    try {
      await Promise.all(Array.from(selectedIds).map(id => markNotificationRead(id)));
      setNotifications(prev =>
        prev.map(n =>
          selectedIds.has(n.id)
            ? { ...n, isRead: true, readAt: new Date().toISOString() }
            : n
        )
      );
      setSelectedIds(new Set());
    } catch (error) {
      console.error('Failed to mark selected as read:', error);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === filteredNotifications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredNotifications.map(n => n.id)));
    }
  };

  // Filter notifications
  const filteredNotifications = notifications.filter(n => {
    // Apply type filter
    if (filter === 'unread' && n.isRead) return false;
    if (filter === 'proposals' && !n.type.includes('proposal') && !n.type.includes('agent')) return false;
    if (filter === 'messages' && !n.type.includes('message')) return false;
    if (filter === 'bookings' && !n.type.includes('booking') && !n.type.includes('payment')) return false;
    
    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        n.title.toLowerCase().includes(query) ||
        n.body.toLowerCase().includes(query)
      );
    }
    
    return true;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const stats = {
    total: notifications.length,
    unread: unreadCount,
    proposals: notifications.filter(n => n.type.includes('proposal') || n.type.includes('agent')).length,
    messages: notifications.filter(n => n.type.includes('message')).length,
    bookings: notifications.filter(n => n.type.includes('booking') || n.type.includes('payment')).length,
  };

  if (userLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-500">Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-purple-900 text-transparent bg-clip-text">
              Notifications
            </h1>
            {isPolling && (
              <span className="flex items-center gap-1.5 px-2 py-1 bg-green-50 border border-green-200 rounded-full text-xs text-green-700 font-medium">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Live
              </span>
            )}
          </div>
          <p className="text-slate-500 mt-1 flex items-center gap-2">
            Stay updated on your travel requests and bookings
            <span className="text-xs text-slate-400">
              • Updated {lastUpdated.toLocaleTimeString()}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="gap-2"
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            Refresh
          </Button>
          <Link href="/dashboard/settings">
            <Button variant="outline" size="sm" className="gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatsCard
          label="Total"
          value={stats.total}
          icon={Bell}
          active={filter === 'all'}
          onClick={() => setFilter('all')}
        />
        <StatsCard
          label="Unread"
          value={stats.unread}
          icon={Inbox}
          active={filter === 'unread'}
          onClick={() => setFilter('unread')}
          highlight={stats.unread > 0}
        />
        <StatsCard
          label="Proposals"
          value={stats.proposals}
          icon={FileText}
          active={filter === 'proposals'}
          onClick={() => setFilter('proposals')}
        />
        <StatsCard
          label="Messages"
          value={stats.messages}
          icon={MessageSquare}
          active={filter === 'messages'}
          onClick={() => setFilter('messages')}
        />
        <StatsCard
          label="Bookings"
          value={stats.bookings}
          icon={Calendar}
          active={filter === 'bookings'}
          onClick={() => setFilter('bookings')}
        />
      </div>

      {/* Main Content */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="border-b bg-slate-50/50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {selectedIds.size > 0 ? (
                <>
                  <span className="text-sm text-slate-500">
                    {selectedIds.size} selected
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleMarkSelectedAsRead}
                    className="gap-2"
                  >
                    <Check className="h-4 w-4" />
                    Mark as Read
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedIds(new Set())}
                  >
                    Clear
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={selectAll}
                    disabled={filteredNotifications.length === 0}
                  >
                    Select All
                  </Button>
                  {unreadCount > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleMarkAllAsRead}
                      disabled={markingAllRead}
                      className="gap-2"
                    >
                      {markingAllRead ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCheck className="h-4 w-4" />
                      )}
                      Mark All Read
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filteredNotifications.length === 0 ? (
            <EmptyState filter={filter} searchQuery={searchQuery} />
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredNotifications.map((notification) => (
                <NotificationRow
                  key={notification.id}
                  notification={notification}
                  selected={selectedIds.has(notification.id)}
                  onToggleSelect={() => toggleSelect(notification.id)}
                  onMarkAsRead={() => handleMarkAsRead(notification.id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Components
// ============================================================================

function StatsCard({
  label,
  value,
  icon: Icon,
  active,
  onClick,
  highlight,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  active?: boolean;
  onClick?: () => void;
  highlight?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "p-4 rounded-xl border transition-all text-left",
        active
          ? "bg-blue-50 border-blue-200 ring-2 ring-blue-500/20"
          : "bg-white hover:bg-slate-50 border-slate-200",
        highlight && !active && "border-orange-200 bg-orange-50/50"
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          "p-2 rounded-lg",
          active ? "bg-blue-100" : highlight ? "bg-orange-100" : "bg-slate-100"
        )}>
          <Icon className={cn(
            "h-4 w-4",
            active ? "text-blue-600" : highlight ? "text-orange-600" : "text-slate-600"
          )} />
        </div>
        <div>
          <p className={cn(
            "text-2xl font-bold",
            active ? "text-blue-600" : highlight ? "text-orange-600" : "text-slate-900"
          )}>
            {value}
          </p>
          <p className="text-xs text-slate-500">{label}</p>
        </div>
      </div>
    </button>
  );
}

function NotificationRow({
  notification,
  selected,
  onToggleSelect,
  onMarkAsRead,
}: {
  notification: Notification;
  selected: boolean;
  onToggleSelect: () => void;
  onMarkAsRead: () => void;
}) {
  const icon = getNotificationIcon(notification.type);
  const href = getNotificationHref(notification);
  const timeAgo = formatTimeAgo(notification.createdAt);

  return (
    <div
      className={cn(
        "flex items-start gap-4 p-4 transition-colors hover:bg-slate-50",
        !notification.isRead && "bg-blue-50/30",
        selected && "bg-blue-50"
      )}
    >
      {/* Checkbox */}
      <button
        onClick={onToggleSelect}
        className={cn(
          "mt-1 h-5 w-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0",
          selected
            ? "bg-blue-600 border-blue-600 text-white"
            : "border-slate-300 hover:border-blue-400"
        )}
      >
        {selected && <Check className="h-3 w-3" />}
      </button>

      {/* Icon */}
      <div className={cn(
        "p-2.5 rounded-xl flex-shrink-0",
        !notification.isRead ? "bg-blue-100" : "bg-slate-100"
      )}>
        <span className="text-xl">{icon}</span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className={cn(
                "font-semibold truncate",
                !notification.isRead ? "text-slate-900" : "text-slate-700"
              )}>
                {notification.title}
              </h3>
              {!notification.isRead && (
                <span className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />
              )}
            </div>
            <p className="text-sm text-slate-600 mt-0.5 line-clamp-2">
              {notification.body}
            </p>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {timeAgo}
              </span>
              <Badge variant="outline" className="text-xs">
                {formatNotificationType(notification.type)}
              </Badge>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {!notification.isRead && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onMarkAsRead}
                className="h-8 w-8 p-0"
                title="Mark as read"
              >
                <Check className="h-4 w-4 text-slate-400 hover:text-blue-600" />
              </Button>
            )}
            {href && (
              <Link href={href}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  title="View details"
                >
                  <ChevronRight className="h-4 w-4 text-slate-400 hover:text-blue-600" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ filter, searchQuery }: { filter: NotificationFilter; searchQuery: string }) {
  let message = "You're all caught up!";
  let description = "No notifications to show. We'll notify you when something happens.";
  let icon = <Bell className="h-12 w-12 text-slate-300" />;

  if (searchQuery) {
    message = "No results found";
    description = `No notifications matching "${searchQuery}"`;
    icon = <Search className="h-12 w-12 text-slate-300" />;
  } else if (filter === 'unread') {
    message = "All caught up!";
    description = "You have no unread notifications.";
    icon = <CheckCheck className="h-12 w-12 text-green-400" />;
  } else if (filter === 'proposals') {
    message = "No proposal notifications";
    description = "You'll be notified when travel advisors send you proposals.";
    icon = <FileText className="h-12 w-12 text-slate-300" />;
  } else if (filter === 'messages') {
    message = "No message notifications";
    description = "You'll be notified when you receive new messages.";
    icon = <MessageSquare className="h-12 w-12 text-slate-300" />;
  } else if (filter === 'bookings') {
    message = "No booking notifications";
    description = "You'll be notified about booking confirmations and updates.";
    icon = <Calendar className="h-12 w-12 text-slate-300" />;
  }

  return (
    <div className="py-16 text-center">
      <div className="mx-auto mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-slate-700">{message}</h3>
      <p className="text-slate-500 mt-1 max-w-sm mx-auto">{description}</p>
      {filter !== 'all' && (
        <Button
          variant="link"
          className="mt-4"
          onClick={() => window.location.reload()}
        >
          View all notifications
        </Button>
      )}
    </div>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

function getNotificationIcon(type: string): string {
  const iconMap: Record<string, string> = {
    'proposal_received': '📋',
    'agents_matched': '⚡',
    'booking_confirmed': '✅',
    'booking_cancelled': '❌',
    'message_received': '💬',
    'request_expired': '⏰',
    'request_submitted': '🚀',
    'payment_received': '💰',
    'trip_reminder': '🔔',
    'review_request': '⭐',
    'itinerary_updated': '📝',
    'price_changed': '💵',
    'agent_response': '👤',
  };
  return iconMap[type] || '📬';
}

function getNotificationHref(notification: Notification): string | null {
  const { type, data } = notification;

  if (type.includes('proposal') || type.includes('agent') || type.includes('request') || type.includes('itinerary')) {
    if (data.requestId) return `/dashboard/requests/${data.requestId}`;
    return '/dashboard/requests';
  }

  if (type.includes('booking') || type.includes('trip') || type.includes('payment')) {
    if (data.bookingId) return `/dashboard/bookings/${data.bookingId}`;
    return '/dashboard/bookings';
  }

  if (type.includes('message')) {
    if (data.conversationId) return `/dashboard/messages?conversation=${data.conversationId}`;
    return '/dashboard/messages';
  }

  if (type.includes('review')) {
    if (data.bookingId) return `/dashboard/bookings/${data.bookingId}`;
    return '/dashboard/bookings';
  }

  return null;
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
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
}

function formatNotificationType(type: string): string {
  const typeMap: Record<string, string> = {
    'proposal_received': 'Proposal',
    'agents_matched': 'Match',
    'booking_confirmed': 'Booking',
    'booking_cancelled': 'Booking',
    'message_received': 'Message',
    'request_expired': 'Request',
    'request_submitted': 'Request',
    'payment_received': 'Payment',
    'trip_reminder': 'Reminder',
    'review_request': 'Review',
    'itinerary_updated': 'Itinerary',
    'price_changed': 'Price',
    'agent_response': 'Agent',
  };
  return typeMap[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}
