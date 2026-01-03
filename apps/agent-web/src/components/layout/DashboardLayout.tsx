'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  LayoutDashboard,
  Inbox,
  FileText,
  Calendar,
  MessageSquare,
  Bell,
  Settings,
  User,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Star,
  DollarSign,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAgentSession } from '@/lib/agent/session';
import { getAgentIdentity, getAgentStats, type AgentIdentity, type AgentStatsSummary } from '@/lib/data/agent';
import { clearAuthData, ensureValidToken, getAccessToken, logout as apiLogout } from '@/lib/api/auth';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badgeKey?: 'requests' | 'messages';
}

const mainNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
  { label: 'Requests', href: '/requests', icon: <Inbox className="h-5 w-5" />, badgeKey: 'requests' },
  { label: 'Itineraries', href: '/itineraries', icon: <FileText className="h-5 w-5" /> },
  { label: 'Bookings', href: '/bookings', icon: <Calendar className="h-5 w-5" /> },
  { label: 'Messages', href: '/messages', icon: <MessageSquare className="h-5 w-5" />, badgeKey: 'messages' },
];

const secondaryNavItems: NavItem[] = [
  { label: 'Earnings', href: '/earnings', icon: <DollarSign className="h-5 w-5" /> },
  { label: 'Reviews', href: '/reviews', icon: <Star className="h-5 w-5" /> },
  { label: 'Settings', href: '/settings', icon: <Settings className="h-5 w-5" /> },
];

function NavLink({ item, collapsed, badgeCount }: { item: NavItem; collapsed: boolean; badgeCount?: number }) {
  const pathname = usePathname();
  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

  const effectiveBadge = badgeCount ?? 0;

  return (
    <Link
      href={item.href}
      className={cn(
        'relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
        isActive
          ? 'bg-blue-600 text-white shadow-md'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
        collapsed && 'justify-center px-2'
      )}
    >
      <span className={cn(isActive && 'text-white')}>{item.icon}</span>
      {!collapsed && (
        <>
          <span className="flex-1">{item.label}</span>
          {effectiveBadge > 0 && (
            <Badge variant={isActive ? 'secondary' : 'destructive'} className="h-5 min-w-5 px-1.5 text-xs">
              {effectiveBadge}
            </Badge>
          )}
        </>
      )}
      {collapsed && effectiveBadge > 0 && (
        <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full" />
      )}
    </Link>
  );
}

