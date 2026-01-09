'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  MapPin,
  Calendar,
  MessageSquare,
  Settings,
  Bell,
  User,
  Menu,
  X,
  ChevronDown,
  LogOut,
  HelpCircle,
  Plane,
  Sparkles,
  Gift,
  Search,
  Globe,
  Compass,
  Zap,
  Heart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Logo } from '@/components/ui/logo';
import { useUserSession } from '@/lib/user/session';
import { fetchUser, fetchUserRequests, fetchUserNotifications, markNotificationRead, type User as UserType, type Notification } from '@/lib/data/api';

export function UserLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user: sessionUser, signOut } = useUserSession();
  const [userData, setUserData] = useState<UserType | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [requestCount, setRequestCount] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  // Refs for hover intent (industry best practice for dropdowns)
  const notificationsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const userMenuTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const HOVER_DELAY = 150; // ms delay before closing to prevent accidental closes

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (notificationsTimeoutRef.current) clearTimeout(notificationsTimeoutRef.current);
      if (userMenuTimeoutRef.current) clearTimeout(userMenuTimeoutRef.current);
    };
  }, []);

  // Notifications dropdown hover handlers
  const handleNotificationsEnter = useCallback(() => {
    if (notificationsTimeoutRef.current) {
      clearTimeout(notificationsTimeoutRef.current);
      notificationsTimeoutRef.current = null;
    }
    setUserMenuOpen(false);
    setNotificationsOpen(true);
  }, []);

  const handleNotificationsLeave = useCallback(() => {
    notificationsTimeoutRef.current = setTimeout(() => {
      setNotificationsOpen(false);
    }, HOVER_DELAY);
  }, []);

  // User menu dropdown hover handlers
  const handleUserMenuEnter = useCallback(() => {
    if (userMenuTimeoutRef.current) {
      clearTimeout(userMenuTimeoutRef.current);
      userMenuTimeoutRef.current = null;
    }
    setNotificationsOpen(false);
    setUserMenuOpen(true);
  }, []);

  const handleUserMenuLeave = useCallback(() => {
    userMenuTimeoutRef.current = setTimeout(() => {
      setUserMenuOpen(false);
    }, HOVER_DELAY);
  }, []);

  // Track scroll for header styling
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!sessionUser?.userId) return;
    
    const loadData = async () => {
      const [userData, requests, notifs] = await Promise.all([
        fetchUser(sessionUser.userId),
        fetchUserRequests(sessionUser.userId),
        fetchUserNotifications(sessionUser.userId, 10),
      ]);
      if (userData) setUserData(userData);
      // Count active requests (not completed/cancelled)
      const activeRequests = requests.filter(r => 
        !['completed', 'cancelled', 'COMPLETED', 'CANCELLED'].includes(r.state)
      );
      setRequestCount(activeRequests.length);
      setNotifications(notifs);
    };
    
    loadData();
  }, [sessionUser?.userId]);

  // Real-time polling for notifications (every 30 seconds)
  useEffect(() => {
    if (!sessionUser?.userId) return;

    const pollNotifications = async () => {
      try {
        const notifs = await fetchUserNotifications(sessionUser.userId, 10);
        setNotifications(notifs);
      } catch (error) {
        // Silent fail for polling
      }
    };

    const interval = setInterval(pollNotifications, 30000);
    return () => clearInterval(interval);
  }, [sessionUser?.userId]);

  // Refresh notifications when dropdown opens
  useEffect(() => {
    if (notificationsOpen && sessionUser?.userId) {
      setNotificationsLoading(true);
      fetchUserNotifications(sessionUser.userId, 10)
        .then(setNotifications)
        .finally(() => setNotificationsLoading(false));
    }
  }, [notificationsOpen, sessionUser?.userId]);

  const handleMarkAsRead = async (notificationId: string) => {
    await markNotificationRead(notificationId);
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, isRead: true, readAt: new Date().toISOString() } : n)
    );
  };

  const navigationItems = [
    { href: '/dashboard', label: 'Home', icon: Home, description: 'Your dashboard' },
    { href: '/dashboard/requests', label: 'Requests', icon: Compass, badge: requestCount > 0 ? String(requestCount) : undefined, description: 'Travel requests' },
    { href: '/dashboard/bookings', label: 'Trips', icon: Calendar, description: 'Booked trips' },
    { href: '/dashboard/messages', label: 'Messages', icon: MessageSquare, description: 'Agent messages' },
    { href: '/dashboard/wishlist', label: 'Wishlist', icon: Heart, description: 'Saved items' },
  ];

  // Get user display info
  const userDisplay = {
    firstName: userData?.firstName || sessionUser?.firstName || 'User',
    lastName: userData?.lastName || sessionUser?.lastName || '',
    email: userData?.email || sessionUser?.email || '',
    tier: 'Gold', // Could be fetched from user preferences
  };

  const unreadNotifications = notifications.filter(n => !n.isRead).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/20 flex flex-col">
      {/* Enhanced Header */}
      <header className={cn(
        "sticky top-0 z-50 transition-all duration-300",
        scrolled 
          ? "bg-white/95 backdrop-blur-xl border-b border-gray-200/50 shadow-lg shadow-black/5" 
          : "bg-white/70 backdrop-blur-lg border-b border-gray-100/50"
      )}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-18">
            {/* Logo with animation */}
            <Logo href="/dashboard" showWordmark showTagline size="md" />

            {/* Desktop Navigation - Enhanced */}
            <nav className="hidden lg:flex items-center gap-1 bg-gray-100/50 rounded-2xl p-1.5">
              {navigationItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link key={item.href} href={item.href}>
                    <Button
                      variant="ghost"
                      className={cn(
                        'gap-2 font-medium transition-all duration-200 rounded-xl h-10 px-4',
                        isActive 
                          ? 'bg-white text-gray-900 shadow-md shadow-black/5 hover:bg-white' 
                          : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                      )}
                    >
                      <item.icon className={cn("h-4 w-4", isActive && "text-blue-600")} />
                      {item.label}
                      {item.badge && (
                        <Badge
                          className={cn(
                            'h-5 min-w-5 px-1.5 text-xs font-bold rounded-full',
                            isActive 
                              ? 'bg-blue-600 text-white border-0' 
                              : 'bg-blue-100 text-blue-700 border-0'
                          )}
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </Button>
                  </Link>
                );
              })}
            </nav>

            {/* Right Side Actions - Enhanced */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Search Button (Desktop) */}
              <button className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200/80 text-gray-500 hover:text-gray-700 transition-all text-sm">
                <Search className="h-4 w-4" />
                <span className="hidden lg:inline">Search...</span>
                <kbd className="hidden xl:inline-flex h-5 items-center gap-1 rounded border border-gray-300 bg-white px-1.5 font-mono text-[10px] text-gray-400">⌘K</kbd>
              </button>

              {/* New Trip Button - Enhanced */}
              <Link href="/requests/new" className="hidden sm:block">
                <Button className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 font-semibold group rounded-xl h-10 px-4 transition-all duration-300">
                  <Zap className="mr-2 h-4 w-4 group-hover:rotate-12 transition-transform" />
                  New Trip
                </Button>
              </Link>

              {/* Notifications - Enhanced with hover behavior */}
              <div 
                className="relative"
                onMouseEnter={handleNotificationsEnter}
                onMouseLeave={handleNotificationsLeave}
              >
                <button
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  className={cn(
                    "relative p-2.5 rounded-xl transition-all duration-200",
                    notificationsOpen 
                      ? "bg-blue-100 text-blue-600" 
                      : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                  )}
                >
                  <Bell className="h-5 w-5" />
                  {unreadNotifications > 0 && (
                    <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 text-[9px] text-white font-bold items-center justify-center">
                        {unreadNotifications}
                      </span>
                    </span>
                  )}
                </button>

                {notificationsOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setNotificationsOpen(false)} />
                    <div className="absolute right-0 mt-3 w-96 bg-white rounded-2xl shadow-2xl shadow-black/10 border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-blue-50/50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Bell className="h-4 w-4 text-blue-600" />
                            <h3 className="font-bold text-gray-900">Notifications</h3>
                          </div>
                          {unreadNotifications > 0 && (
                            <Badge className="bg-blue-600 text-white border-0">{unreadNotifications} new</Badge>
                          )}
                        </div>
                      </div>
                      <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                        {notificationsLoading ? (
                          <div className="px-5 py-8 text-center text-gray-500">
                            <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2" />
                            <p className="text-sm">Loading notifications...</p>
                          </div>
                        ) : notifications.length === 0 ? (
                          <div className="px-5 py-8 text-center text-gray-500">
                            <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                            <p className="font-medium">No notifications yet</p>
                            <p className="text-sm text-gray-400">We&apos;ll notify you when something happens</p>
                          </div>
                        ) : (
                          notifications.map((notification) => (
                            <NotificationItem
                              key={notification.id}
                              title={notification.title}
                              description={notification.body}
                              time={formatNotificationTime(notification.createdAt)}
                              unread={!notification.isRead}
                              icon={getNotificationIcon(notification.type)}
                              href={getNotificationHref(notification)}
                              onClick={() => {
                                if (!notification.isRead) {
                                  handleMarkAsRead(notification.id);
                                }
                                setNotificationsOpen(false);
                              }}
                            />
                          ))
                        )}
                      </div>
                      <div className="px-5 py-3 border-t border-gray-100 bg-gray-50">
                        <Link href="/dashboard/notifications" className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                          View all notifications
                          <ChevronDown className="h-4 w-4 -rotate-90" />
                        </Link>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* User Menu - Enhanced with hover behavior */}
              <div 
                className="relative"
                onMouseEnter={handleUserMenuEnter}
                onMouseLeave={handleUserMenuLeave}
              >
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className={cn(
                    "flex items-center gap-2 p-1.5 pr-3 rounded-xl transition-all duration-200",
                    userMenuOpen ? "bg-gray-100" : "hover:bg-gray-100"
                  )}
                >
                  <Avatar size="sm" className="ring-2 ring-offset-1 ring-blue-500/20">
                    <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 text-white font-semibold">
                      {userDisplay.firstName[0]}{userDisplay.lastName?.[0] || ''}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className={cn("h-4 w-4 text-gray-400 hidden sm:block transition-transform duration-200", userMenuOpen && "rotate-180")} />
                </button>

                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                    <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-2xl shadow-black/10 border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="px-5 py-5 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white relative overflow-hidden">
                        {/* Decorative elements */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
                        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-12 -mb-12" />
                        
                        <div className="flex items-center gap-3 relative">
                          <Avatar size="lg" className="ring-2 ring-white/30">
                            <AvatarFallback className="text-lg bg-white/20 text-white font-bold">
                              {userDisplay.firstName[0]}{userDisplay.lastName?.[0] || ''}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-bold text-lg">{userDisplay.firstName} {userDisplay.lastName}</p>
                            <p className="text-sm text-blue-100 truncate max-w-[180px]">{userDisplay.email}</p>
                            <Badge className="mt-2 bg-white/20 text-white border-0 text-xs font-medium hover:bg-white/30">
                              <Gift className="h-3 w-3 mr-1" />
                              {userDisplay.tier} Member
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="py-2">
                        <Link
                          href="/dashboard/profile"
                          className="flex items-center gap-3 px-5 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors group"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <User className="h-4 w-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
                          My Profile
                        </Link>
                        <Link
                          href="/dashboard/settings"
                          className="flex items-center gap-3 px-5 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors group"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <Settings className="h-4 w-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
                          Settings
                        </Link>
                        <Link
                          href="/help"
                          className="flex items-center gap-3 px-5 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors group"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <HelpCircle className="h-4 w-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
                          Help & Support
                        </Link>
                      </div>
                      <div className="border-t border-gray-100 py-2">
                        <button 
                          onClick={() => {
                            setUserMenuOpen(false);
                            signOut();
                          }}
                          className="flex items-center gap-3 w-full px-5 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <LogOut className="h-4 w-4" />
                          Sign out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className={cn(
                  "lg:hidden p-2.5 rounded-xl transition-all",
                  mobileMenuOpen 
                    ? "bg-gray-100 text-gray-900" 
                    : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                )}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation - Enhanced */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-100 bg-white/95 backdrop-blur-xl animate-in slide-in-from-top duration-200">
            <div className="px-4 py-4 space-y-2">
              {navigationItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all font-medium',
                      isActive
                        ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-lg shadow-blue-500/25'
                        : 'text-gray-700 hover:bg-gray-100'
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    <div className="flex-1">
                      <span>{item.label}</span>
                      <p className={cn("text-xs mt-0.5", isActive ? "text-blue-100" : "text-gray-400")}>{item.description}</p>
                    </div>
                    {item.badge && (
                      <Badge className={cn('ml-auto', isActive ? 'bg-white/20 text-white border-0' : 'bg-blue-100 text-blue-700 border-0')}>
                        {item.badge}
                      </Badge>
                    )}
                  </Link>
                );
              })}
              <Link
                href="/requests/new"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 px-4 py-3.5 mt-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-semibold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all"
              >
                <Zap className="h-5 w-5" />
                Plan New Trip
              </Link>
              <div className="border-t border-gray-100 mt-4 pt-4">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    signOut();
                  }}
                  className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl text-red-600 hover:bg-red-50 transition-all font-medium"
                >
                  <LogOut className="h-5 w-5" />
                  Sign out
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">{children}</main>

      {/* Footer - Enhanced */}
      <footer className="border-t border-gray-100 bg-white/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-md">
                <Plane className="h-4 w-4 text-white" />
              </div>
              <div>
                <span className="text-sm font-medium text-gray-900">HowWePlan</span>
                <p className="text-xs text-gray-400">© 2025 All rights reserved.</p>
              </div>
            </div>
            <div className="flex items-center gap-8 text-sm">
              <Link href="/terms" className="text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-1">
                Terms
              </Link>
              <Link href="/privacy" className="text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-1">
                Privacy
              </Link>
              <Link href="/help" className="text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-1">
                <HelpCircle className="h-4 w-4" />
                Help
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatNotificationTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

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
  };
  return iconMap[type] || '📬';
}

