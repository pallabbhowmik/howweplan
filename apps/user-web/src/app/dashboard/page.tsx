'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  Plus,
  FileText,
  Clock,
  CheckCircle,
  Sparkles,
  MapPin,
  TrendingUp,
  Calendar,
  MessageSquare,
  ChevronRight,
  Star,
  Plane,
  Globe,
  ArrowRight,
  Zap,
  Bell,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useUserSession } from '@/lib/user/session';
import {
  fetchUserRequests,
  fetchUserBookings,
  fetchDashboardStats,
  fetchRecentActivity,
  type TravelRequest,
  type Booking,
  type DashboardStats,
  type ActivityItem,
} from '@/lib/data/api';

const quickActions = [
  { icon: MapPin, label: 'Plan New Trip', href: '/requests/new', color: 'from-blue-500 to-purple-500' },
  { icon: MessageSquare, label: 'Messages', href: '/dashboard/messages', color: 'from-green-500 to-emerald-500', badgeKey: 'messages' },
  { icon: Calendar, label: 'My Bookings', href: '/dashboard/bookings', color: 'from-orange-500 to-red-500' },
  { icon: Star, label: 'Reviews', href: '/dashboard/reviews', color: 'from-yellow-500 to-amber-500' },
];

export default function DashboardPage() {
  const { user, loading: userLoading, error: userError } = useUserSession();
  const [requests, setRequests] = useState<TravelRequest[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  useEffect(() => {
    // If user loading finished but no user, stop data loading
    if (!userLoading && !user?.userId) {
      setLoading(false);
      return;
    }
    if (!user?.userId) return;

    const loadData = async () => {
      setLoading(true);
      setDataError(null);
      try {
        const [requestsData, bookingsData, statsData, activityData] = await Promise.all([
          fetchUserRequests(user.userId),
          fetchUserBookings(user.userId),
          fetchDashboardStats(user.userId),
          fetchRecentActivity(user.userId),
        ]);
        setRequests(requestsData);
        setBookings(bookingsData);
        setStats(statsData);
        setActivity(activityData);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        setDataError(error instanceof Error ? error.message : 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user?.userId, userLoading]);

  const userName = user?.firstName || 'Traveler';
  
  // Get active requests (not completed/cancelled)
  const activeRequests = requests.filter(r => 
    !['BOOKED', 'COMPLETED', 'CANCELLED', 'EXPIRED'].includes(r.state)
  );
  
  // Get upcoming bookings (confirmed, not completed)
  const upcomingBookings = bookings.filter(b => 
    b.state === 'CONFIRMED' && new Date(b.travelStartDate) > new Date()
  );

  if (userLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Show error state if user session failed or data loading failed
  if (userError || dataError || !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h2 className="text-xl font-semibold text-red-800 mb-2">Unable to Load Dashboard</h2>
          <p className="text-red-600 mb-4">
            {userError || dataError || 'No user session found. Please try refreshing the page.'}
          </p>
          <Button onClick={() => window.location.reload()} variant="outline" className="text-red-600 border-red-300 hover:bg-red-50">
            Refresh Page
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Banner with Animation */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-3xl p-8 text-white shadow-2xl">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtOS45NCAwLTE4IDguMDYtMTggMThzOC4wNiAxOCAxOCAxOCAxOC04LjA2IDE4LTE4LTguMDYtMTgtMTgtMTh6bTAgMzJjLTcuNzMyIDAtMTQtNi4yNjgtMTQtMTRzNi4yNjgtMTQgMTQtMTQgMTQgNi4yNjggMTQgMTQtNi4yNjggMTQtMTQgMTR6IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9Ii4wNSIvPjwvZz48L3N2Zz4=')] opacity-30" />
        
        <div className="relative flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                <Sparkles className="h-6 w-6" />
              </div>
              <span className="text-blue-100 text-sm font-medium">
                {new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening'}
              </span>
            </div>
            <h1 className="text-4xl font-bold mb-2">Welcome back, {userName}! 👋</h1>
            <p className="text-blue-100 text-lg max-w-xl">
              Ready to plan your next adventure? You have{' '}
              <span className="font-semibold text-white">{activeRequests.length} active request{activeRequests.length !== 1 ? 's' : ''}</span>
              {stats?.unreadMessages ? (
                <> and <span className="font-semibold text-white">{stats.unreadMessages} new message{stats.unreadMessages !== 1 ? 's' : ''}</span></>
              ) : null}.
            </p>
          </div>
          <div className="hidden lg:flex items-center gap-4">
            <Link href="/requests/new">
              <Button size="lg" variant="secondary" className="shadow-xl group text-base">
                <Plus className="h-5 w-5 mr-2" />
                Plan New Trip
                <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Floating decorations */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {quickActions.map((action, i) => (
          <Link key={i} href={action.href}>
            <Card className="group cursor-pointer hover:shadow-xl transition-all duration-300 border-0 shadow-md overflow-hidden h-full">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${action.color} text-white shadow-lg group-hover:scale-110 transition-transform`}>
                    <action.icon className="h-5 w-5" />
                  </div>
                  {action.badgeKey === 'messages' && stats?.unreadMessages ? (
                    <Badge className="bg-red-500 text-white border-0 animate-pulse">
                      {stats.unreadMessages}
                    </Badge>
                  ) : null}
                </div>
                <p className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{action.label}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard 
          title="Active Requests" 
          value={String(stats?.activeRequests || activeRequests.length)} 
          icon={<FileText className="h-5 w-5" />} 
          color="blue"
        />
        <StatCard 
          title="Awaiting Selection" 
          value={String(stats?.awaitingSelection || 0)} 
          icon={<Clock className="h-5 w-5" />} 
          color="amber"
          subtitle="Choose your agent"
        />
        <StatCard 
          title="Confirmed Bookings" 
          value={String(stats?.confirmedBookings || upcomingBookings.length)} 
          icon={<CheckCircle className="h-5 w-5" />} 
          color="green"
          subtitle="All set!"
        />
        <StatCard 
          title="Completed Trips" 
          value={String(stats?.completedTrips || 0)} 
          icon={<TrendingUp className="h-5 w-5" />} 
          color="purple"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Travel Requests - Takes 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-lg border-0 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50/50 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Globe className="h-5 w-5 text-blue-600" />
                    Travel Requests
                  </CardTitle>
                  <CardDescription>Track your trip planning progress</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Link href="/dashboard/requests">
                    <Button variant="ghost" size="sm">View All</Button>
                  </Link>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {activeRequests.length > 0 ? (
                <div className="space-y-4">
                  {activeRequests.slice(0, 3).map((request) => (
                    <Link key={request.id} href={`/dashboard/requests/${request.id}`}>
                      <div className="group flex items-center gap-4 p-4 border-2 rounded-2xl hover:border-blue-300 hover:shadow-lg transition-all bg-white cursor-pointer">
                        <div className="text-4xl">
                          {getDestinationEmoji(request.destination?.country || request.destination?.city)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-lg group-hover:text-blue-600 transition-colors">
                              {request.destination?.label || request.destination?.city || request.title}
                            </h3>
                            <StatusBadge status={request.state} />
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              {formatDateRange(request.departureDate, request.returnDate)}
                            </span>
                            {request.budgetMax && (
                              <span className="flex items-center gap-1">
                                <TrendingUp className="h-3.5 w-3.5" />
                                {formatBudget(request.budgetMin, request.budgetMax, request.budgetCurrency)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right hidden sm:block">
                          <div className="flex items-center gap-1 text-blue-600 font-medium mb-1">
                            <Zap className="h-4 w-4" />
                            {request.agentsResponded || 0} agents
                          </div>
                          <p className="text-xs text-gray-400">{formatRelativeTime(request.createdAt)}</p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={<FileText className="h-12 w-12" />}
                  title="No active requests"
                  description="Start planning your dream vacation today!"
                  actionLabel="Create Your First Request"
                  actionHref="/requests/new"
                />
              )}
            </CardContent>
          </Card>

          {/* Upcoming Trip */}
          {upcomingBookings.length > 0 && (
            <Card className="shadow-lg border-0 overflow-hidden bg-gradient-to-br from-green-50 to-emerald-50">
              <CardHeader className="border-b border-green-100">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl flex items-center gap-2 text-green-800">
                      <Plane className="h-5 w-5" />
                      Upcoming Trip
                    </CardTitle>
                    <CardDescription className="text-green-600">Your next adventure awaits!</CardDescription>
                  </div>
                  <Link href="/dashboard/bookings">
                    <Button variant="ghost" size="sm" className="text-green-700 hover:text-green-800 hover:bg-green-100">
                      View All
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {upcomingBookings.slice(0, 1).map((booking) => {
                  const daysUntil = Math.ceil((new Date(booking.travelStartDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  const destination = booking.request?.destination?.label || booking.request?.destination?.city || 'Your Trip';
                  
                  return (
                    <Link key={booking.id} href={`/dashboard/bookings/${booking.id}`}>
                      <div className="group flex items-center gap-6 p-5 bg-white rounded-2xl shadow-md hover:shadow-xl transition-all cursor-pointer border border-green-200">
                        <div className="relative">
                          <div className="text-5xl">
                            {getDestinationEmoji(booking.request?.destination?.country)}
                          </div>
                          <div className="absolute -bottom-1 -right-1 bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                            {daysUntil}d
                          </div>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-xl mb-1 group-hover:text-green-600 transition-colors">
                            {destination}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {formatDateRange(booking.travelStartDate, booking.travelEndDate)}
                            </span>
                          </div>
                          {booking.agent && (
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-500">Agent:</span>
                              <span className="font-medium">{booking.agent.fullName}</span>
                              <div className="flex items-center gap-0.5">
                                <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                                <span className="text-sm font-medium">{booking.agent.rating?.toFixed(1)}</span>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-3xl font-bold text-green-600">
                            ₹{(booking.totalAmountCents / 100).toLocaleString('en-IN')}
                          </p>
                          <Badge className="bg-green-100 text-green-700 border-0 mt-2">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Confirmed
                          </Badge>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Recent Activity */}
          <Card className="shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-purple-50/50 border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <Bell className="h-5 w-5 text-purple-600" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {activity.length > 0 ? (
                <div className="divide-y">
                  {activity.map((item, i) => (
                    <div key={item.id || i} className="p-4 hover:bg-gray-50 transition-colors cursor-pointer">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                          {getActivityIcon(item.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-800">{item.message}</p>
                          <p className="text-xs text-gray-400 mt-1">{formatRelativeTime(item.time)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No recent activity</p>
                </div>
              )}
              {activity.length > 0 && (
                <div className="p-4 border-t">
                  <Link href="/dashboard/notifications" className="text-sm text-blue-600 hover:underline font-medium">
                    View all activity →
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Travel Tips */}
          <Card className="shadow-lg border-0 bg-gradient-to-br from-amber-50 to-orange-50 overflow-hidden">
            <CardHeader className="border-b border-amber-100">
              <CardTitle className="text-lg flex items-center gap-2 text-amber-800">
                <Sparkles className="h-5 w-5" />
                Pro Tips
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <ul className="space-y-3">
                {[
                  'Book 2-3 months ahead for best deals',
                  'Star agents respond within 4 hours',
                  'Add detailed preferences for better matches',
                  'Compare at least 3 proposals before deciding',
                ].map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-amber-900">
                    <span className="text-amber-500 font-bold">✦</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Quick Help */}
          <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-600 to-purple-600 text-white overflow-hidden">
            <CardContent className="p-6">
              <h3 className="font-bold text-lg mb-2">Need Help?</h3>
              <p className="text-blue-100 text-sm mb-4">Our support team is here 24/7 to assist you.</p>
              <Button variant="secondary" size="sm" className="w-full">
                <MessageSquare className="h-4 w-4 mr-2" />
                Contact Support
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatDateRange(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const startMonth = startDate.toLocaleDateString('en-US', { month: 'short' });
  const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' });
  
  if (startMonth === endMonth) {
    return `${startMonth} ${startDate.getDate()} - ${endDate.getDate()}, ${endDate.getFullYear()}`;
  }
  return `${startMonth} ${startDate.getDate()} - ${endMonth} ${endDate.getDate()}, ${endDate.getFullYear()}`;
}

function formatBudget(min: number | null, max: number | null, currency: string): string {
  if (min && max) {
    return `₹${min.toLocaleString('en-IN')} - ₹${max.toLocaleString('en-IN')}`;
  }
  if (max) return `Up to ₹${max.toLocaleString('en-IN')}`;
  if (min) return `From ₹${min.toLocaleString('en-IN')}`;
  return 'Flexible';
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
}

function getDestinationEmoji(destination?: string): string {
  if (!destination) return '🌍';
  const lower = destination.toLowerCase();
  
  const emojiMap: Record<string, string> = {
    // India destinations
    rajasthan: '🏰', jaipur: '🏰', udaipur: '🏰', jodhpur: '🏰', jaisalmer: '🏜️',
    kerala: '🌴', kochi: '🌴', munnar: '🌴', alleppey: '🛶', kovalam: '🏖️',
    goa: '🏖️', ladakh: '🏔️', leh: '🏔️', manali: '🏔️', shimla: '🏔️',
    andaman: '🏝️', kashmir: '🏔️', varanasi: '🕉️', rishikesh: '🧘',
    agra: '🕌', delhi: '🏛️', mumbai: '🌆', bangalore: '🏙️', chennai: '🌅',
    darjeeling: '🍵', sikkim: '🏔️', meghalaya: '🌿', assam: '🦏',
    ranthambore: '🐅', jim_corbett: '🐅', kaziranga: '🦏', bandhavgarh: '🐅',
    india: '🇮🇳',
  };

  for (const [key, emoji] of Object.entries(emojiMap)) {
    if (lower.includes(key)) return emoji;
  }
  return '🌍';
}

function getActivityIcon(type: string) {
  switch (type) {
    case 'agent_response': return <FileText className="h-4 w-4" />;
    case 'match': return <Zap className="h-4 w-4" />;
    case 'message': return <MessageSquare className="h-4 w-4" />;
    case 'booking': return <CheckCircle className="h-4 w-4" />;
    default: return <Bell className="h-4 w-4" />;
  }
}

// ============================================================================
// Sub-Components
// ============================================================================

function StatCard({ 
  title, value, icon, color = 'blue', trend, trendUp, subtitle
}: { 
  title: string; value: string; icon: React.ReactNode;
  color?: 'blue' | 'green' | 'amber' | 'red' | 'purple';
  trend?: string; trendUp?: boolean; subtitle?: string;
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    green: 'bg-green-50 text-green-600 border-green-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    red: 'bg-red-50 text-red-600 border-red-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
  };

  const iconClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    amber: 'bg-amber-100 text-amber-600',
    red: 'bg-red-100 text-red-600',
    purple: 'bg-purple-100 text-purple-600',
  };

  return (
    <Card className={`border-2 shadow-sm hover:shadow-md transition-shadow ${colorClasses[color]}`}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className={`p-2.5 rounded-xl ${iconClasses[color]}`}>{icon}</div>
          {trend && (
            <Badge variant="secondary" className={`text-xs ${trendUp ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
              {trendUp && '↑'} {trend}
            </Badge>
          )}
        </div>
        <p className="text-3xl font-bold mb-1">{value}</p>
        <p className="text-sm font-medium opacity-80">{title}</p>
        {subtitle && <p className="text-xs opacity-60 mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { label: string; className: string }> = {
    DRAFT: { label: 'Draft', className: 'bg-gray-100 text-gray-600' },
    SUBMITTED: { label: 'Submitted', className: 'bg-blue-100 text-blue-700' },
    MATCHING: { label: 'Finding Agents', className: 'bg-blue-100 text-blue-700 animate-pulse' },
    PROPOSALS_RECEIVED: { label: 'Select Option', className: 'bg-amber-100 text-amber-700' },
    BOOKED: { label: 'Booked', className: 'bg-green-100 text-green-700' },
    COMPLETED: { label: 'Completed', className: 'bg-green-100 text-green-700' },
    CANCELLED: { label: 'Cancelled', className: 'bg-red-100 text-red-700' },
    EXPIRED: { label: 'Expired', className: 'bg-gray-100 text-gray-600' },
  };

  const config = variants[status] || { label: status, className: 'bg-gray-100 text-gray-600' };
  return <Badge className={`border-0 font-medium ${config.className}`}>{config.label}</Badge>;
}

function EmptyState({
  icon, title, description, actionLabel, actionHref,
}: {
  icon: React.ReactNode; title: string; description: string;
  actionLabel: string; actionHref: string;
}) {
  return (
    <div className="text-center py-12">
      <div className="inline-flex p-6 bg-blue-50 rounded-full mb-4 text-blue-400">{icon}</div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-gray-500 mb-6">{description}</p>
      <Link href={actionHref}>
        <Button size="lg" className="gap-2">
          <Plus className="h-5 w-5" />
          {actionLabel}
        </Button>
      </Link>
    </div>
  );
}