function Sidebar({
  collapsed,
  onCollapse,
  badges,
  agent,
  identity,
}: {
  collapsed: boolean;
  onCollapse: (v: boolean) => void;
  badges: { requests: number; messages: number };
  agent: { agentId: string; userId: string; email: string; firstName: string; lastName: string };
  identity: AgentIdentity | null;
}) {
  const display = identity ?? {
    agentId: agent.agentId,
    userId: agent.userId,
    email: agent.email,
    firstName: agent.firstName,
    lastName: agent.lastName,
    avatarUrl: null,
    tier: 'bench',
    rating: null,
    totalReviews: 0,
    isVerified: false,
  };

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-white border-r border-gray-200 transition-all duration-300 flex flex-col',
        collapsed ? 'w-[72px]' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className={cn('flex items-center h-16 px-4 border-b border-gray-200', collapsed && 'justify-center px-2')}>
        {collapsed ? (
          <div className="h-9 w-9 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">H</span>
          </div>
        ) : (
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="h-9 w-9 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">H</span>
            </div>
            <div>
              <span className="font-bold text-gray-900">HowWePlan</span>
              <span className="block text-xs text-gray-500">Agent Portal</span>
            </div>
          </Link>
        )}
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        <div className="space-y-1">
          {mainNavItems.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              collapsed={collapsed}
              badgeCount={item.badgeKey ? badges[item.badgeKey] : 0}
            />
          ))}
        </div>

        <div className="my-4 border-t border-gray-200" />

        <div className="space-y-1">
          {secondaryNavItems.map((item) => (
            <NavLink key={item.href} item={item} collapsed={collapsed} />
          ))}
        </div>
      </nav>

      {/* Agent Profile Section */}
      {!collapsed && (
        <div className="p-3 border-t border-gray-200">
          <div className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-semibold">
              {display.firstName[0]}{display.lastName ? display.lastName[0] : ''}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="font-medium text-gray-900 text-sm truncate">{display.firstName} {display.lastName}</p>
                {display.isVerified && (
                  <svg className="h-4 w-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                {typeof display.rating === 'number' ? (
                  <>
                    <span>{display.rating.toFixed(1)}</span>
                    <span>•</span>
                    <span>{display.totalReviews} reviews</span>
                  </>
                ) : (
                  <span>—</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Collapse Button */}
      <button
        onClick={() => onCollapse(!collapsed)}
        className="absolute -right-3 top-20 h-6 w-6 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-50 shadow-sm"
      >
        <ChevronDown className={cn('h-4 w-4 transition-transform', collapsed ? '-rotate-90' : 'rotate-90')} />
      </button>
    </aside>
  );
}

function Header({
  collapsed,
  agent,
  identity,
  badges,
  agents,
  setAgentById,
}: {
  collapsed: boolean;
  agent: { agentId: string; userId: string; email: string; firstName: string; lastName: string };
  identity: AgentIdentity | null;
  badges: { requests: number; messages: number };
  agents: ReadonlyArray<{ agentId: string; firstName: string; lastName: string; email: string }>;
  setAgentById: (id: string) => void;
}) {
  const router = useRouter();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const display = identity ?? {
    agentId: agent.agentId,
    userId: agent.userId,
    email: agent.email,
    firstName: agent.firstName,
    lastName: agent.lastName,
    avatarUrl: null,
    tier: 'bench',
    rating: null,
    totalReviews: 0,
    isVerified: false,
  };

  return (
    <header
      className={cn(
        'fixed top-0 right-0 z-30 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 transition-all duration-300',
        collapsed ? 'left-[72px]' : 'left-64'
      )}
    >
      {/* Left side - Search or Breadcrumb */}
      <div className="flex items-center gap-4">
        {display.tier === 'star' && (
          <Badge className="bg-gradient-to-r from-amber-400 to-orange-500 text-white border-0 gap-1">
            <Star className="h-3 w-3 fill-white" />
            Star Agent
          </Badge>
        )}
      </div>

      {/* Right side - Actions */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            className="relative h-10 w-10 rounded-full"
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <Bell className="h-5 w-5 text-gray-600" />
            {(badges.messages ?? 0) > 0 && (
              <span className="absolute top-1 right-1 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-white" />
            )}
          </Button>
          
          {showNotifications && (
            <div className="absolute right-0 top-12 w-80 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
              <div className="px-4 py-2 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">Notifications</h3>
              </div>
              <div className="max-h-96 overflow-y-auto">
                <NotificationItem
                  title="New Request Match"
                  message="A new travel request for Rajasthan matches your expertise"
                  time="2 min ago"
                  unread
                />
                <NotificationItem
                  title="Itinerary Approved"
                  message="Your Kerala itinerary has been approved by the client"
                  time="1 hour ago"
                  unread
                />
                <NotificationItem
                  title="New Review"
                  message="Rahul V. left you a 5-star review"
                  time="3 hours ago"
                />
              </div>
            </div>
          )}
        </div>

        {/* User Menu */}
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-2 h-10 px-2 rounded-full"
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-semibold text-sm">
              {display.firstName[0]}{display.lastName ? display.lastName[0] : ''}
            </div>
            <ChevronDown className="h-4 w-4 text-gray-500" />
          </Button>

          {showUserMenu && (
            <div className="absolute right-0 top-12 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="font-medium text-gray-900">{display.firstName} {display.lastName}</p>
                <p className="text-sm text-gray-500 truncate">{display.email}</p>
              </div>
              <div className="py-1">
                <Link href="/profile" className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  <User className="h-4 w-4" />
                  Your Profile
                </Link>
                <Link href="/settings" className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
              </div>
              <div className="border-t border-gray-100 py-1">
                <div className="px-4 py-2">
                  <p className="text-xs font-semibold text-gray-500">Switch agent</p>
                </div>
                {agents.map((a) => (
                  <button
                    key={a.agentId}
                    onClick={() => {
                      setAgentById(a.agentId);
                      setShowUserMenu(false);
                    }}
                    className={cn(
                      'flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-50 w-full text-left',
                      a.agentId === agent.agentId ? 'text-blue-700 font-medium' : 'text-gray-700'
                    )}
                  >
                    <span className="h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center text-xs text-gray-700">
                      {a.firstName[0]}{a.lastName ? a.lastName[0] : ''}
                    </span>
                    <span className="truncate">{a.firstName} {a.lastName}</span>
                  </button>
                ))}
              </div>
              <div className="border-t border-gray-100 py-1">
                <button
                  className="flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full"
                  onClick={async () => {
                    try {
                      const token = getAccessToken();
                      if (token) await apiLogout(token);
                    } finally {
                      clearAuthData();
                      // Best-effort cookie clear
                      if (typeof document !== 'undefined') {
                        document.cookie = 'tc-auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
                      }
                      setShowUserMenu(false);
                      router.push('/login');
                    }
                  }}
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function NotificationItem({ title, message, time, unread }: { title: string; message: string; time: string; unread?: boolean }) {
  return (
    <div className={cn('px-4 py-3 hover:bg-gray-50 cursor-pointer', unread && 'bg-blue-50/50')}>
      <div className="flex items-start gap-3">
        {unread && <span className="h-2 w-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />}
        <div className={cn('flex-1', !unread && 'ml-5')}>
          <p className="text-sm font-medium text-gray-900">{title}</p>
          <p className="text-sm text-gray-500 line-clamp-1">{message}</p>
          <p className="text-xs text-gray-400 mt-1">{time}</p>
        </div>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { agent, agents, setAgentById } = useAgentSession();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [identity, setIdentity] = useState<AgentIdentity | null>(null);
  const [stats, setStats] = useState<AgentStatsSummary>({
    pendingMatches: 0,
    acceptedMatches: 0,
    activeBookings: 0,
    unreadMessages: 0,
  });

  const badges = useMemo(() => {
    return {
      requests: stats.pendingMatches,
      messages: stats.unreadMessages,
    };
  }, [stats.pendingMatches, stats.unreadMessages]);

  useEffect(() => {
    let cancelled = false;

    const guard = async () => {
      try {
        const ok = await ensureValidToken();
        if (!ok && !cancelled) {
          router.push('/login?redirect=' + encodeURIComponent(pathname));
        }
      } catch {
        if (!cancelled) {
          router.push('/login?redirect=' + encodeURIComponent(pathname));
        }
      }
    };

    guard();
    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [id, s] = await Promise.all([getAgentIdentity(agent.agentId), getAgentStats(agent.agentId)]);
        if (cancelled) return;
        setIdentity(id);
        setStats(s);
      } catch {
        if (cancelled) return;
        setIdentity(null);
        setStats({ pendingMatches: 0, acceptedMatches: 0, activeBookings: 0, unreadMessages: 0 });
      }
    };

    load();
    const interval = setInterval(load, 30000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [agent.agentId]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-64 bg-white">
            <Sidebar
              collapsed={false}
              onCollapse={() => {}}
              badges={badges}
              agent={agent}
              identity={identity}
            />
          </div>
        </div>
      )}

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-40">
        <button onClick={() => setMobileMenuOpen(true)} className="p-2 -ml-2">
          <Menu className="h-6 w-6 text-gray-600" />
        </button>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold">H</span>
          </div>
          <span className="font-bold text-gray-900">Agent Portal</span>
        </div>
        <Button variant="ghost" size="sm" className="p-2 -mr-2">
          <Bell className="h-5 w-5 text-gray-600" />
        </Button>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar
          collapsed={collapsed}
          onCollapse={setCollapsed}
          badges={badges}
          agent={agent}
          identity={identity}
        />
      </div>

      {/* Desktop Header */}
      <div className="hidden lg:block">
        <Header
          collapsed={collapsed}
          agent={agent}
          identity={identity}
          badges={badges}
          agents={agents}
          setAgentById={setAgentById}
        />
      </div>

      {/* Main Content */}
      <main
        className={cn(
          'pt-16 min-h-screen transition-all duration-300',
          collapsed ? 'lg:pl-[72px]' : 'lg:pl-64'
        )}
      >
        <div className="p-4 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
