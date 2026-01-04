'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
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
  Bell,
  Edit,
  FileText,
  MessageCircle,
  ChevronDown,
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
  | 'request_sent'      // Request submitted, waiting for travel advisors
  | 'agents_responding' // Travel advisors are viewing/responding
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
// TIME HELPERS
// ============================================================================

function getTimeAgo(dateString: string): string {
  const now = new Date();
  const then = new Date(dateString);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Redirect to login if no user session after loading completes
  useEffect(() => {
    if (!userLoading && !user && !userError) {
      router.replace('/login');
    }
  }, [userLoading, user, userError, router]);

  const loadData = useCallback(async () => {
    if (!user?.userId) return;
    
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
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setDataError(error instanceof Error ? error.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [user?.userId]);

  useEffect(() => {
    if (!userLoading && !user?.userId) {
      setLoading(false);
      return;
    }
    if (!user?.userId) return;

    loadData();
  }, [user?.userId, userLoading, loadData]);

  const journeyStage = determineJourneyStage(requests, bookings, stats);
  
  // Get the most relevant active request
  const activeRequest = requests.find((r: TravelRequest) => 
    !['BOOKED', 'COMPLETED', 'CANCELLED', 'EXPIRED'].includes(r.state)
  );
  
  // Get upcoming booking
  const upcomingBooking = bookings.find((b: Booking) => 
    b.state === 'CONFIRMED' && new Date(b.travelStartDate) > new Date()
  );

  if (userLoading || loading) {
    return (
      <div className="max-w-5xl mx-auto py-6 px-4 sm:px-0">
        {/* Skeleton loading state */}
        <div className="space-y-8 animate-pulse">
          {/* Welcome header skeleton */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="h-8 bg-gradient-to-r from-gray-200 to-gray-100 rounded-xl w-64 mb-2" />
              <div className="h-4 bg-gray-100 rounded-lg w-48" />
            </div>
          </div>
          
          {/* Timeline skeleton */}
          <div className="bg-white rounded-3xl border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-gray-200 to-gray-100" />
              <div>
                <div className="h-5 bg-gray-200 rounded-lg w-32 mb-1" />
                <div className="h-3 bg-gray-100 rounded-lg w-48" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-2xl bg-gray-100" />
                  <div className="h-3 bg-gray-100 rounded w-12 mt-3" />
                </div>
              ))}
            </div>
          </div>
          
          {/* Action panel skeleton */}
          <div className="bg-white rounded-3xl border border-gray-100 p-10">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-12 w-12 rounded-full bg-gray-100" />
                  <div className="h-8 bg-gradient-to-r from-gray-200 to-gray-100 rounded-xl w-64" />
                </div>
                <div className="h-5 bg-gray-100 rounded-lg w-full max-w-xl" />
                <div className="h-5 bg-gray-50 rounded-lg w-3/4 max-w-md mt-2" />
              </div>
              <div className="h-14 w-48 bg-gradient-to-r from-gray-200 to-gray-100 rounded-2xl" />
            </div>
          </div>
          
          {/* Content grid skeleton */}
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white rounded-2xl border border-gray-100 p-6 h-32" />
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-5 h-48" />
          </div>
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
    <div className="max-w-5xl mx-auto space-y-8 py-6 px-4 sm:px-0 pb-24 md:pb-6">
      {/* ================================================================== */}
      {/* WELCOME HEADER - Personalized greeting */}
      {/* ================================================================== */}
      <WelcomeHeader 
        userName={user?.firstName || 'there'} 
        stage={journeyStage} 
        stats={stats} 
        activeRequest={activeRequest}
      />

      {/* ================================================================== */}
      {/* TRIP TIMELINE - Primary Visual Anchor (Always Visible) */}
      {/* ================================================================== */}
      <TripTimeline stage={journeyStage} activeRequest={activeRequest} />

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
            <ActiveTripCard 
              request={activeRequest} 
              stage={journeyStage} 
              lastUpdated={lastUpdated}
              onRefresh={loadData}
            />
          )}
          
          {/* Show upcoming booking if exists */}
          {upcomingBooking && (
            <UpcomingTripCard booking={upcomingBooking} />
          )}

          {/* Messaging Preview (if there are messages) */}
          {(stats?.unreadMessages || 0) > 0 && (
            <MessagingPreview unreadCount={stats?.unreadMessages || 0} />
          )}

          {/* Contextual actions based on journey stage */}
          {journeyStage === 'idea' ? (
            <QuickActionsGrid />
          ) : activeRequest && (
            <ContextualActionsGrid stage={journeyStage} requestId={activeRequest.id} />
          )}
        </div>

        {/* Right Rail - Signals (Not Tips) */}
        <div className="space-y-4">
          <SignalsPanel stage={journeyStage} stats={stats} activeRequest={activeRequest} />
          
          {/* Stats card for returning users */}
          {(stats?.completedTrips || 0) > 0 && (
            <StatsCard stats={stats} />
          )}
        </div>
      </div>

      {/* ================================================================== */}
      {/* STICKY MOBILE CTA - Always accessible on mobile */}
      {/* ================================================================== */}
      <div className="fixed bottom-0 left-0 right-0 p-3 bg-white/95 backdrop-blur-xl border-t border-gray-200 shadow-2xl z-40 md:hidden">
        {journeyStage === 'idea' ? (
          <Link href="/requests/new" className="block">
            <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg font-bold py-5 text-base">
              <Plus className="h-5 w-5 mr-2" />
              Create Trip Request
            </Button>
          </Link>
        ) : journeyStage === 'compare' ? (
          <Link href="/dashboard/requests" className="block">
            <Button className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg font-bold py-5 text-base">
              <Target className="h-5 w-5 mr-2" />
              Compare {stats?.awaitingSelection || ''} Proposals
            </Button>
          </Link>
        ) : activeRequest ? (
          <Link href={`/dashboard/requests/${activeRequest.id}`} className="block">
            <Button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg font-bold py-5 text-base">
              <Eye className="h-5 w-5 mr-2" />
              View Trip Status
            </Button>
          </Link>
        ) : upcomingBooking ? (
          <Link href={`/dashboard/bookings/${upcomingBooking.id}`} className="block">
            <Button className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg font-bold py-5 text-base">
              <Plane className="h-5 w-5 mr-2" />
              View Itinerary
            </Button>
          </Link>
        ) : (
          <Link href="/requests/new" className="block">
            <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg font-bold py-5 text-base">
              <Plus className="h-5 w-5 mr-2" />
              Plan New Trip
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// WELCOME HEADER
// ============================================================================

function WelcomeHeader({ 
  userName, 
  stage, 
  stats,
  activeRequest 
}: { 
  userName: string; 
  stage: JourneyStage; 
  stats: DashboardStats | null;
  activeRequest?: TravelRequest;
}) {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const destination = activeRequest?.destination?.label || activeRequest?.destination?.city || 'your trip';

  // State-aware subtitle
  const getSubtitle = () => {
    switch (stage) {
      case 'idea':
        return "Ready to plan your next adventure?";
      case 'request_sent':
        return `Your ${destination} request has been sent to travel advisors`;
      case 'agents_responding':
        return `Travel advisors are working on your ${destination} trip`;
      case 'compare':
        return `You have ${stats?.awaitingSelection || 'new'} proposals waiting for review!`;
      case 'booked':
        return "Your trip is confirmed. Here's what's happening.";
      case 'traveling':
        return "Enjoy your trip! Your travel advisor is on standby.";
      default:
        return "Here's what's happening with your trips.";
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
          {getGreeting()}, <span className="bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 text-transparent bg-clip-text">{userName}</span>! 👋
        </h1>
        <p className="text-gray-500 mt-1.5 text-base">
          {getSubtitle()}
        </p>
      </div>
      
      <div className="flex items-center gap-2">
        {/* Show active trip indicator when there's an active request */}
        {activeRequest && stage !== 'idea' && (
          <Link href={`/dashboard/requests/${activeRequest.id}`}>
            <div className="flex items-center gap-2.5 px-4 py-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100/50 shadow-sm hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group">
              <div className="relative">
                <div className="h-2.5 w-2.5 bg-blue-500 rounded-full" />
                <div className="absolute inset-0 h-2.5 w-2.5 bg-blue-500 rounded-full animate-ping" />
              </div>
              <span className="text-sm font-semibold text-blue-700 group-hover:text-blue-800">
                {activeRequest.destination?.city || 'Active'} trip
              </span>
              <ChevronRight className="h-4 w-4 text-blue-400 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>
        )}
        
        {/* De-emphasized New Trip button when trip exists */}
        {activeRequest ? (
          <div className="relative group">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-gray-500 hover:text-gray-700 hidden sm:flex items-center gap-1"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden md:inline">New Trip</span>
              <ChevronDown className="h-3 w-3" />
            </Button>
            <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-gray-100 py-2 px-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 min-w-[160px]">
              <Link href="/requests/new" className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg">
                Create new request
              </Link>
            </div>
          </div>
        ) : (
          <Link href="/requests/new" className="hidden sm:block">
            <Button size="sm" className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg hover:shadow-xl">
              <Plus className="h-4 w-4 mr-1" />
              New Trip
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// TRIP TIMELINE - The Backbone with timing and interactivity
// ============================================================================

function TripTimeline({ stage, activeRequest }: { stage: JourneyStage; activeRequest?: TravelRequest }) {
  const stages = [
    { 
      key: 'idea', 
      label: 'Start', 
      icon: Sparkles, 
      description: 'Plan your trip',
      timing: null,
      href: '/requests/new',
    },
    { 
      key: 'request_sent', 
      label: 'Request', 
      icon: Send, 
      description: 'Sent to advisors',
      timing: null,
      href: activeRequest ? `/dashboard/requests/${activeRequest.id}` : '/dashboard/requests',
    },
    { 
      key: 'agents_responding', 
      label: 'Matching', 
      icon: Users, 
      description: 'Advisors reviewing',
      timing: 'Usually ~4h',
      currentCopy: 'Travel advisors are crafting proposals',
      href: activeRequest ? `/dashboard/requests/${activeRequest.id}` : '/dashboard/requests',
    },
    { 
      key: 'compare', 
      label: 'Compare', 
      icon: Target, 
      description: 'Choose best',
      timing: null,
      currentCopy: 'Pick your favorite proposal',
      href: '/dashboard/requests',
    },
    { 
      key: 'booked', 
      label: 'Booked', 
      icon: CheckCircle, 
      description: 'All set!',
      timing: null,
      href: '/dashboard/bookings',
    },
  ];

  const currentIndex = stages.findIndex(s => s.key === stage || 
    (stage === 'traveling' && s.key === 'booked'));

  const currentStage = stages[currentIndex];

  return (
    <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm hover:shadow-lg transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-blue-500/25">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-lg">Your Journey</h3>
            <p className="text-sm text-gray-500">Track your trip planning progress</p>
          </div>
        </div>
        
        {/* Current stage indicator with micro-copy */}
        {currentStage && stage !== 'idea' && (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-xl border border-blue-100">
            <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse" />
            <span className="text-xs font-medium text-blue-700">
              {currentStage.currentCopy || currentStage.description}
            </span>
          </div>
        )}
      </div>

      {/* Desktop: Horizontal stepper */}
      <div className="hidden md:flex items-center justify-between relative px-2">
        {/* Background line */}
        <div className="absolute top-5 left-8 right-8 h-1 bg-gray-100 rounded-full -z-10" />
        <div 
          className="absolute top-5 left-8 h-1 bg-gradient-to-r from-green-400 via-emerald-500 to-blue-500 rounded-full transition-all duration-700 ease-out -z-10"
          style={{ width: `calc(${Math.max(0, currentIndex) * 25}% - 1rem)` }}
        />

        {stages.map((s, i) => {
          const isComplete = i < currentIndex;
          const isCurrent = i === currentIndex;
          const isFuture = i > currentIndex;
          const StepIcon = s.icon;
          const isClickable = isComplete || isCurrent;
          
          const stepContent = (
            <div className={`flex flex-col items-center relative z-10 group ${isClickable ? 'cursor-pointer' : ''}`}>
              {/* Step Circle */}
              <div 
                className={`
                  w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-500
                  ${isComplete ? 'bg-gradient-to-br from-green-400 to-emerald-500 text-white shadow-lg shadow-green-500/40 group-hover:scale-110' : ''}
                  ${isCurrent ? 'bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 text-white ring-4 ring-blue-100 scale-110 shadow-xl shadow-blue-500/40' : ''}
                  ${isFuture ? 'bg-gray-50 text-gray-400 border-2 border-gray-200 group-hover:border-gray-300 group-hover:bg-gray-100' : ''}
                `}
              >
                {isComplete ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <StepIcon className={`h-5 w-5 ${isCurrent ? 'animate-pulse' : ''}`} />
                )}
              </div>
              
              {/* Labels */}
              <div className="mt-3 text-center">
                <span className={`
                  text-xs font-bold block tracking-wide
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
                {/* Timing estimate for current step */}
                {isCurrent && s.timing && (
                  <span className="text-[10px] mt-1 block text-amber-600 font-medium">
                    {s.timing}
                  </span>
                )}
              </div>
            </div>
          );
          
          return isClickable ? (
            <Link key={s.key} href={s.href}>
              {stepContent}
            </Link>
          ) : (
            <div key={s.key}>
              {stepContent}
            </div>
          );
        })}
      </div>

      {/* Mobile: Horizontal scrollable stepper */}
      <div className="md:hidden overflow-x-auto pb-2 -mx-2 px-2">
        <div className="flex items-center gap-3 min-w-max">
          {stages.map((s, i) => {
            const isComplete = i < currentIndex;
            const isCurrent = i === currentIndex;
            const isFuture = i > currentIndex;
            const StepIcon = s.icon;
            
            return (
              <div key={s.key} className="flex items-center">
                <Link 
                  href={s.href}
                  className={`
                    flex items-center gap-2 px-3 py-2 rounded-xl transition-all
                    ${isCurrent ? 'bg-blue-50 border border-blue-200' : ''}
                    ${isComplete ? 'bg-green-50 border border-green-200' : ''}
                    ${isFuture ? 'bg-gray-50 border border-gray-100' : ''}
                  `}
                >
                  <div className={`
                    w-7 h-7 rounded-lg flex items-center justify-center
                    ${isComplete ? 'bg-green-500 text-white' : ''}
                    ${isCurrent ? 'bg-blue-500 text-white' : ''}
                    ${isFuture ? 'bg-gray-200 text-gray-400' : ''}
                  `}>
                    {isComplete ? <CheckCircle className="h-4 w-4" /> : <StepIcon className="h-4 w-4" />}
                  </div>
                  <div>
                    <span className={`text-xs font-semibold block ${isCurrent ? 'text-blue-700' : isComplete ? 'text-green-700' : 'text-gray-400'}`}>
                      {s.label}
                    </span>
                    {isCurrent && s.timing && (
                      <span className="text-[10px] text-amber-600">{s.timing}</span>
                    )}
                  </div>
                </Link>
                {i < stages.length - 1 && (
                  <ChevronRight className={`h-4 w-4 mx-1 ${i < currentIndex ? 'text-green-400' : 'text-gray-200'}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// CENTRAL ACTION PANEL - Always answers "What should I do right now?"
// Promotes current trip to hero role
// ============================================================================

interface ActionPanelProps {
  stage: JourneyStage;
  activeRequest?: TravelRequest;
  upcomingBooking?: Booking;
  stats: DashboardStats | null;
  userName: string;
}

function ActionPanel({ stage, activeRequest, upcomingBooking, stats, userName }: ActionPanelProps) {
  const destination = activeRequest?.destination?.label || activeRequest?.destination?.city || 'your trip';
  
  const configs: Record<JourneyStage, {
    title: string;
    subtitle: string;
    cta: { label: string; href: string; variant?: 'default' | 'outline' };
    secondaryCta?: { label: string; href: string };
    gradient: string;
    bgPattern: string;
    emoji: string;
  }> = {
    idea: {
      title: 'Start your dream trip',
      subtitle: 'Tell us where you want to go. Expert travel advisors compete to plan your perfect adventure — free, no commitment.',
      cta: { label: 'Create Trip Request', href: '/requests/new' },
      gradient: 'from-blue-500 via-indigo-500 to-purple-600',
      bgPattern: 'radial-gradient(circle at 20% 50%, rgba(99, 102, 241, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(168, 85, 247, 0.1) 0%, transparent 50%)',
      emoji: '✨',
    },
    request_sent: {
      title: `Your ${destination} request is live!`,
      subtitle: 'Travel advisors are being notified. Most respond within 4 hours with personalized proposals.',
      cta: { label: 'View Request Details', href: activeRequest ? `/dashboard/requests/${activeRequest.id}` : '/dashboard/requests' },
      secondaryCta: { label: 'Edit Preferences', href: activeRequest ? `/requests/edit/${activeRequest.id}` : '/dashboard/requests' },
      gradient: 'from-amber-500 to-orange-500',
      bgPattern: 'radial-gradient(circle at 30% 50%, rgba(251, 191, 36, 0.1) 0%, transparent 50%)',
      emoji: '📤',
    },
    agents_responding: {
      title: `Travel advisors are working on your ${destination} trip`,
      subtitle: `${activeRequest?.agentsResponded ? `${activeRequest.agentsResponded} agent${activeRequest.agentsResponded > 1 ? 's have' : ' has'} already viewed your request.` : 'Expert agents are designing personalized itineraries.'} Most respond within ~4 hours.`,
      cta: { label: 'View Request Details', href: activeRequest ? `/dashboard/requests/${activeRequest.id}` : '/dashboard/requests' },
      secondaryCta: { label: 'Edit Preferences', href: activeRequest ? `/requests/edit/${activeRequest.id}` : '/dashboard/requests' },
      gradient: 'from-cyan-500 to-blue-600',
      bgPattern: 'radial-gradient(circle at 70% 30%, rgba(34, 211, 238, 0.1) 0%, transparent 50%)',
      emoji: '⚡',
    },
    compare: {
      title: `${stats?.awaitingSelection || 'New'} proposals for your ${destination} trip!`,
      subtitle: 'Travel advisors have sent you personalized itineraries. Compare prices, experiences, and reviews to find your perfect match.',
      cta: { label: 'Compare Proposals', href: '/dashboard/requests' },
      secondaryCta: { label: 'Message Advisors', href: '/dashboard/messages' },
      gradient: 'from-emerald-500 to-teal-600',
      bgPattern: 'radial-gradient(circle at 20% 80%, rgba(16, 185, 129, 0.15) 0%, transparent 50%)',
      emoji: '🎯',
    },
    booked: {
      title: upcomingBooking ? 'Your trip is confirmed!' : `Welcome back, ${userName}!`,
      subtitle: upcomingBooking 
        ? 'Everything is set. Your travel advisor is available if you need anything before departure.'
        : 'Ready for your next adventure?',
      cta: upcomingBooking 
        ? { label: 'View Itinerary', href: '/dashboard/bookings' }
        : { label: 'Plan New Trip', href: '/requests/new' },
      secondaryCta: upcomingBooking ? { label: 'Message Agent', href: '/dashboard/messages' } : undefined,
      gradient: 'from-green-500 to-emerald-600',
      bgPattern: 'radial-gradient(circle at 80% 20%, rgba(34, 197, 94, 0.1) 0%, transparent 50%)',
      emoji: upcomingBooking ? '🎉' : '🌎',
    },
    traveling: {
      title: 'Enjoy your trip!',
      subtitle: 'Your agent is on standby if you need any assistance during your journey.',
      cta: { label: 'View Itinerary', href: '/dashboard/bookings' },
      secondaryCta: { label: 'Contact Agent', href: '/dashboard/messages' },
      gradient: 'from-pink-500 to-rose-600',
      bgPattern: 'radial-gradient(circle at 50% 50%, rgba(244, 114, 182, 0.1) 0%, transparent 50%)',
      emoji: '🏖️',
    },
  };

  const config = configs[stage];

  return (
    <Card className="border-0 shadow-2xl shadow-gray-200/50 overflow-hidden relative group rounded-3xl animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
      {/* Animated gradient background */}
      <div 
        className="absolute inset-0 opacity-100 transition-opacity duration-500"
        style={{ background: config.bgPattern }}
      />
      <div className={`absolute inset-0 bg-gradient-to-br ${config.gradient} opacity-[0.02] group-hover:opacity-[0.04] transition-opacity duration-500`} />
      
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-white/40 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      
      <CardContent className="p-8 md:p-10 relative">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-4">
              <span className="text-4xl md:text-5xl drop-shadow-sm">{config.emoji}</span>
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 tracking-tight">
                {config.title}
              </h1>
            </div>
            <p className="text-gray-600 text-lg md:text-xl max-w-xl leading-relaxed">
              {config.subtitle}
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <Link href={config.cta.href}>
              <Button 
                size="lg" 
                variant={config.cta.variant || 'default'}
                className={`
                  w-full sm:w-auto shadow-lg font-bold h-14 px-8 rounded-2xl transition-all duration-300 text-base
                  ${!config.cta.variant ? `bg-gradient-to-r ${config.gradient} hover:shadow-2xl hover:scale-[1.02] hover:-translate-y-0.5 text-white border-0` : 'hover:scale-[1.02] border-2'}
                `}
              >
                {config.cta.label}
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </Link>
            {config.secondaryCta && (
              <Link href={config.secondaryCta.href}>
                <Button size="lg" variant="ghost" className="w-full sm:w-auto h-14 rounded-2xl hover:bg-gray-100/80 font-semibold text-base">
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
// QUICK ACTIONS GRID - For new users (no active trip)
// ============================================================================

function QuickActionsGrid() {
  const actions = [
    { 
      href: '/explore', 
      icon: Globe, 
      label: 'Explore Destinations', 
      description: 'Get inspired',
      color: 'from-blue-500 to-cyan-500',
      shadowColor: 'shadow-blue-500/25',
    },
    { 
      href: '/how-it-works', 
      icon: Heart, 
      label: 'How It Works', 
      description: 'Learn more',
      color: 'from-pink-500 to-rose-500',
      shadowColor: 'shadow-pink-500/25',
    },
    { 
      href: '/travel-advisors', 
      icon: Award, 
      label: 'Meet Our Advisors', 
      description: 'Expert planners',
      color: 'from-amber-500 to-orange-500',
      shadowColor: 'shadow-amber-500/25',
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {actions.map((action, i) => (
        <Link key={action.href} href={action.href}>
          <Card className={`border border-gray-100 hover:border-gray-200 hover:shadow-xl transition-all duration-300 cursor-pointer group h-full rounded-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500`} style={{ animationDelay: `${300 + i * 100}ms` }}>
            <CardContent className="p-5 flex flex-col items-center text-center">
              <div className={`p-4 rounded-2xl bg-gradient-to-br ${action.color} text-white mb-4 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg ${action.shadowColor}`}>
                <action.icon className="h-6 w-6" />
              </div>
              <h4 className="font-bold text-gray-900 text-sm group-hover:text-gray-700">{action.label}</h4>
              <p className="text-xs text-gray-500 mt-1">{action.description}</p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

// ============================================================================
// CONTEXTUAL ACTIONS GRID - For users with active trips (replaces generic cards)
// ============================================================================

function ContextualActionsGrid({ stage, requestId }: { stage: JourneyStage; requestId: string }) {
  // Different actions based on journey stage
  const getActions = () => {
    switch (stage) {
      case 'agents_responding':
      case 'request_sent':
        return [
          { 
            href: `/dashboard/requests/${requestId}`, 
            icon: Eye, 
            label: 'Track Progress', 
            description: 'See advisor activity',
            color: 'from-blue-500 to-indigo-500',
            shadowColor: 'shadow-blue-500/25',
          },
          { 
            href: `/requests/edit/${requestId}`, 
            icon: Edit, 
            label: 'Edit Preferences', 
            description: 'Update your trip',
            color: 'from-amber-500 to-orange-500',
            shadowColor: 'shadow-amber-500/25',
          },
          { 
            href: '/help', 
            icon: MessageCircle, 
            label: 'Get Help', 
            description: 'Questions?',
            color: 'from-purple-500 to-pink-500',
            shadowColor: 'shadow-purple-500/25',
          },
        ];
      case 'compare':
        return [
          { 
            href: '/dashboard/requests', 
            icon: Target, 
            label: 'View Proposals', 
            description: 'Compare options',
            color: 'from-emerald-500 to-teal-500',
            shadowColor: 'shadow-emerald-500/25',
          },
          { 
            href: '/dashboard/messages', 
            icon: MessageCircle, 
            label: 'Ask Advisors', 
            description: 'Get answers',
            color: 'from-blue-500 to-indigo-500',
            shadowColor: 'shadow-blue-500/25',
          },
          { 
            href: `/dashboard/requests/${requestId}`, 
            icon: FileText, 
            label: 'Compare Details', 
            description: 'Side by side',
            color: 'from-purple-500 to-pink-500',
            shadowColor: 'shadow-purple-500/25',
          },
        ];
      case 'booked':
      case 'traveling':
        return [
          { 
            href: '/dashboard/bookings', 
            icon: FileText, 
            label: 'View Itinerary', 
            description: 'Trip details',
            color: 'from-green-500 to-emerald-500',
            shadowColor: 'shadow-green-500/25',
          },
          { 
            href: '/dashboard/messages', 
            icon: MessageCircle, 
            label: 'Contact Advisor', 
            description: 'Get support',
            color: 'from-blue-500 to-indigo-500',
            shadowColor: 'shadow-blue-500/25',
          },
          { 
            href: '/requests/new', 
            icon: Plus, 
            label: 'Plan Next Trip', 
            description: 'New adventure',
            color: 'from-purple-500 to-pink-500',
            shadowColor: 'shadow-purple-500/25',
          },
        ];
      default:
        return [];
    }
  };

  const actions = getActions();
  
  if (actions.length === 0) return null;

  return (
    <div className="grid grid-cols-3 gap-4">
      {actions.map((action, i) => (
        <Link key={action.href + i} href={action.href}>
          <Card className={`border border-gray-100 hover:border-gray-200 hover:shadow-xl transition-all duration-300 cursor-pointer group h-full rounded-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500`} style={{ animationDelay: `${300 + i * 100}ms` }}>
            <CardContent className="p-5 flex flex-col items-center text-center">
              <div className={`p-4 rounded-2xl bg-gradient-to-br ${action.color} text-white mb-4 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg ${action.shadowColor}`}>
                <action.icon className="h-6 w-6" />
              </div>
              <h4 className="font-bold text-gray-900 text-sm group-hover:text-gray-700">{action.label}</h4>
              <p className="text-xs text-gray-500 mt-1">{action.description}</p>
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
    <Card className="border border-gray-100 bg-gradient-to-br from-gray-50 via-white to-gray-50 rounded-2xl overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="p-2 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/25">
            <Award className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-bold text-gray-800">Your Stats</span>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between group">
            <span className="text-sm text-gray-600 group-hover:text-gray-800 transition-colors">Trips completed</span>
            <span className="text-lg font-bold text-gray-900 tabular-nums">{stats?.completedTrips || 0}</span>
          </div>
          <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
          <div className="flex items-center justify-between group">
            <span className="text-sm text-gray-600 group-hover:text-gray-800 transition-colors">Active requests</span>
            <span className="text-lg font-bold text-blue-600 tabular-nums">{stats?.activeRequests || 0}</span>
          </div>
          <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
          <div className="flex items-center justify-between group">
            <span className="text-sm text-gray-600 group-hover:text-gray-800 transition-colors">Upcoming trips</span>
            <span className="text-lg font-bold text-green-600 tabular-nums">{stats?.confirmedBookings || 0}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// ACTIVE TRIP CARD - Command center with inline actions
// ============================================================================

function ActiveTripCard({ 
  request, 
  stage,
  lastUpdated,
  onRefresh 
}: { 
  request: TravelRequest; 
  stage: JourneyStage;
  lastUpdated: Date | null;
  onRefresh: () => void;
}) {
  const destination = request.destination?.label || request.destination?.city || request.title || 'Your Trip';
  const hasAgentViews = (request.agentsResponded || 0) > 0;
  
  return (
    <Card className="border border-gray-200 hover:border-blue-300 hover:shadow-xl transition-all duration-300 overflow-hidden rounded-2xl group">
      <CardContent className="p-0">
        {/* Gradient accent bar */}
        <div className="h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
        
        <div className="p-6">
          {/* Header with destination and status */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-5">
              <div className="text-5xl transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 drop-shadow-sm">
                {getDestinationEmoji(request.destination?.country || request.destination?.city)}
              </div>
              <div>
                <h3 className="font-bold text-xl text-gray-900 group-hover:text-blue-600 transition-colors">
                  {destination}
                </h3>
                <div className="flex items-center gap-4 text-sm text-gray-500 mt-2">
                  <span className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1 rounded-lg">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    {formatDateRange(request.departureDate, request.returnDate)}
                  </span>
                  {request.travelers && (
                    <span className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1 rounded-lg">
                      <Users className="h-4 w-4 text-gray-400" />
                      {getTravelerCount(request.travelers)} travelers
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <StatusBadge stage={stage} agentsResponded={request.agentsResponded} />
          </div>

          {/* Activity indicator */}
          {hasAgentViews && stage === 'agents_responding' && (
            <div className="flex items-center gap-2 mb-4 p-3 bg-blue-50 rounded-xl border border-blue-100">
              <div className="flex -space-x-2">
                {[...Array(Math.min(request.agentsResponded || 0, 3))].map((_, i) => (
                  <div key={i} className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 border-2 border-white flex items-center justify-center">
                    <Users className="h-3 w-3 text-white" />
                  </div>
                ))}
              </div>
              <span className="text-sm text-blue-700 font-medium">
                {request.agentsResponded} travel advisor{(request.agentsResponded || 0) > 1 ? 's have' : ' has'} viewed your trip
              </span>
            </div>
          )}

          {/* Inline action buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
            <Link href={`/dashboard/requests/${request.id}`}>
              <Button size="sm" className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-lg">
                <Eye className="h-4 w-4 mr-1.5" />
                View Details
              </Button>
            </Link>
            
            <Link href={`/requests/edit/${request.id}`}>
              <Button size="sm" variant="outline" className="border-gray-200 hover:border-blue-200 hover:bg-blue-50">
                <Edit className="h-4 w-4 mr-1.5" />
                Edit
              </Button>
            </Link>

            {stage === 'compare' ? (
              <Link href="/dashboard/messages">
                <Button size="sm" variant="outline" className="border-gray-200 hover:border-purple-200 hover:bg-purple-50">
                  <MessageCircle className="h-4 w-4 mr-1.5" />
                  Message Advisors
                </Button>
              </Link>
            ) : (
              <Button 
                size="sm" 
                variant="ghost" 
                className="text-gray-400"
                disabled
                title="No advisors to message yet"
              >
                <MessageCircle className="h-4 w-4 mr-1.5" />
                Message
              </Button>
            )}

            {/* Last updated indicator */}
            {lastUpdated && (
              <div className="ml-auto flex items-center gap-2 text-xs text-gray-400">
                <span>Updated {getTimeAgo(lastUpdated.toISOString())}</span>
                <button 
                  onClick={(e) => { e.preventDefault(); onRefresh(); }}
                  className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                  title="Refresh"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ stage, agentsResponded }: { stage: JourneyStage; agentsResponded?: number }) {
  if (stage === 'compare') {
    return (
      <Badge className="bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 border border-amber-200 font-semibold px-3 py-1.5 rounded-xl">
        <Target className="h-3.5 w-3.5 mr-1.5" />
        Review proposals
      </Badge>
    );
  }
  
  if (stage === 'agents_responding' && agentsResponded && agentsResponded > 0) {
    return (
      <Badge className="bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border border-blue-200 font-semibold px-3 py-1.5 rounded-xl">
        <Users className="h-3.5 w-3.5 mr-1.5" />
        {agentsResponded} advisor{agentsResponded > 1 ? 's' : ''} responded
      </Badge>
    );
  }
  
  return (
    <Badge className="bg-gray-50 text-gray-600 border border-gray-200 font-semibold px-3 py-1.5 rounded-xl">
      <Clock className="h-3.5 w-3.5 mr-1.5" />
      Awaiting advisors
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
      <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50/50 to-emerald-50/30 hover:shadow-xl hover:border-green-300 transition-all duration-300 cursor-pointer group rounded-2xl overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div className="relative">
                <div className="text-5xl transform group-hover:scale-110 group-hover:-rotate-6 transition-all duration-300">
                  {getDestinationEmoji(booking.request?.destination?.country)}
                </div>
                <div className="absolute -bottom-1 -right-1 bg-gradient-to-br from-green-500 to-emerald-600 text-white text-xs font-bold px-2 py-1 rounded-xl shadow-lg shadow-green-500/30">
                  {daysUntil}d
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-green-100">
                    <Plane className="h-4 w-4 text-green-600" />
                  </div>
                  <h3 className="font-bold text-xl text-gray-900 group-hover:text-green-700 transition-colors">{destination}</h3>
                </div>
                <p className="text-sm text-gray-500 mt-1.5 ml-9">
                  {formatDateRange(booking.travelStartDate, booking.travelEndDate)}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {booking.agent && (
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold text-gray-700">{booking.agent.fullName}</p>
                  {booking.agent.rating && (
                    <div className="flex items-center gap-1.5 justify-end mt-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-medium text-gray-600">{booking.agent.rating.toFixed(1)}</span>
                    </div>
                  )}
                </div>
              )}
              <Badge className="bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border border-green-200 font-semibold px-3 py-1.5 rounded-xl">
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
      <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50/50 to-indigo-50/30 hover:shadow-xl hover:border-blue-300 transition-all duration-300 cursor-pointer group rounded-2xl">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl shadow-lg shadow-blue-500/25 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                <MessageSquare className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-lg">
                  {unreadCount} new message{unreadCount !== 1 ? 's' : ''}
                </p>
                <p className="text-sm text-gray-500">from your advisors</p>
              </div>
            </div>
            <div className="p-2 rounded-xl bg-blue-50 group-hover:bg-blue-100 transition-colors">
              <ChevronRight className="h-5 w-5 text-blue-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

// ============================================================================
// SIGNALS PANEL - Contextual guidance based on journey stage
// ============================================================================

function SignalsPanel({ 
  stage, 
  stats,
  activeRequest 
}: { 
  stage: JourneyStage; 
  stats: DashboardStats | null;
  activeRequest?: TravelRequest;
}) {
  const destination = activeRequest?.destination?.city || 'your destination';
  
  // Dynamic, contextual signals based on journey stage
  const getSignals = () => {
    switch (stage) {
      case 'idea':
        return [
          { icon: Zap, text: 'Most advisors respond in ~4 hours', color: 'blue', type: 'info' },
          { icon: Shield, text: "You're not obligated to book", color: 'green', type: 'reassurance' },
          { icon: Users, text: '127 travelers booked this week', color: 'purple', type: 'social' },
        ];
      case 'request_sent':
        return [
          { icon: Bell, text: "You'll be notified when proposals arrive", color: 'blue', type: 'info' },
          { icon: Clock, text: 'Travel advisors typically respond within 4 hours', color: 'amber', type: 'timing' },
          { icon: Edit, text: 'You can still edit your preferences', color: 'purple', type: 'action' },
        ];
      case 'agents_responding':
        return [
          { icon: Eye, text: activeRequest?.agentsResponded 
            ? `${activeRequest.agentsResponded} travel advisor${(activeRequest.agentsResponded || 0) > 1 ? 's' : ''} reviewing your request`
            : 'Travel advisors are viewing your request', color: 'blue', type: 'activity' },
          { icon: Bell, text: "We'll notify you when proposals arrive", color: 'amber', type: 'info' },
          { icon: Shield, text: 'No commitment until you choose', color: 'green', type: 'reassurance' },
        ];
      case 'compare':
        return [
          { icon: Target, text: 'Compare at least 2-3 proposals', color: 'blue', type: 'advice' },
          { icon: MessageSquare, text: 'Ask advisors any questions', color: 'purple', type: 'action' },
          { icon: Shield, text: 'Book only when ready', color: 'green', type: 'reassurance' },
        ];
      case 'booked':
        return [
          { icon: MessageSquare, text: 'Your travel advisor is available anytime', color: 'blue', type: 'info' },
          { icon: FileText, text: 'Download itinerary for offline access', color: 'purple', type: 'action' },
          { icon: Star, text: 'Leave a review after your trip', color: 'amber', type: 'action' },
        ];
      case 'traveling':
        return [
          { icon: MessageSquare, text: 'Travel advisor on standby for support', color: 'blue', type: 'info' },
          { icon: Shield, text: 'Emergency support available 24/7', color: 'green', type: 'reassurance' },
          { icon: Star, text: 'Share your experience when back', color: 'amber', type: 'action' },
        ];
      default:
        return [];
    }
  };

  const signals = getSignals();
  const colorMap: Record<string, { bg: string; text: string; iconBg: string }> = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', iconBg: 'from-blue-500 to-indigo-500' },
    green: { bg: 'bg-green-50', text: 'text-green-600', iconBg: 'from-green-500 to-emerald-500' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', iconBg: 'from-amber-500 to-orange-500' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', iconBg: 'from-purple-500 to-pink-500' },
  };
  const defaultColor = { bg: 'bg-blue-50', text: 'text-blue-600', iconBg: 'from-blue-500 to-indigo-500' };

  // Stage-specific header
  const getHeader = () => {
    switch (stage) {
      case 'idea': return 'Good to know';
      case 'request_sent': return 'What happens next';
      case 'agents_responding': return "While you wait";
      case 'compare': return 'Tips for choosing';
      case 'booked': return 'Before you go';
      case 'traveling': return 'During your trip';
      default: return 'Good to know';
    }
  };

  return (
    <Card className="border border-gray-100 rounded-2xl overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="p-2 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 shadow-lg shadow-green-500/25">
            <Shield className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-bold text-gray-800">{getHeader()}</span>
        </div>
        <div className="space-y-4">
          {signals.map((signal, i) => {
            const colors = colorMap[signal.color] ?? defaultColor;
            return (
              <div key={i} className="flex items-center gap-3.5 group">
                <div className={`p-2.5 rounded-xl bg-gradient-to-br ${colors.iconBg} text-white shadow-sm group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                  <signal.icon className="h-4 w-4" />
                </div>
                <span className="text-sm text-gray-700 font-medium group-hover:text-gray-900 transition-colors">{signal.text}</span>
              </div>
            );
          })}
        </div>
        
        {/* Contextual CTA at bottom */}
        {stage === 'agents_responding' && (
          <div className="mt-5 pt-4 border-t border-gray-100">
            <Link href="/help" className="flex items-center justify-between text-sm text-gray-500 hover:text-blue-600 transition-colors group">
              <span>Have questions?</span>
              <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        )}
        
        {stage === 'compare' && (
          <div className="mt-5 pt-4 border-t border-gray-100">
            <Link href="/dashboard/messages" className="flex items-center justify-between text-sm text-gray-500 hover:text-blue-600 transition-colors group">
              <span>Need clarification? Chat with advisors</span>
              <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        )}
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
