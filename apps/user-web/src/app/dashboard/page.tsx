'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  CheckCircle,
  Calendar,
  MessageSquare,
  ChevronRight,
  Star,
  Plane,
  ArrowRight,
  Loader2,
  Eye,
  Users,
  Send,
  Target,
  Clock,
  Shield,
  RefreshCw,
  Sparkles,
  MapPin,
  Zap,
  TrendingUp,
  Heart,
  Globe,
  Award,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
// USER JOURNEY STATES
// ============================================================================

type JourneyStage = 
  | 'idea'              // New user - hasn't started
  | 'request_sent'      // Request submitted, waiting for agents
  | 'agents_responding' // Agents are viewing/responding
  | 'compare'           // Proposals ready to compare
  | 'booked'            // Trip is booked
  | 'traveling';        // Currently on trip or completed

// ============================================================================
// JOURNEY STAGE DETERMINATION
// ============================================================================

function determineJourneyStage(
  requests: TravelRequest[],
  bookings: Booking[],
  stats: DashboardStats | null
): JourneyStage {
  const hasCompletedTrips = (stats?.completedTrips || 0) > 0;
  const hasConfirmedBookings = (stats?.confirmedBookings || 0) > 0;
  const hasProposals = (stats?.awaitingSelection || 0) > 0;
  const hasActiveRequests = (stats?.activeRequests || 0) > 0;
  
  if (hasCompletedTrips || hasConfirmedBookings) return 'booked';
  if (hasProposals) return 'compare';
  if (hasActiveRequests) return 'agents_responding';
  return 'idea';
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: userLoading, error: userError } = useUserSession();
  const [requests, setRequests] = useState<TravelRequest[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  // Redirect to login if no user session after loading completes
  useEffect(() => {
    if (!userLoading && !user && !userError) {
      router.replace('/login');
    }
  }, [userLoading, user, userError, router]);

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

  const journeyStage = determineJourneyStage(requests, bookings, stats);
  
  // Get the most relevant active request
  const activeRequest = requests.find(r => 
    !['BOOKED', 'COMPLETED', 'CANCELLED', 'EXPIRED'].includes(r.state)
  );
  
  // Get upcoming booking
  const upcomingBooking = bookings.find(b => 
    b.state === 'CONFIRMED' && new Date(b.travelStartDate) > new Date()
  );

  if (userLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  if (userError || dataError || !user) {
    // If no user and no error, we're redirecting to login - show loading
    if (!user && !userError && !dataError) {
      return (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Redirecting to login...</p>
          </div>
        </div>
      );
    }

    // Show error state with options
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 max-w-md">
          <RefreshCw className="h-8 w-8 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-red-800 mb-2">Unable to Load Dashboard</h2>
          <p className="text-red-600 mb-6 text-sm">
            {userError || dataError || 'Session expired. Please sign in again.'}
          </p>
          <div className="flex flex-col gap-3">
            <Button onClick={() => window.location.reload()} variant="outline" size="sm" className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Page
            </Button>
            <Link href="/login">
              <Button variant="default" size="sm" className="w-full">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 py-6 px-4 sm:px-0">
      {/* ================================================================== */}
      {/* WELCOME HEADER - Personalized greeting */}
      {/* ================================================================== */}
      <WelcomeHeader userName={user?.firstName || 'there'} stage={journeyStage} stats={stats} />

      {/* ================================================================== */}
      {/* TRIP TIMELINE - Primary Visual Anchor (Always Visible) */}
      {/* ================================================================== */}
      <TripTimeline stage={journeyStage} />

      {/* ================================================================== */}
      {/* CENTRAL ACTION PANEL - "What should I do right now?" */}
      {/* ================================================================== */}
      <ActionPanel 
        stage={journeyStage} 
        activeRequest={activeRequest}
        upcomingBooking={upcomingBooking}
        stats={stats}
        userName={user?.firstName || 'there'}
      />

      {/* ================================================================== */}
      {/* TWO-COLUMN LAYOUT: Active Trip Details + Signals */}
      {/* ================================================================== */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content - Active Trip Workspace */}
        <div className="lg:col-span-2 space-y-4">
          {/* Show active request details if exists */}
          {activeRequest && (
            <ActiveTripCard request={activeRequest} stage={journeyStage} />
          )}
          
          {/* Show upcoming booking if exists */}
          {upcomingBooking && (
            <UpcomingTripCard booking={upcomingBooking} />
          )}

          {/* Messaging Preview (if there are messages) */}
          {(stats?.unreadMessages || 0) > 0 && (
            <MessagingPreview unreadCount={stats?.unreadMessages || 0} />
          )}

          {/* Quick Actions Grid for new users */}
          {journeyStage === 'idea' && (
            <QuickActionsGrid />
          )}
        </div>

        {/* Right Rail - Signals (Not Tips) */}
        <div className="space-y-4">
          <SignalsPanel stage={journeyStage} stats={stats} />
          
          {/* Stats card for returning users */}
          {(stats?.completedTrips || 0) > 0 && (
            <StatsCard stats={stats} />
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// WELCOME HEADER
// ============================================================================

function WelcomeHeader({ userName, stage, stats }: { userName: string; stage: JourneyStage; stats: DashboardStats | null }) {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          {getGreeting()}, <span className="bg-gradient-to-r from-blue-600 to-purple-600 text-transparent bg-clip-text">{userName}</span>! 👋
        </h1>
        <p className="text-gray-500 mt-1">
          {stage === 'idea' 
            ? "Ready to plan your next adventure?"
            : stage === 'compare'
            ? "You have proposals waiting for review!"
            : "Here's what's happening with your trips."
          }
        </p>
      </div>
      {(stats?.activeRequests || 0) > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-xl">
          <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse" />
          <span className="text-sm font-medium text-blue-700">
            {stats?.activeRequests} active request{(stats?.activeRequests || 0) !== 1 ? 's' : ''}
          </span>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// TRIP TIMELINE - The Backbone
// ============================================================================

function TripTimeline({ stage }: { stage: JourneyStage }) {
  const stages = [
    { key: 'idea', label: 'Start', icon: Sparkles, description: 'Plan your trip' },
    { key: 'request_sent', label: 'Request', icon: Send, description: 'Sent to agents' },
    { key: 'agents_responding', label: 'Matching', icon: Users, description: 'Agents respond' },
    { key: 'compare', label: 'Compare', icon: Target, description: 'Choose best' },
    { key: 'booked', label: 'Booked', icon: CheckCircle, description: 'All set!' },
  ];

  const currentIndex = stages.findIndex(s => s.key === stage || 
    (stage === 'traveling' && s.key === 'booked'));

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 mb-6">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
          <TrendingUp className="h-4 w-4 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Your Journey</h3>
          <p className="text-xs text-gray-500">Track your trip planning progress</p>
        </div>
      </div>

      <div className="flex items-center justify-between relative">
        {/* Background line */}
        <div className="absolute top-5 left-5 right-5 h-0.5 bg-gray-100 -z-10" />
        <div 
          className="absolute top-5 left-5 h-0.5 bg-gradient-to-r from-green-500 to-blue-500 transition-all duration-500 -z-10"
          style={{ width: `${Math.max(0, currentIndex) * 25}%` }}
        />

        {stages.map((s, i) => {
          const isComplete = i < currentIndex;
          const isCurrent = i === currentIndex;
          const isFuture = i > currentIndex;
          
          return (
            <div key={s.key} className="flex flex-col items-center relative z-10">
              {/* Step Circle */}
              <div 
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300
                  ${isComplete ? 'bg-gradient-to-br from-green-400 to-green-500 text-white shadow-lg shadow-green-500/30' : ''}
                  ${isCurrent ? 'bg-gradient-to-br from-blue-500 to-purple-500 text-white ring-4 ring-blue-100 scale-110 shadow-lg shadow-blue-500/30' : ''}
                  ${isFuture ? 'bg-gray-100 text-gray-400 border-2 border-gray-200' : ''}
                `}
              >
                {isComplete ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <s.icon className="h-5 w-5" />
                )}
              </div>
              
              {/* Labels */}
              <div className="mt-3 text-center">
                <span className={`
                  text-xs font-semibold block
                  ${isCurrent ? 'text-blue-600' : isComplete ? 'text-green-600' : 'text-gray-400'}
                `}>
                  {s.label}
                </span>
                <span className={`
                  text-[10px] mt-0.5 block
                  ${isCurrent ? 'text-blue-500' : isComplete ? 'text-green-500' : 'text-gray-300'}
                `}>
                  {s.description}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// CENTRAL ACTION PANEL - Always answers "What should I do right now?"
// ============================================================================

interface ActionPanelProps {
  stage: JourneyStage;
  activeRequest?: TravelRequest;
  upcomingBooking?: Booking;
  stats: DashboardStats | null;
  userName: string;
}

function ActionPanel({ stage, activeRequest, upcomingBooking, stats, userName }: ActionPanelProps) {
  const configs: Record<JourneyStage, {
    title: string;
    subtitle: string;
    cta: { label: string; href: string; variant?: 'default' | 'outline' };
    secondaryCta?: { label: string; href: string };
    gradient: string;
    emoji: string;
  }> = {
    idea: {
      title: 'Start your dream trip',
      subtitle: 'Tell us where you want to go. Expert agents compete to plan your perfect adventure — free, no commitment.',
      cta: { label: 'Create Trip Request', href: '/requests/new' },
      gradient: 'from-blue-500 via-indigo-500 to-purple-600',
      emoji: '✨',
    },
    request_sent: {
      title: 'Request submitted!',
      subtitle: 'Your trip request has been sent to travel agents. They\'re reviewing it now.',
      cta: { label: 'View Request Details', href: '/dashboard/requests', variant: 'outline' },
      gradient: 'from-amber-500 to-orange-500',
      emoji: '📤',
    },
    agents_responding: {
      title: 'Agents are crafting proposals',
      subtitle: `Expert agents are designing personalized itineraries. You'll be notified when they're ready.`,
      cta: { label: 'View Progress', href: '/dashboard/requests', variant: 'outline' },
      secondaryCta: { label: 'Edit Preferences', href: activeRequest ? `/dashboard/requests/${activeRequest.id}` : '/dashboard/requests' },
      gradient: 'from-cyan-500 to-blue-600',
      emoji: '⚡',
    },
    compare: {
      title: `${stats?.awaitingSelection || 'New'} proposals ready!`,
      subtitle: 'Agents have sent you personalized itineraries. Compare and choose your favorite.',
      cta: { label: 'Compare Proposals', href: '/dashboard/requests' },
      gradient: 'from-emerald-500 to-teal-600',
      emoji: '🎯',
    },
    booked: {
      title: upcomingBooking ? 'Your trip is confirmed!' : `Welcome back, ${userName}!`,
      subtitle: upcomingBooking 
        ? 'Everything is set. Your agent is available if you need anything.'
        : 'Ready for your next adventure?',
      cta: upcomingBooking 
        ? { label: 'View Itinerary', href: '/dashboard/bookings' }
        : { label: 'Plan New Trip', href: '/requests/new' },
      secondaryCta: upcomingBooking ? { label: 'Message Agent', href: '/dashboard/messages' } : undefined,
      gradient: 'from-green-500 to-emerald-600',
      emoji: upcomingBooking ? '🎉' : '🌎',
    },
    traveling: {
      title: 'Enjoy your trip!',
      subtitle: 'Your agent is on standby if you need any assistance.',
      cta: { label: 'View Itinerary', href: '/dashboard/bookings' },
      secondaryCta: { label: 'Contact Agent', href: '/dashboard/messages' },
      gradient: 'from-pink-500 to-rose-600',
      emoji: '🏖️',
    },
  };

  const config = configs[stage];

  return (
    <Card className="border-0 shadow-xl overflow-hidden relative group">
      {/* Gradient background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${config.gradient} opacity-[0.03] group-hover:opacity-[0.05] transition-opacity`} />
      
      <CardContent className="p-8 relative">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl">{config.emoji}</span>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                {config.title}
              </h1>
            </div>
            <p className="text-gray-600 text-lg max-w-xl leading-relaxed">
              {config.subtitle}
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <Link href={config.cta.href}>
              <Button 
                size="lg" 
                variant={config.cta.variant || 'default'}
                className={`
                  w-full sm:w-auto shadow-lg font-semibold h-12 px-6 rounded-xl transition-all duration-300
                  ${!config.cta.variant ? `bg-gradient-to-r ${config.gradient} hover:shadow-xl hover:scale-105 text-white` : 'hover:scale-105'}
                `}
              >
                {config.cta.label}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
            {config.secondaryCta && (
              <Link href={config.secondaryCta.href}>
                <Button size="lg" variant="ghost" className="w-full sm:w-auto h-12 rounded-xl hover:bg-gray-100">
                  {config.secondaryCta.label}
                </Button>
              </Link>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// QUICK ACTIONS GRID - For new users
// ============================================================================

function QuickActionsGrid() {
  const actions = [
    { 
      href: '/explore', 
      icon: Globe, 
      label: 'Explore Destinations', 
      description: 'Get inspired',
      color: 'from-blue-500 to-cyan-500',
    },
    { 
      href: '/how-it-works', 
      icon: Heart, 
      label: 'How It Works', 
      description: 'Learn more',
      color: 'from-pink-500 to-rose-500',
    },
    { 
      href: '/agents', 
      icon: Award, 
      label: 'Meet Our Agents', 
      description: 'Expert planners',
      color: 'from-amber-500 to-orange-500',
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {actions.map((action) => (
        <Link key={action.href} href={action.href}>
          <Card className="border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all cursor-pointer group h-full">
            <CardContent className="p-4 flex flex-col items-center text-center">
              <div className={`p-3 rounded-xl bg-gradient-to-br ${action.color} text-white mb-3 group-hover:scale-110 transition-transform`}>
                <action.icon className="h-5 w-5" />
              </div>
              <h4 className="font-medium text-gray-900 text-sm">{action.label}</h4>
              <p className="text-xs text-gray-500 mt-0.5">{action.description}</p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

// ============================================================================
// STATS CARD - For returning users
// ============================================================================

function StatsCard({ stats }: { stats: DashboardStats | null }) {
  return (
    <Card className="border border-gray-100 bg-gradient-to-br from-gray-50 to-white">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Award className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-semibold text-gray-700">Your Stats</span>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Trips completed</span>
            <span className="text-sm font-bold text-gray-900">{stats?.completedTrips || 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Active requests</span>
            <span className="text-sm font-bold text-blue-600">{stats?.activeRequests || 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Upcoming trips</span>
            <span className="text-sm font-bold text-green-600">{stats?.confirmedBookings || 0}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// ACTIVE TRIP CARD - Shows current request details
// ============================================================================

function ActiveTripCard({ request, stage }: { request: TravelRequest; stage: JourneyStage }) {
  const destination = request.destination?.label || request.destination?.city || request.title || 'Your Trip';
  
  return (
    <Link href={`/dashboard/requests/${request.id}`}>
      <Card className="border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all cursor-pointer group overflow-hidden">
        <CardContent className="p-0">
          {/* Gradient accent bar */}
          <div className="h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
          
          <div className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="text-4xl transform group-hover:scale-110 transition-transform">
                  {getDestinationEmoji(request.destination?.country || request.destination?.city)}
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-gray-900 group-hover:text-blue-600 transition-colors">
                    {destination}
                  </h3>
                  <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDateRange(request.departureDate, request.returnDate)}
                    </span>
                    {request.travelers && (
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {getTravelerCount(request.travelers)} travelers
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <StatusBadge stage={stage} agentsResponded={request.agentsResponded} />
                <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function StatusBadge({ stage, agentsResponded }: { stage: JourneyStage; agentsResponded?: number }) {
  if (stage === 'compare') {
    return (
      <Badge className="bg-amber-100 text-amber-700 border-0">
        <Target className="h-3 w-3 mr-1" />
        Review proposals
      </Badge>
    );
  }
  
  if (stage === 'agents_responding' && agentsResponded && agentsResponded > 0) {
    return (
      <Badge className="bg-blue-100 text-blue-700 border-0">
        <Users className="h-3 w-3 mr-1" />
        {agentsResponded} agent{agentsResponded > 1 ? 's' : ''} responded
      </Badge>
    );
  }
  
  return (
    <Badge className="bg-gray-100 text-gray-600 border-0">
      <Clock className="h-3 w-3 mr-1" />
      Awaiting agents
    </Badge>
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
      <Card className="border border-green-200 bg-green-50/50 hover:shadow-md transition-all cursor-pointer group">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="text-4xl">
                  {getDestinationEmoji(booking.request?.destination?.country)}
                </div>
                <div className="absolute -bottom-1 -right-1 bg-green-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                  {daysUntil}d
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Plane className="h-4 w-4 text-green-600" />
                  <h3 className="font-semibold text-gray-900">{destination}</h3>
                </div>
                <p className="text-sm text-gray-500 mt-0.5">
                  {formatDateRange(booking.travelStartDate, booking.travelEndDate)}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {booking.agent && (
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-gray-700">{booking.agent.fullName}</p>
                  {booking.agent.rating && (
                    <div className="flex items-center gap-1 justify-end">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      <span className="text-xs text-gray-500">{booking.agent.rating.toFixed(1)}</span>
                    </div>
                  )}
                </div>
              )}
              <Badge className="bg-green-100 text-green-700 border-0">
                <CheckCircle className="h-3 w-3 mr-1" />
                Confirmed
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

// ============================================================================
// MESSAGING PREVIEW - Contextual, not dominant
// ============================================================================

function MessagingPreview({ unreadCount }: { unreadCount: number }) {
  return (
    <Link href="/dashboard/messages">
      <Card className="border border-blue-200 bg-blue-50/30 hover:bg-blue-50 transition-all cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <MessageSquare className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  {unreadCount} new message{unreadCount !== 1 ? 's' : ''}
                </p>
                <p className="text-sm text-gray-500">from your agents</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

// ============================================================================
// SIGNALS PANEL - Reassurance > Advice
// ============================================================================

function SignalsPanel({ stage, stats }: { stage: JourneyStage; stats: DashboardStats | null }) {
  // Different signals based on journey stage
  const getSignals = () => {
    switch (stage) {
      case 'idea':
        return [
          { icon: Zap, text: 'Most agents respond in ~4 hours', color: 'blue' },
          { icon: Shield, text: 'You\'re not obligated to book', color: 'green' },
          { icon: Users, text: '127 travelers booked this week', color: 'purple' },
        ];
      case 'request_sent':
      case 'agents_responding':
        return [
          { icon: Eye, text: 'Agents are viewing your request', color: 'blue' },
          { icon: Clock, text: 'Proposals usually arrive in 4h', color: 'amber' },
          { icon: Shield, text: 'No commitment required', color: 'green' },
        ];
      case 'compare':
        return [
          { icon: Target, text: 'Compare at least 2 proposals', color: 'blue' },
          { icon: MessageSquare, text: 'Message agents with questions', color: 'purple' },
          { icon: Shield, text: 'Book only when you\'re ready', color: 'green' },
        ];
      case 'booked':
      case 'traveling':
        return [
          { icon: MessageSquare, text: 'Your agent is on standby', color: 'blue' },
          { icon: Star, text: 'Leave a review after your trip', color: 'amber' },
          { icon: Plus, text: 'Plan your next adventure', color: 'purple' },
        ];
    }
  };

  const signals = getSignals();
  const colorMap: Record<string, { bg: string; text: string }> = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-600' },
    green: { bg: 'bg-green-50', text: 'text-green-600' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600' },
  };

  return (
    <Card className="border border-gray-100">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-4 w-4 text-green-500" />
          <span className="text-sm font-semibold text-gray-700">Good to know</span>
        </div>
        <div className="space-y-3">
          {signals.map((signal, i) => {
            const colors = colorMap[signal.color] || colorMap.blue;
            return (
              <div key={i} className="flex items-center gap-3 group">
                <div className={`p-2 rounded-lg ${colors.bg} ${colors.text} group-hover:scale-105 transition-transform`}>
                  <signal.icon className="h-4 w-4" />
                </div>
                <span className="text-sm text-gray-700">{signal.text}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatDateRange(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const startMonth = startDate.toLocaleDateString('en-US', { month: 'short' });
  const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' });
  
  if (startMonth === endMonth) {
    return `${startMonth} ${startDate.getDate()} - ${endDate.getDate()}`;
  }
  return `${startMonth} ${startDate.getDate()} - ${endMonth} ${endDate.getDate()}`;
}

function getTravelerCount(travelers: any): number {
  if (typeof travelers === 'number') return travelers;
  if (travelers.total) return travelers.total;
  return (travelers.adults || 0) + (travelers.children || 0) + (travelers.infants || 0);
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
    india: '🇮🇳', maldives: '🏝️', bali: '🌺', thailand: '🏯', singapore: '🦁',
    dubai: '🏙️', paris: '🗼', london: '🎡', japan: '🗾', switzerland: '🏔️',
  };

  for (const [key, emoji] of Object.entries(emojiMap)) {
    if (lower.includes(key)) return emoji;
  }
  return '🌍';
}
