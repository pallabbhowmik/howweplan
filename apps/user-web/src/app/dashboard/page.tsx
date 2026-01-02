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
  Eye,
  Users,
  Send,
  Target,
  Award,
  Lightbulb,
  Heart,
  Search,
  RefreshCw,
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

// ============================================================================
// USER STATE TYPES
// ============================================================================

type UserState = 
  | 'new_user'           // No requests at all
  | 'awaiting_agents'    // Has submitted requests, no proposals yet
  | 'proposals_ready'    // Has proposals to review
  | 'has_bookings'       // Has confirmed bookings
  | 'active_traveler';   // Has completed trips

// ============================================================================
// STATE-DRIVEN CONFIG
// ============================================================================

interface StateConfig {
  heroTitle: string;
  heroSubtitle: string;
  primaryCTA: { label: string; href: string; icon: React.ElementType };
  secondaryCTA?: { label: string; href: string };
  proTips: string[];
  showActivityPlaceholder: boolean;
}

function getStateConfig(state: UserState, stats: DashboardStats | null, userName: string): StateConfig {
  switch (state) {
    case 'new_user':
      return {
        heroTitle: `Your next adventure starts here, ${userName}! ✈️`,
        heroSubtitle: 'Expert travel agents compete to plan your dream trip — completely free. No commitment, no hidden fees.',
        primaryCTA: { label: 'Create Your First Request', href: '/requests/new', icon: Plus },
        proTips: [
          'Add specific dates for better pricing',
          'Include must-have experiences',
          'Most agents respond in 4 hours',
        ],
        showActivityPlaceholder: true,
      };
    
    case 'awaiting_agents':
      return {
        heroTitle: `Agents are crafting your trip, ${userName}! 🔍`,
        heroSubtitle: `Your request is with ${stats?.activeRequests || 1} expert agents. They're working on personalized proposals just for you.`,
        primaryCTA: { label: 'View My Requests', href: '/dashboard/requests', icon: Eye },
        secondaryCTA: { label: 'Plan Another Trip', href: '/requests/new' },
        proTips: [
          'Most agents respond within 4 hours',
          'You\'ll get notified when proposals arrive',
          'No obligation to accept any proposal',
        ],
        showActivityPlaceholder: false,
      };
    
    case 'proposals_ready':
      return {
        heroTitle: `Great news! You have ${stats?.awaitingSelection || 0} proposals to review! 🎉`,
        heroSubtitle: 'Expert agents have crafted itineraries for you. Compare them and choose your perfect trip.',
        primaryCTA: { label: 'Review Proposals', href: '/dashboard/requests', icon: Target },
        secondaryCTA: { label: 'Start New Request', href: '/requests/new' },
        proTips: [
          'Compare at least 3 proposals',
          'Check agent ratings and reviews',
          'Message agents with questions',
        ],
        showActivityPlaceholder: false,
      };
    
    case 'has_bookings':
      return {
        heroTitle: `Your trip is confirmed, ${userName}! 🌴`,
        heroSubtitle: 'Get ready for an amazing adventure. Your agent is here if you need anything.',
        primaryCTA: { label: 'View Booking Details', href: '/dashboard/bookings', icon: Plane },
        secondaryCTA: { label: 'Plan Next Adventure', href: '/requests/new' },
        proTips: [
          'Keep your itinerary downloaded offline',
          'Message your agent for changes',
          'Leave a review after your trip',
        ],
        showActivityPlaceholder: false,
      };
    
    case 'active_traveler':
      return {
        heroTitle: `Welcome back, ${userName}! Ready for more? 🌍`,
        heroSubtitle: `You've completed ${stats?.completedTrips || 0} amazing trips with us. Your next adventure awaits!`,
        primaryCTA: { label: 'Plan New Adventure', href: '/requests/new', icon: Sparkles },
        secondaryCTA: { label: 'View Past Trips', href: '/dashboard/bookings' },
        proTips: [
          'Try a new destination type this time',
          'Your reviews help other travelers',
          'Priority agent matching for loyal users',
        ],
        showActivityPlaceholder: false,
      };
  }
}