function getNotificationHref(notification: { type: string; data: Record<string, unknown> }): string {
  const { type, data } = notification;
  
  // Route based on notification type and data
  if (type.includes('proposal') || type.includes('agent') || type.includes('request')) {
    if (data.requestId) return `/dashboard/requests/${data.requestId}`;
    return '/dashboard/requests';
  }
  
  if (type.includes('booking') || type.includes('trip')) {
    if (data.bookingId) return `/dashboard/bookings/${data.bookingId}`;
    return '/dashboard/bookings';
  }
  
  if (type.includes('message')) {
    return '/dashboard/messages';
  }
  
  return '/dashboard';
}

// ============================================================================
// Components
// ============================================================================

function NotificationItem({
  title,
  description,
  time,
  unread,
  icon,
  href,
  onClick,
}: {
  title: string;
  description: string;
  time: string;
  unread?: boolean;
  icon?: string;
  href?: string;
  onClick?: () => void;
}) {
  const content = (
    <div className="flex items-start gap-3">
      <div className="text-2xl flex-shrink-0 mt-0.5">{icon || '📬'}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-gray-900 truncate">{title}</p>
          {unread && <span className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />}
        </div>
        <p className="text-sm text-gray-600 line-clamp-2 mt-0.5">{description}</p>
        <p className="text-xs text-gray-400 mt-1.5">{time}</p>
      </div>
      <ChevronDown className="h-4 w-4 text-gray-300 -rotate-90 mt-1 flex-shrink-0" />
    </div>
  );

  const className = cn(
    'block px-5 py-4 hover:bg-blue-50/50 cursor-pointer transition-colors',
    unread && 'bg-blue-50/30'
  );

  if (href) {
    return (
      <Link href={href} className={className} onClick={onClick}>
        {content}
      </Link>
    );
  }

  return (
    <div className={className} onClick={onClick}>
      {content}
    </div>
  );
}
