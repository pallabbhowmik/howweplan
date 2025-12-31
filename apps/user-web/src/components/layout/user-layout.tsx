'use client';

import React, { useState, useEffect } from 'react';
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
  Search,
  Gift,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useUserSession } from '@/lib/user/session';
import { fetchUser, type User as UserType } from '@/lib/data/api';

const navigationItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/dashboard/requests', label: 'My Requests', icon: MapPin, badge: '2' },
  { href: '/dashboard/bookings', label: 'Bookings', icon: Calendar },
  { href: '/dashboard/messages', label: 'Messages', icon: MessageSquare, badge: '3' },
];

export function UserLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user: sessionUser } = useUserSession();
  const [userData, setUserData] = useState<UserType | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  useEffect(() => {
    if (!sessionUser?.userId) return;
    
    const loadUser = async () => {
      const data = await fetchUser(sessionUser.userId);
      if (data) setUserData(data);
    };
    
    loadUser();
  }, [sessionUser?.userId]);

  // Get user display info
  const userDisplay = {
    firstName: userData?.firstName || sessionUser?.firstName || 'User',
    lastName: userData?.lastName || sessionUser?.lastName || '',
    email: userData?.email || sessionUser?.email || '',
    tier: 'Gold', // Could be fetched from user preferences
  };

  const unreadNotifications = 2;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-xl border-b border-gray-100/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/dashboard" className="flex items-center gap-3 group">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:shadow-blue-500/40 group-hover:scale-105 transition-all">
                <Plane className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 text-transparent bg-clip-text">
                HowWePlan
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navigationItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link key={item.href} href={item.href}>
                    <Button
                      variant={isActive ? 'default' : 'ghost'}
                      className={cn(
                        'gap-2 font-medium transition-all',
                        isActive 
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg shadow-blue-500/25' 
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/80'
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                      {item.badge && (
                        <Badge
                          className={cn(
                            'h-5 px-1.5 text-xs font-semibold',
                            isActive 
                              ? 'bg-white/20 text-white border-0' 
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

            {/* Right Side Actions */}
            <div className="flex items-center gap-2">
              {/* New Trip Button */}
              <Link href="/requests/new" className="hidden sm:block">
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg shadow-blue-500/25 font-medium group">
                  <Sparkles className="mr-2 h-4 w-4 group-hover:animate-pulse" />
                  Plan Trip
                </Button>
              </Link>

              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => {
                    setNotificationsOpen(!notificationsOpen);
                    setUserMenuOpen(false);
                  }}
                  className="relative p-2.5 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-all"
                >
                  <Bell className="h-5 w-5" />
                  {unreadNotifications > 0 && (
                    <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white animate-pulse" />
                  )}
                </button>

                {notificationsOpen && (
                  <>
                    <div className="fixed inset-0" onClick={() => setNotificationsOpen(false)} />
                    <div className="absolute right-0 mt-2 w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-blue-50/50">
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-gray-900">Notifications</h3>
                          <Badge className="bg-blue-100 text-blue-700 border-0">{unreadNotifications} new</Badge>
                        </div>
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        <NotificationItem
                          title="New itinerary received"
                          description="Agent Sarah M. sent you a detailed itinerary for your Tokyo trip."
                          time="2 hours ago"
                          unread
                          icon="📋"
                          href="/dashboard/requests/1"
                          onClick={() => setNotificationsOpen(false)}
                        />
                        <NotificationItem
                          title="3 agents matched"
                          description="Your Rajasthan request has attracted 3 expert agents."
                          time="5 hours ago"
                          unread
                          icon="⚡"
                          href="/dashboard/requests/2"
                          onClick={() => setNotificationsOpen(false)}
                        />
                        <NotificationItem
                          title="Booking confirmed"
                          description="Your Kerala trip is confirmed! Get ready for adventure."
                          time="2 days ago"
                          icon="✅"
                          href="/dashboard/bookings/B001"
                          onClick={() => setNotificationsOpen(false)}
                        />
                        <NotificationItem
                          title="New message from Priya S."
                          description="Hi! I've updated the accommodation options for your trip."
                          time="3 days ago"
                          icon="💬"
                          href="/dashboard/messages"
                          onClick={() => setNotificationsOpen(false)}
                        />
                      </div>
                      <div className="px-5 py-3 border-t border-gray-100 bg-gray-50">
                        <Link href="/dashboard/notifications" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                          View all notifications →
                        </Link>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => {
                    setUserMenuOpen(!userMenuOpen);
                    setNotificationsOpen(false);
                  }}
                  className="flex items-center gap-2 p-1.5 pr-3 rounded-xl hover:bg-gray-100 transition-all"
                >
                  <Avatar size="sm" className="ring-2 ring-blue-100">
                    <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-purple-500 text-white font-semibold">
                      {userDisplay.firstName[0]}{userDisplay.lastName?.[0] || ''}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className={cn("h-4 w-4 text-gray-400 hidden sm:block transition-transform", userMenuOpen && "rotate-180")} />
                </button>

                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0" onClick={() => setUserMenuOpen(false)} />
                    <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="px-5 py-4 bg-gradient-to-br from-blue-600 to-purple-600 text-white">
                        <div className="flex items-center gap-3">
                          <Avatar size="lg" className="ring-2 ring-white/30">
                            <AvatarFallback className="text-lg bg-white/20 text-white font-bold">
                              {userDisplay.firstName[0]}{userDisplay.lastName?.[0] || ''}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-bold">{userDisplay.firstName} {userDisplay.lastName}</p>
                            <p className="text-sm text-blue-100">{userDisplay.email}</p>
                            <Badge className="mt-1.5 bg-white/20 text-white border-0 text-xs">
                              <Gift className="h-3 w-3 mr-1" />
                              {userDisplay.tier} Member
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="py-2">
                        <Link
                          href="/dashboard/profile"
                          className="flex items-center gap-3 px-5 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <User className="h-4 w-4 text-gray-400" />
                          My Profile
                        </Link>
                        <Link
                          href="/dashboard/settings"
                          className="flex items-center gap-3 px-5 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <Settings className="h-4 w-4 text-gray-400" />
                          Settings
                        </Link>
                        <Link
                          href="/help"
                          className="flex items-center gap-3 px-5 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <HelpCircle className="h-4 w-4 text-gray-400" />
                          Help & Support
                        </Link>
                      </div>
                      <div className="border-t border-gray-100 py-2">
                        <button className="flex items-center gap-3 w-full px-5 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
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
                className="md:hidden p-2.5 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-all"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white animate-in slide-in-from-top duration-200">
            <div className="px-4 py-4 space-y-1">
              {navigationItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium',
                      isActive
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                        : 'text-gray-700 hover:bg-gray-100'
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
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
                className="flex items-center justify-center gap-2 px-4 py-3 mt-4 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium shadow-lg"
              >
                <Sparkles className="h-5 w-5" />
                Plan New Trip
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white/50 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                <Plane className="h-3 w-3 text-white" />
              </div>
              <span>© 2025 HowWePlan. All rights reserved.</span>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <Link href="/terms" className="text-gray-500 hover:text-gray-700 transition-colors">Terms</Link>
              <Link href="/privacy" className="text-gray-500 hover:text-gray-700 transition-colors">Privacy</Link>
              <Link href="/help" className="text-gray-500 hover:text-gray-700 transition-colors">Help</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

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
      <div className="text-2xl">{icon || '📬'}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-gray-900">{title}</p>
          {unread && <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />}
        </div>
        <p className="text-sm text-gray-600 line-clamp-2 mt-0.5">{description}</p>
        <p className="text-xs text-gray-400 mt-1.5">{time}</p>
      </div>
      <ChevronDown className="h-4 w-4 text-gray-300 -rotate-90 mt-1" />
    </div>
  );

  const className = cn(
    'block px-5 py-4 hover:bg-blue-50 cursor-pointer transition-colors border-b border-gray-50 last:border-0',
    unread && 'bg-blue-50/50'
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