function determineUserState(
  requests: TravelRequest[],
  bookings: Booking[],
  stats: DashboardStats | null
): UserState {
  const hasCompletedTrips = (stats?.completedTrips || 0) > 0;
  const hasConfirmedBookings = (stats?.confirmedBookings || 0) > 0;
  const hasProposals = (stats?.awaitingSelection || 0) > 0;
  const hasActiveRequests = (stats?.activeRequests || 0) > 0;
  
  if (hasCompletedTrips) return 'active_traveler';
  if (hasConfirmedBookings) return 'has_bookings';
  if (hasProposals) return 'proposals_ready';
  if (hasActiveRequests) return 'awaiting_agents';
  return 'new_user';
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function DashboardPage() {
  const { user, loading: userLoading, error: userError } = useUserSession();
  const [requests, setRequests] = useState<TravelRequest[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  useEffect(() => {
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
  const userState = determineUserState(requests, bookings, stats);
  const stateConfig = getStateConfig(userState, stats, userName);
  
  // Get active requests (not completed/cancelled)
  const activeRequests = requests.filter(r => 
    !['BOOKED', 'COMPLETED', 'CANCELLED', 'EXPIRED'].includes(r.state)
  );
  
  // Get upcoming bookings (confirmed, not completed)
  const upcomingBookings = bookings.filter(b => 
    b.state === 'CONFIRMED' && new Date(b.travelStartDate) > new Date()
  );

  // Generate system activity events
  const systemActivity = generateSystemActivity(requests, activity, stats);

  if (userLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-500">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (userError || dataError || !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <RefreshCw className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-red-800 mb-2">Unable to Load Dashboard</h2>
          <p className="text-red-600 mb-6">
            {userError || dataError || 'No user session found. Please try refreshing the page.'}
          </p>
          <Button onClick={() => window.location.reload()} className="bg-red-600 hover:bg-red-700 text-white">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Page
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* State-Driven Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-3xl p-8 text-white shadow-2xl">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtOS45NCAwLTE4IDguMDYtMTggMThzOC4wNiAxOCAxOCAxOCAxOC04LjA2IDE4LTE4LTguMDYtMTgtMTgtMTh6bTAgMzJjLTcuNzMyIDAtMTQtNi4yNjgtMTQtMTRzNi4yNjgtMTQgMTQtMTQgMTQgNi4yNjggMTQgMTQtNi4yNjggMTQtMTQgMTR6IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9Ii4wNSIvPjwvZz48L3N2Zz4=')] opacity-30" />
        
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                <Sparkles className="h-6 w-6" />
              </div>
              <span className="text-blue-100 text-sm font-medium">
                {new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening'}
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-3">{stateConfig.heroTitle}</h1>
            <p className="text-blue-100 text-lg max-w-2xl">{stateConfig.heroSubtitle}</p>
            
            {/* State-specific badges */}
            {stats?.unreadMessages && stats.unreadMessages > 0 && (
              <div className="mt-4 flex items-center gap-2">
                <Badge className="bg-white/20 text-white border-0 px-3 py-1">
                  <MessageSquare className="h-3 w-3 mr-1" />
                  {stats.unreadMessages} new message{stats.unreadMessages !== 1 ? 's' : ''}
                </Badge>
              </div>
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href={stateConfig.primaryCTA.href}>
              <Button size="lg" variant="secondary" className="shadow-xl group text-base w-full sm:w-auto">
                <stateConfig.primaryCTA.icon className="h-5 w-5 mr-2" />
                {stateConfig.primaryCTA.label}
                <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            {stateConfig.secondaryCTA && (
              <Link href={stateConfig.secondaryCTA.href}>
                <Button size="lg" variant="ghost" className="text-white hover:bg-white/10 w-full sm:w-auto">
                  {stateConfig.secondaryCTA.label}
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Floating decorations */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
      </div>

      {/* Actionable Stats Row */}
      <div className="grid gap-4 md:grid-cols-4">
        <ActionableStatCard 
          title="Active Requests" 
          value={String(stats?.activeRequests || 0)} 
          icon={<FileText className="h-5 w-5" />} 
          color="blue"
          href="/dashboard/requests"
          actionText="View requests"
          isEmpty={!stats?.activeRequests}
        />
        <ActionableStatCard 
          title="Proposals Ready" 
          value={String(stats?.awaitingSelection || 0)} 
          icon={<Target className="h-5 w-5" />} 
          color="amber"
          href="/dashboard/requests"
          actionText="Choose your agent"
          subtitle={stats?.awaitingSelection ? 'Select now!' : undefined}
          highlight={!!stats?.awaitingSelection}
          isEmpty={!stats?.awaitingSelection}
        />
        <ActionableStatCard 
          title="Confirmed Bookings" 
          value={String(stats?.confirmedBookings || 0)} 
          icon={<CheckCircle className="h-5 w-5" />} 
          color="green"
          href="/dashboard/bookings"
          actionText="View itinerary"
          isEmpty={!stats?.confirmedBookings}
        />
        <ActionableStatCard 
          title="Completed Trips" 
          value={String(stats?.completedTrips || 0)} 
          icon={<Award className="h-5 w-5" />} 
          color="purple"
          href="/dashboard/bookings?filter=completed"
          actionText="Leave reviews"
          isEmpty={!stats?.completedTrips}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Travel Requests - Takes 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Request Progress Cards (for users with active requests) */}
          {activeRequests.length > 0 && (
            <Card className="shadow-lg border-0 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50/50 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <Globe className="h-5 w-5 text-blue-600" />
                      Your Trip Requests
                    </CardTitle>
                    <CardDescription>Track your trip planning progress</CardDescription>
                  </div>
                  <Link href="/dashboard/requests">
                    <Button variant="ghost" size="sm">View All</Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {activeRequests.slice(0, 3).map((request) => (
                    <RequestProgressCard key={request.id} request={request} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* New User Empty State */}
          {userState === 'new_user' && (
            <Card className="shadow-lg border-0 overflow-hidden">
              <CardContent className="p-0">
                <NewUserEmptyState />
              </CardContent>
            </Card>
          )}

          {/* Upcoming Trip Card */}
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
                {upcomingBookings.slice(0, 1).map((booking) => (
                  <UpcomingTripCard key={booking.id} booking={booking} />
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Live Activity Feed */}
          <Card className="shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-purple-50/50 border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <Bell className="h-5 w-5 text-purple-600" />
                Activity Feed
                {systemActivity.length > 0 && (
                  <Badge variant="secondary" className="ml-auto text-xs">
                    Live
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {systemActivity.length > 0 ? (
                <div className="divide-y">
                  {systemActivity.slice(0, 6).map((item, i) => (
                    <ActivityFeedItem key={item.id || i} item={item} />
                  ))}
                </div>
              ) : stateConfig.showActivityPlaceholder ? (
                <ActivityPlaceholder />
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No recent activity</p>
                </div>
              )}
              {systemActivity.length > 6 && (
                <div className="p-4 border-t">
                  <Link href="/dashboard/notifications" className="text-sm text-blue-600 hover:underline font-medium">
                    View all activity →
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contextual Pro Tips */}
          <Card className="shadow-lg border-0 bg-gradient-to-br from-amber-50 to-orange-50 overflow-hidden">
            <CardHeader className="border-b border-amber-100">
              <CardTitle className="text-lg flex items-center gap-2 text-amber-800">
                <Lightbulb className="h-5 w-5" />
                {userState === 'proposals_ready' ? 'Selection Tips' : userState === 'new_user' ? 'Getting Started' : 'Pro Tips'}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <ul className="space-y-3">
                {stateConfig.proTips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-amber-900">
                    <span className="text-amber-500 font-bold mt-0.5">✦</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Quick Help */}
          <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-600 to-purple-600 text-white overflow-hidden">
            <CardContent className="p-6">
              <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                <Heart className="h-5 w-5" />
                Need Help?
              </h3>
              <p className="text-blue-100 text-sm mb-4">Our support team is here 24/7 to assist you with anything.</p>
              <Link href="/help">
                <Button variant="secondary" size="sm" className="w-full">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Contact Support
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Light Personalization Widget */}
          {(stats?.completedTrips || 0) === 0 && activeRequests.length === 0 && (
            <Card className="shadow-lg border-0 border-l-4 border-l-blue-500 bg-blue-50/50">
              <CardContent className="p-4">
                <p className="text-sm text-blue-800 font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  127 travelers just like you planned trips this week
                </p>
                <p className="text-xs text-blue-600 mt-1">Most choose an agent within 24 hours</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ACTIONABLE STAT CARD
// ============================================================================

function ActionableStatCard({ 
  title, value, icon, color = 'blue', href, actionText, subtitle, highlight, isEmpty
}: { 
  title: string; 
  value: string; 
  icon: React.ReactNode;
  color?: 'blue' | 'green' | 'amber' | 'red' | 'purple';
  href: string;
  actionText: string;
  subtitle?: string;
  highlight?: boolean;
  isEmpty?: boolean;
}) {
  // Muted styles for empty state, vibrant for has-value state
  const colorClasses = {
    blue: isEmpty ? 'bg-gray-50 text-gray-400 border-gray-200' : 'bg-blue-50 text-blue-600 border-blue-200 hover:border-blue-400 hover:shadow-lg',
    green: isEmpty ? 'bg-gray-50 text-gray-400 border-gray-200' : 'bg-green-50 text-green-600 border-green-200 hover:border-green-400 hover:shadow-lg',
    amber: isEmpty ? 'bg-gray-50 text-gray-400 border-gray-200' : 'bg-amber-50 text-amber-600 border-amber-200 hover:border-amber-400 hover:shadow-lg',
    red: isEmpty ? 'bg-gray-50 text-gray-400 border-gray-200' : 'bg-red-50 text-red-600 border-red-200 hover:border-red-400 hover:shadow-lg',
    purple: isEmpty ? 'bg-gray-50 text-gray-400 border-gray-200' : 'bg-purple-50 text-purple-600 border-purple-200 hover:border-purple-400 hover:shadow-lg',
  };

  const iconClasses = {
    blue: isEmpty ? 'bg-gray-100 text-gray-400' : 'bg-blue-100 text-blue-600',
    green: isEmpty ? 'bg-gray-100 text-gray-400' : 'bg-green-100 text-green-600',
    amber: isEmpty ? 'bg-gray-100 text-gray-400' : 'bg-amber-100 text-amber-600',
    red: isEmpty ? 'bg-gray-100 text-gray-400' : 'bg-red-100 text-red-600',
    purple: isEmpty ? 'bg-gray-100 text-gray-400' : 'bg-purple-100 text-purple-600',
  };

  const cardContent = (
    <Card 
      className={`border-2 shadow-sm transition-all ${!isEmpty ? 'cursor-pointer group' : 'cursor-default'} ${colorClasses[color]} ${highlight ? 'ring-2 ring-amber-400 ring-offset-2' : ''}`}
      title={isEmpty ? "You'll see updates here once you create a request" : undefined}
    >
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className={`p-2.5 rounded-xl ${iconClasses[color]} ${!isEmpty ? 'group-hover:scale-110' : ''} transition-transform`}>{icon}</div>
          {highlight && (
            <Badge className="bg-amber-500 text-white border-0 animate-pulse text-xs">
              Action needed
            </Badge>
          )}
          {!isEmpty && !highlight && (
            <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-current group-hover:translate-x-1 transition-all" />
          )}
        </div>
        <p className={`text-3xl font-bold mb-1 ${isEmpty ? 'text-gray-300' : ''}`}>{value}</p>
        <p className={`text-sm font-medium ${isEmpty ? 'text-gray-400' : 'opacity-80'}`}>{title}</p>
        {subtitle && <p className="text-xs font-semibold mt-1">{subtitle}</p>}
        {!isEmpty && (
          <div className="mt-3 flex items-center text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
            <span>{actionText}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  // Non-empty cards are interactive, empty cards are informational
  if (isEmpty) {
    return cardContent;
  }

  return <Link href={href}>{cardContent}</Link>;
}

// ============================================================================
// REQUEST PROGRESS CARD
// ============================================================================

function RequestProgressCard({ request }: { request: TravelRequest }) {
  const stages = [
    { key: 'created', label: 'Created', icon: FileText },
    { key: 'matching', label: 'Agents Responding', icon: Search },
    { key: 'proposals', label: 'Proposals Ready', icon: Target },
    { key: 'booked', label: 'Booked', icon: CheckCircle },
  ];
  
  const currentStageIndex = getRequestStageIndex(request.state);
  
  return (
    <Link href={`/dashboard/requests/${request.id}`}>
      <div className="group flex flex-col p-5 border-2 rounded-2xl hover:border-blue-300 hover:shadow-lg transition-all bg-white cursor-pointer">
        <div className="flex items-center gap-4 mb-4">
          <div className="text-4xl">
            {getDestinationEmoji(request.destination?.country || request.destination?.city)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-lg group-hover:text-blue-600 transition-colors truncate">
                {request.destination?.label || request.destination?.city || request.title}
              </h3>
              <StatusBadge status={request.state} />
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {formatDateRange(request.departureDate, request.returnDate)}
              </span>
              {(request.agentsResponded || 0) > 0 && (
                <span className="flex items-center gap-1 text-blue-600 font-medium">
                  <Zap className="h-3.5 w-3.5" />
                  {request.agentsResponded} agent{request.agentsResponded !== 1 ? 's' : ''} responded
                </span>
              )}
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
        </div>
        
        {/* Progress Bar */}
        <div className="mt-2">
          <div className="flex items-center justify-between mb-2">
            {stages.map((stage, i) => (
              <div 
                key={stage.key} 
                className={`flex items-center gap-1 text-xs ${i <= currentStageIndex ? 'text-blue-600 font-medium' : 'text-gray-400'}`}
              >
                <stage.icon className={`h-3 w-3 ${i <= currentStageIndex ? 'text-blue-500' : 'text-gray-300'}`} />
                <span className="hidden sm:inline">{stage.label}</span>
              </div>
            ))}
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
              style={{ width: `${((currentStageIndex + 1) / stages.length) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}

function getRequestStageIndex(state: string): number {
  const stageMap: Record<string, number> = {
    'DRAFT': 0,
    'SUBMITTED': 1,
    'MATCHING': 1,
    'PROPOSALS_RECEIVED': 2,
    'BOOKED': 3,
    'COMPLETED': 3,
  };
  return stageMap[state] || 0;
}

// ============================================================================
// NEW USER EMPTY STATE
// ============================================================================

function NewUserEmptyState() {
  const steps = [
    { num: 1, label: 'Create request', icon: Send, color: 'blue', active: true },
    { num: 2, label: 'Agents respond', icon: Users, color: 'purple', active: false },
    { num: 3, label: 'Compare proposals', icon: Target, color: 'amber', active: false },
    { num: 4, label: 'Book your trip', icon: CheckCircle, color: 'green', active: false },
  ];

  return (
    <div className="bg-gradient-to-br from-slate-50 to-blue-50/50 py-10 px-8">
      <div className="max-w-2xl mx-auto">
        {/* Procedural header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-100 rounded-2xl mb-4">
            <Plus className="h-7 w-7 text-blue-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">
            Create your first trip request
          </h3>
          <p className="text-gray-500">
            Tell us where you want to go — agents will take it from there.
          </p>
        </div>

        {/* 4-Step Progress Visualization */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
          <div className="flex items-center justify-between">
            {steps.map((step, i) => (
              <div key={step.num} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    step.active 
                      ? 'bg-blue-600 text-white shadow-lg ring-4 ring-blue-100' 
                      : 'bg-gray-100 text-gray-400'
                  }`}>
                    <step.icon className="h-5 w-5" />
                  </div>
                  <span className={`text-xs mt-2 font-medium ${
                    step.active ? 'text-blue-600' : 'text-gray-400'
                  }`}>
                    {step.label}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div className="flex-1 h-0.5 bg-gray-200 mx-3 mt-[-20px] min-w-[40px]" />
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* CTA */}
        <div className="text-center">
          <Link href="/requests/new">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 shadow-md gap-2 px-8">
              <Plus className="h-5 w-5" />
              Create Your First Request
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// UPCOMING TRIP CARD
// ============================================================================

function UpcomingTripCard({ booking }: { booking: Booking }) {
  const daysUntil = Math.ceil((new Date(booking.travelStartDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const destination = booking.request?.destination?.label || booking.request?.destination?.city || 'Your Trip';
  
  return (
    <Link href={`/dashboard/bookings/${booking.id}`}>
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
              {booking.agent.rating && (
                <div className="flex items-center gap-0.5">
                  <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm font-medium">{booking.agent.rating.toFixed(1)}</span>
                </div>
              )}
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
}

// ============================================================================
// ACTIVITY FEED
// ============================================================================

interface SystemActivity extends ActivityItem {
  icon?: React.ElementType;
  color?: string;
}

function generateSystemActivity(
  requests: TravelRequest[], 
  activity: ActivityItem[],
  _stats: DashboardStats | null
): SystemActivity[] {
  const items: SystemActivity[] = [];
  
  // Add real activity
  for (const item of activity) {
    items.push({
      ...item,
      icon: getActivityIconComponent(item.type),
      color: getActivityColor(item.type),
    });
  }
  
  // Generate system events for active requests
  for (const request of requests.slice(0, 3)) {
    if (request.state === 'SUBMITTED' || request.state === 'MATCHING') {
      // Simulate agent activity
      items.push({
        id: `system-${request.id}-sent`,
        type: 'notification',
        message: `Request sent to ${5 + Math.floor(Math.random() * 5)} matched agents`,
        time: request.createdAt,
        icon: Send,
        color: 'blue',
      });
      
      if (request.agentsResponded && request.agentsResponded > 0) {
        items.push({
          id: `system-${request.id}-viewed`,
          type: 'notification',
          message: `${request.agentsResponded} agent${request.agentsResponded > 1 ? 's' : ''} viewed your request`,
          time: new Date(new Date(request.createdAt).getTime() + 3600000).toISOString(),
          icon: Eye,
          color: 'purple',
        });
      }
    }
    
    if (request.state === 'PROPOSALS_RECEIVED') {
      items.push({
        id: `system-${request.id}-proposals`,
        type: 'agent_response',
        message: `${request.agentsResponded || 1} proposal${(request.agentsResponded || 1) > 1 ? 's' : ''} ready for ${request.destination?.city || 'your trip'}`,
        time: request.updatedAt || request.createdAt,
        icon: Target,
        color: 'amber',
      });
    }
  }
  
  // Sort by time, newest first
  items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  
  return items;
}

function ActivityFeedItem({ item }: { item: SystemActivity }) {
  const IconComponent = item.icon || Bell;
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    amber: 'bg-amber-100 text-amber-600',
    purple: 'bg-purple-100 text-purple-600',
    red: 'bg-red-100 text-red-600',
  };
  
  return (
    <div className="p-4 hover:bg-gray-50 transition-colors cursor-pointer">
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${colorClasses[item.color || 'blue']}`}>
          <IconComponent className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-800">{item.message}</p>
          <p className="text-xs text-gray-400 mt-1">{formatRelativeTime(item.time)}</p>
        </div>
      </div>
    </div>
  );
}

function ActivityPlaceholder() {
  return (
    <div className="p-5">
      {/* Explicit label for clarity */}
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
        <Clock className="h-4 w-4 text-gray-400" />
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          What happens next
        </span>
      </div>
      
      <div className="space-y-3">
        {/* Step 1 - Current/highlighted */}
        <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="p-2 bg-blue-600 rounded-lg">
            <Send className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm text-blue-800 font-medium">Request sent to agents</p>
            <p className="text-xs text-blue-600">After you create a request</p>
          </div>
        </div>
        {/* Step 2 - Future/muted */}
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg opacity-50">
          <div className="p-2 bg-gray-200 rounded-lg">
            <Eye className="h-4 w-4 text-gray-500" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Agents view & respond</p>
          </div>
        </div>
        {/* Step 3 - Future/muted */}
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg opacity-50">
          <div className="p-2 bg-gray-200 rounded-lg">
            <Target className="h-4 w-4 text-gray-500" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Proposals ready to compare</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function getActivityIconComponent(type: string): React.ElementType {
  switch (type) {
    case 'agent_response': return FileText;
    case 'match': return Zap;
    case 'message': return MessageSquare;
    case 'booking': return CheckCircle;
    default: return Bell;
  }
}

function getActivityColor(type: string): string {
  switch (type) {
    case 'agent_response': return 'blue';
    case 'match': return 'purple';
    case 'message': return 'green';
    case 'booking': return 'green';
    default: return 'blue';
  }
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

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function getDestinationEmoji(destination?: string): string {
  if (!destination) return '🌍';
  const lower = destination.toLowerCase();
  
  const emojiMap: Record<string, string> = {
    rajasthan: '🏰', jaipur: '🏰', udaipur: '🏰', jodhpur: '🏰', jaisalmer: '🏜️',
    kerala: '🌴', kochi: '🌴', munnar: '🌴', alleppey: '🛶', kovalam: '🏖️',
    goa: '🏖️', ladakh: '🏔️', leh: '🏔️', manali: '🏔️', shimla: '🏔️',
    andaman: '🏝️', kashmir: '🏔️', varanasi: '🕉️', rishikesh: '🧘',
    agra: '🕌', delhi: '🏛️', mumbai: '🌆', bangalore: '🏙️', chennai: '🌅',
    darjeeling: '🍵', sikkim: '🏔️', meghalaya: '🌿', assam: '🦏',
    ranthambore: '🐅', jim_corbett: '🐅', kaziranga: '🦏', bandhavgarh: '🐅',
    india: '🇮🇳',
    maldives: '🏝️', bali: '🌺', thailand: '🏯', singapore: '🦁',
    dubai: '🏙️', paris: '🗼', london: '🎡', new_york: '🗽',
    japan: '🗾', switzerland: '🏔️', australia: '🦘', italy: '🍕',
  };

  for (const [key, emoji] of Object.entries(emojiMap)) {
    if (lower.includes(key)) return emoji;
  }
  return '🌍';
}

// ============================================================================
// Sub-Components
// ============================================================================

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { label: string; className: string }> = {
    DRAFT: { label: 'Draft', className: 'bg-gray-100 text-gray-600' },
    SUBMITTED: { label: 'Sent to Agents', className: 'bg-blue-100 text-blue-700' },
    MATCHING: { label: 'Finding Agents', className: 'bg-blue-100 text-blue-700 animate-pulse' },
    PROPOSALS_RECEIVED: { label: '🔥 Review Proposals', className: 'bg-amber-100 text-amber-700 font-semibold' },
    BOOKED: { label: '✓ Booked', className: 'bg-green-100 text-green-700' },
    COMPLETED: { label: '✓ Completed', className: 'bg-green-100 text-green-700' },
    CANCELLED: { label: 'Cancelled', className: 'bg-red-100 text-red-700' },
    EXPIRED: { label: 'Expired', className: 'bg-gray-100 text-gray-600' },
  };

  const config = variants[status] || { label: status, className: 'bg-gray-100 text-gray-600' };
  return <Badge className={`border-0 text-xs ${config.className}`}>{config.label}</Badge>;
}
