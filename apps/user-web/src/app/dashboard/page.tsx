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
  Zap,
  TrendingUp,
  Heart,
  Globe,
  Award,
  Bell,
  Edit,
  FileText,
  MessageCircle,
  Compass,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TripCountdown } from '@/components/trust/TripCountdown';
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
import {
  fetchDestinations,
  type Destination,
} from '@/lib/api/destinations';
import {
  destinationImageUrl,
  INDIA_DESTINATIONS,
  THEME_GRADIENTS,
  type IndiaDestination,
} from '@/lib/data/india-destinations';

// ============================================================================
// USER JOURNEY STATES
// ============================================================================

type JourneyStage = 
  | 'idea'
  | 'request_sent'
  | 'agents_responding'
  | 'compare'
  | 'booked'
  | 'traveling';

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

import { usePageTitle } from '@/hooks/use-page-title';

export default function DashboardPage() {
  usePageTitle('Dashboard');
  const router = useRouter();
  const { user, loading: userLoading, error: userError } = useUserSession();
  const [requests, setRequests] = useState<TravelRequest[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [_activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

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
  
  // ACTIVE REQUEST STATES - requests that are still in progress
  const ACTIVE_REQUEST_STATES = [
    'DRAFT',
    'SUBMITTED', 
    'AGENTS_MATCHED',
    'AGENT_CONFIRMED',
    'ITINERARIES_RECEIVED',
    'ITINERARY_SELECTED',
    'READY_FOR_PAYMENT',
    'PAYMENT_PENDING'
  ];
  
  // INACTIVE REQUEST STATES - requests that are done
  const INACTIVE_REQUEST_STATES = ['BOOKED', 'COMPLETED', 'CANCELLED', 'EXPIRED'];
  
  // Filter to get only ACTIVE requests (not in inactive states AND not past expiration date)
  const activeRequests = requests.filter((r: TravelRequest) => {
    // Check if request is in an inactive state
    if (INACTIVE_REQUEST_STATES.includes(r.state)) {
      return false;
    }
    // Check if request has expired by date (even if state wasn't updated)
    if (r.expiresAt && new Date(r.expiresAt) < new Date()) {
      return false;
    }
    return true;
  });
  
  // Get the primary active request for the hero section
  const activeRequest = activeRequests[0];
  
  // ACTIVE BOOKING STATES - bookings that are in progress or upcoming
  const ACTIVE_BOOKING_STATES = [
    'PENDING_PAYMENT',
    'PAYMENT_AUTHORIZED', 
    'CONFIRMED',
    'IN_PROGRESS'
  ];
  
  // Filter to get only ACTIVE bookings (upcoming and in progress)
  const upcomingBookings = bookings.filter((b: Booking) => {
    const isActiveState = ACTIVE_BOOKING_STATES.includes(b.state);
    const isFutureOrCurrent = new Date(b.travelEndDate || b.travelStartDate) >= new Date();
    return isActiveState && isFutureOrCurrent;
  });
  
  // Get the primary upcoming booking
  const upcomingBooking = upcomingBookings[0];

  if (userLoading || loading) {
    return <LoadingSkeleton />;
  }

  if (userError || dataError || !user) {
    if (!user && !userError && !dataError) {
      return (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-green-600 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Redirecting to login...</p>
          </div>
        </div>
      );
    }
    return <ErrorState error={userError || dataError || 'Session expired. Please sign in again.'} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-br from-green-100/40 via-emerald-50/30 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-blue-100/30 via-indigo-50/20 to-transparent rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" />
      </div>
      
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-28 md:pb-8">
        <HeroSection 
          userName={user?.firstName || 'there'} 
          stage={journeyStage} 
          stats={stats} 
          activeRequest={activeRequest}
          upcomingBooking={upcomingBooking}
        />

        {journeyStage !== 'idea' && (
          <JourneyProgress stage={journeyStage} />
        )}

        <div className="grid lg:grid-cols-12 gap-6 mt-8">
          <div className="lg:col-span-8 space-y-6">
            <PrimaryActionCard 
              stage={journeyStage}
              activeRequest={activeRequest}
              upcomingBooking={upcomingBooking}
              stats={stats}
            />

            {/* Show ALL active requests */}
            {activeRequests.length > 0 && (
              <div className="space-y-4">
                {activeRequests.length > 1 && (
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                      <Send className="h-5 w-5 text-blue-500" />
                      Active Requests ({activeRequests.length})
                    </h2>
                  </div>
                )}
                {activeRequests.map((request) => (
                  <ActiveTripCard 
                    key={request.id}
                    request={request} 
                    stage={journeyStage} 
                    lastUpdated={lastUpdated}
                    onRefresh={loadData}
                  />
                ))}
              </div>
            )}

            {/* Show ALL upcoming bookings */}
            {upcomingBookings.length > 0 && (
              <div className="space-y-4">
                {upcomingBookings.length > 1 && (
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                      <Plane className="h-5 w-5 text-green-500" />
                      Upcoming Trips ({upcomingBookings.length})
                    </h2>
                  </div>
                )}
                {upcomingBookings.map((booking) => (
                  <UpcomingTripCard key={booking.id} booking={booking} />
                ))}
              </div>
            )}

            {/* ALWAYS show Explore Destinations - highlighted prominently */}
            <DestinationInspirationGrid />

            {(stats?.unreadMessages || 0) > 0 && (
              <MessagingPreview unreadCount={stats?.unreadMessages || 0} />
            )}
          </div>

          <div className="lg:col-span-4 space-y-6">
            <StatsOverview stats={stats} />
            <SignalsCard stage={journeyStage} />
            <QuickLinksCard stage={journeyStage} />
          </div>
        </div>
      </div>

      <MobileBottomCTA 
        stage={journeyStage} 
        stats={stats} 
        activeRequest={activeRequest}
        upcomingBooking={upcomingBooking}
      />
    </div>
  );
}

// ============================================================================
// LOADING SKELETON
// ============================================================================

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-8">
          <div className="bg-white rounded-3xl p-8 border border-slate-100">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="space-y-4 flex-1">
                <div className="h-4 w-24 bg-slate-200 rounded-full" />
                <div className="h-10 w-80 bg-gradient-to-r from-slate-200 to-slate-100 rounded-xl" />
                <div className="h-6 w-full max-w-md bg-slate-100 rounded-lg" />
              </div>
              <div className="h-14 w-48 bg-gradient-to-r from-green-200 to-emerald-100 rounded-2xl" />
            </div>
          </div>

          <div className="grid lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 space-y-6">
              <div className="h-48 bg-white rounded-2xl border border-slate-100" />
              <div className="h-64 bg-white rounded-2xl border border-slate-100" />
            </div>
            <div className="lg:col-span-4 space-y-6">
              <div className="h-48 bg-white rounded-2xl border border-slate-100" />
              <div className="h-56 bg-white rounded-2xl border border-slate-100" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ERROR STATE
// ============================================================================

function ErrorState({ error }: { error: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="bg-white rounded-3xl shadow-xl shadow-red-100/50 border border-red-100 p-10 max-w-md">
        <div className="w-16 h-16 bg-gradient-to-br from-red-100 to-rose-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <RefreshCw className="h-8 w-8 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-3">Unable to Load Dashboard</h2>
        <p className="text-slate-500 mb-8">{error}</p>
        <div className="flex flex-col gap-3">
          <Button 
            onClick={() => window.location.reload()} 
            className="bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Page
          </Button>
          <Link href="/login">
            <Button variant="outline" className="w-full">Sign In</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// HERO SECTION
// ============================================================================

function HeroSection({ 
  userName, 
  stage, 
  stats,
  activeRequest,
  upcomingBooking
}: { 
  userName: string; 
  stage: JourneyStage; 
  stats: DashboardStats | null;
  activeRequest?: TravelRequest;
  upcomingBooking?: Booking;
}) {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getContextualMessage = () => {
    if (upcomingBooking) {
      const daysUntil = Math.ceil((new Date(upcomingBooking.travelStartDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      const destination = upcomingBooking.request?.destination?.city || 'your trip';
      return `${daysUntil} days until ${destination}! 🎉`;
    }
    
    switch (stage) {
      case 'compare':
        return `${stats?.awaitingSelection || 'New'} proposals waiting for you! 🎯`;
      case 'agents_responding':
        return 'Travel experts are crafting your perfect trip ✨';
      case 'request_sent':
        return 'Your request is live! Advisors are reviewing 📤';
      case 'booked':
        return 'Ready for your next adventure? 🌟';
      default:
        return 'Where will your next adventure take you? 🌍';
    }
  };

  return (
    <div className="relative overflow-hidden bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-100/50">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-green-50 via-emerald-50/50 to-transparent rounded-full blur-2xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-blue-50 via-indigo-50/50 to-transparent rounded-full blur-2xl translate-y-1/2 -translate-x-1/3" />
      </div>

      <div className="relative px-8 py-10 md:px-12 md:py-12">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
          <div className="flex-1 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-green-50 to-emerald-50 rounded-full border border-green-100">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              <span className="text-xs font-semibold text-green-700">{getContextualMessage()}</span>
            </div>

            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 tracking-tight">
              {getGreeting()}, <span className="bg-gradient-to-r from-green-600 via-emerald-500 to-teal-500 text-transparent bg-clip-text">{userName}</span>!
            </h1>

            <p className="text-lg text-slate-500 max-w-xl">
              {stage === 'idea' 
                ? "Plan your dream trip with expert travel advisors who compete to create your perfect itinerary."
                : "Track your trip progress, compare proposals, and stay connected with your travel advisor."
              }
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {stage === 'idea' ? (
              <Link href="/requests/new">
                <Button 
                  size="lg" 
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-xl shadow-green-500/25 hover:shadow-2xl hover:shadow-green-500/30 h-14 px-8 rounded-2xl font-bold text-base group transition-all duration-300 hover:scale-[1.02]"
                >
                  <Sparkles className="h-5 w-5 mr-2 group-hover:rotate-12 transition-transform" />
                  Start Planning
                  <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            ) : stage === 'compare' ? (
              <Link href="/dashboard/requests">
                <Button 
                  size="lg" 
                  className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-xl shadow-amber-500/25 h-14 px-8 rounded-2xl font-bold text-base group transition-all duration-300 hover:scale-[1.02]"
                >
                  <Target className="h-5 w-5 mr-2" />
                  View Proposals
                  <Badge className="ml-2 bg-white/20 text-white border-0 text-xs">
                    {stats?.awaitingSelection || ''}
                  </Badge>
                </Button>
              </Link>
            ) : activeRequest ? (
              <Link href={`/dashboard/requests/${activeRequest.id}`}>
                <Button 
                  size="lg" 
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xl shadow-blue-500/25 h-14 px-8 rounded-2xl font-bold text-base group transition-all duration-300 hover:scale-[1.02]"
                >
                  <Eye className="h-5 w-5 mr-2" />
                  View Trip Status
                </Button>
              </Link>
            ) : (
              <Link href="/requests/new">
                <Button 
                  size="lg" 
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-xl shadow-green-500/25 h-14 px-8 rounded-2xl font-bold text-base group transition-all duration-300 hover:scale-[1.02]"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Plan New Trip
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// JOURNEY PROGRESS
// ============================================================================

function JourneyProgress({ stage }: { stage: JourneyStage }) {
  const steps = [
    { key: 'request_sent', label: 'Request Sent', icon: Send },
    { key: 'agents_responding', label: 'Advisors Reviewing', icon: Users },
    { key: 'compare', label: 'Compare Proposals', icon: Target },
    { key: 'booked', label: 'Trip Booked', icon: CheckCircle },
  ];

  const getCurrentStepIndex = () => {
    if (stage === 'booked' || stage === 'traveling') return 3;
    if (stage === 'compare') return 2;
    if (stage === 'agents_responding') return 1;
    if (stage === 'request_sent') return 0;
    return -1;
  };

  const currentIndex = getCurrentStepIndex();

  return (
    <div className="mt-6 bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
      <div className="flex items-center justify-between relative">
        <div className="absolute top-5 left-8 right-8 h-0.5 bg-slate-100 -z-10" />
        <div 
          className="absolute top-5 left-8 h-0.5 bg-gradient-to-r from-green-400 to-emerald-500 -z-10 transition-all duration-700"
          style={{ width: `calc(${(currentIndex / 3) * 100}% - 2rem)` }}
        />

        {steps.map((step, i) => {
          const isComplete = i < currentIndex;
          const isCurrent = i === currentIndex;
          const StepIcon = step.icon;

          return (
            <div key={step.key} className="flex flex-col items-center z-10">
              <div className={`
                w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300
                ${isComplete ? 'bg-gradient-to-br from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/30' : ''}
                ${isCurrent ? 'bg-gradient-to-br from-blue-500 to-indigo-500 text-white ring-4 ring-blue-100 shadow-lg shadow-blue-500/30' : ''}
                ${!isComplete && !isCurrent ? 'bg-slate-100 text-slate-400' : ''}
              `}>
                {isComplete ? <CheckCircle className="h-5 w-5" /> : <StepIcon className="h-5 w-5" />}
              </div>
              <span className={`text-xs font-medium mt-2 text-center max-w-[80px] ${isCurrent ? 'text-blue-600' : isComplete ? 'text-green-600' : 'text-slate-400'}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// PRIMARY ACTION CARD
// ============================================================================

function PrimaryActionCard({ 
  stage, 
  activeRequest, 
  upcomingBooking, 
  stats 
}: { 
  stage: JourneyStage;
  activeRequest?: TravelRequest;
  upcomingBooking?: Booking;
  stats: DashboardStats | null;
}) {
  const destination = activeRequest?.destination?.label || activeRequest?.destination?.city;

  const configs: Record<JourneyStage, {
    icon: React.ReactNode;
    title: string;
    subtitle: string;
    gradient: string;
    shadowColor: string;
  }> = {
    idea: {
      icon: <Sparkles className="h-8 w-8" />,
      title: 'Start Your Dream Trip',
      subtitle: 'Tell us where you want to go. Expert travel advisors compete to plan your perfect adventure — free, no commitment.',
      gradient: 'from-green-500 via-emerald-500 to-teal-500',
      shadowColor: 'shadow-green-500/20',
    },
    request_sent: {
      icon: <Send className="h-8 w-8" />,
      title: `Your ${destination || 'trip'} request is live!`,
      subtitle: 'Travel advisors are being notified. Most respond within 4 hours with personalized proposals.',
      gradient: 'from-amber-500 via-orange-500 to-rose-500',
      shadowColor: 'shadow-amber-500/20',
    },
    agents_responding: {
      icon: <Users className="h-8 w-8" />,
      title: `Advisors are crafting your ${destination || 'trip'}`,
      subtitle: activeRequest?.agentsResponded 
        ? `${activeRequest.agentsResponded} advisor${activeRequest.agentsResponded > 1 ? 's have' : ' has'} viewed your request. Proposals coming soon!`
        : 'Expert advisors are designing personalized itineraries for you.',
      gradient: 'from-blue-500 via-indigo-500 to-purple-500',
      shadowColor: 'shadow-blue-500/20',
    },
    compare: {
      icon: <Target className="h-8 w-8" />,
      title: `${stats?.awaitingSelection || 'New'} proposals ready!`,
      subtitle: 'Travel advisors have sent personalized itineraries. Compare prices, experiences, and reviews to find your perfect match.',
      gradient: 'from-emerald-500 via-teal-500 to-cyan-500',
      shadowColor: 'shadow-emerald-500/20',
    },
    booked: {
      icon: upcomingBooking ? <Plane className="h-8 w-8" /> : <Globe className="h-8 w-8" />,
      title: upcomingBooking ? 'Your trip is confirmed!' : 'Ready for another adventure?',
      subtitle: upcomingBooking 
        ? 'Everything is set. Your travel advisor is available if you need anything before departure.'
        : 'Your last trip was amazing! Start planning your next one.',
      gradient: 'from-green-500 via-emerald-500 to-teal-500',
      shadowColor: 'shadow-green-500/20',
    },
    traveling: {
      icon: <Plane className="h-8 w-8 rotate-45" />,
      title: 'Enjoy your trip!',
      subtitle: 'Your travel advisor is on standby if you need any assistance during your journey.',
      gradient: 'from-pink-500 via-rose-500 to-red-500',
      shadowColor: 'shadow-pink-500/20',
    },
  };

  const config = configs[stage];

  return (
    <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${config.gradient} p-[2px] shadow-2xl ${config.shadowColor}`}>
      <div className="relative bg-white rounded-[22px] p-8 overflow-hidden">
        <div className={`absolute inset-0 bg-gradient-to-br ${config.gradient} opacity-[0.03]`} />
        <div className={`absolute -top-24 -right-24 w-64 h-64 bg-gradient-to-br ${config.gradient} opacity-5 rounded-full blur-3xl`} />
        <div className={`absolute -bottom-24 -left-24 w-48 h-48 bg-gradient-to-tr ${config.gradient} opacity-5 rounded-full blur-3xl`} />

        <div className="relative flex flex-col md:flex-row md:items-center gap-6">
          <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${config.gradient} flex items-center justify-center text-white shadow-lg ${config.shadowColor}`}>
            {config.icon}
          </div>

          <div className="flex-1">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">{config.title}</h2>
            <p className="text-slate-500 text-base leading-relaxed max-w-xl">{config.subtitle}</p>
          </div>

          {stage === 'compare' && (
            <Link href="/dashboard/requests">
              <Button className={`bg-gradient-to-r ${config.gradient} text-white shadow-lg ${config.shadowColor} hover:shadow-xl h-12 px-6 rounded-xl font-semibold`}>
                Compare Now
                <ChevronRight className="h-5 w-5 ml-1" />
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// DESTINATION INSPIRATION GRID - "Where Will You Wander Next?"
// ============================================================================

// Theme color mapping for gradient backgrounds
const THEME_COLOR_MAP: Record<string, string> = {
  Mountains: 'from-slate-500 to-slate-700',
  Beaches: 'from-blue-500 to-cyan-600',
  Heritage: 'from-amber-500 to-orange-600',
  Wildlife: 'from-green-600 to-emerald-700',
  Spiritual: 'from-purple-500 to-violet-600',
  Food: 'from-rose-500 to-pink-600',
  City: 'from-indigo-500 to-blue-600',
  Culture: 'from-fuchsia-500 to-pink-600',
  Nightlife: 'from-violet-600 to-purple-700',
  Nature: 'from-green-500 to-teal-600',
  Adventure: 'from-orange-500 to-red-600',
  Desert: 'from-amber-600 to-yellow-500',
  Beach: 'from-blue-500 to-cyan-600',
  'Hill Station': 'from-emerald-500 to-teal-600',
  Backwaters: 'from-teal-500 to-cyan-600',
  Honeymoon: 'from-rose-500 to-pink-600',
  Offbeat: 'from-indigo-500 to-violet-600',
};

// Get image URL for a destination
function getDestinationImageUrl(dest: Destination): string {
  if (dest.imageUrl) {
    return dest.imageUrl;
  }
  // Fallback: look up in static data
  const staticDest = INDIA_DESTINATIONS.find(d => d.id === dest.id);
  if (staticDest) {
    return destinationImageUrl(staticDest);
  }
  // Final fallback: generate from picsum with consistent seed
  const seed = dest.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return `https://picsum.photos/seed/${seed}/800/500`;
}

function DestinationInspirationGrid() {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDestinations() {
      try {
        const data = await fetchDestinations();
        // Shuffle and take random destinations
        const shuffled = [...data].sort(() => Math.random() - 0.5);
        setDestinations(shuffled);
      } catch (error) {
        console.error('Failed to fetch destinations:', error);
      } finally {
        setLoading(false);
      }
    }
    loadDestinations();
  }, []);

  // Get featured (first) and other destinations
  const featured = destinations[0];
  const otherDestinations = destinations.slice(1, 7);

  // Loading skeleton
  if (loading) {
    return (
      <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 rounded-3xl p-[2px] shadow-2xl shadow-purple-500/25">
        <div className="relative bg-slate-900 rounded-[22px] p-6 sm:p-8">
          <div className="animate-pulse space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-slate-700" />
              <div className="space-y-2">
                <div className="h-6 w-64 bg-slate-700 rounded" />
                <div className="h-4 w-48 bg-slate-800 rounded" />
              </div>
            </div>
            <div className="h-64 bg-slate-800 rounded-2xl" />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-40 bg-slate-800 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // No destinations found
  if (destinations.length === 0) {
    return (
      <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 rounded-3xl p-[2px] shadow-2xl shadow-purple-500/25">
        <div className="relative bg-slate-900 rounded-[22px] p-8 text-center">
          <Globe className="h-12 w-12 text-purple-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Explore Destinations</h3>
          <p className="text-purple-200 mb-4">Discover amazing places to visit</p>
          <Link href="/explore">
            <Button className="bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white">
              Browse All Destinations
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Get theme color for a destination
  const getThemeColor = (themes: string[]): string => {
    const primaryTheme = themes[0] || 'Nature';
    return THEME_COLOR_MAP[primaryTheme] || 'from-purple-500 to-indigo-600';
  };

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 rounded-3xl p-[2px] shadow-2xl shadow-purple-500/25">
      <div className="relative bg-slate-900 rounded-[22px] overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-purple-500/20 via-fuchsia-500/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 animate-pulse" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-violet-500/20 via-indigo-500/10 to-transparent rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        </div>
        
        <div className="relative p-6 sm:p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 flex items-center justify-center shadow-xl shadow-purple-500/40">
                  <Globe className="h-7 w-7 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full flex items-center justify-center animate-bounce">
                  <Sparkles className="h-3.5 w-3.5 text-white" />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                  Where Will You Wander Next?
                  <span className="text-2xl">✨</span>
                </h3>
                <p className="text-purple-200 text-sm">Discover amazing places to explore</p>
              </div>
            </div>
            <Link href="/explore" className="hidden sm:flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl border border-white/20 text-white font-semibold text-sm transition-all duration-300 group">
              Explore All
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Featured Destination - Large Card with Photo */}
          {featured && (
            <Link href={`/requests/new?destination=${featured.name.toLowerCase()}`}>
              <div className="relative mb-6 group cursor-pointer">
                <div className="relative h-64 sm:h-72 overflow-hidden rounded-2xl">
                  {/* Background Image */}
                  <div 
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                    style={{ backgroundImage: `url(${getDestinationImageUrl(featured)})` }}
                  />
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                  <div className={`absolute inset-0 bg-gradient-to-br ${getThemeColor(featured.themes)} opacity-20 mix-blend-overlay`} />
                  
                  {/* Featured Badge */}
                  <div className="absolute top-4 left-4">
                    <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 font-bold px-4 py-1.5 shadow-lg shadow-amber-500/30 text-sm">
                      <Star className="h-3.5 w-3.5 mr-1.5 fill-white" />
                      Featured
                    </Badge>
                  </div>

                  {/* Tag Badge */}
                  <div className="absolute top-4 right-4">
                    <Badge className={`bg-gradient-to-r ${getThemeColor(featured.themes)} text-white border-0 font-semibold px-3 py-1 shadow-lg`}>
                      {featured.themes[0] || 'Travel'}
                    </Badge>
                  </div>
                  
                  {/* Content */}
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-purple-200 text-sm font-medium mb-1">{featured.state}</p>
                        <h4 className="text-3xl sm:text-4xl font-bold text-white mb-2 group-hover:text-purple-200 transition-colors">
                          {featured.name}
                        </h4>
                        <p className="text-white/80 text-base font-medium">{featured.highlight}</p>
                      </div>
                      <div className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-4 group-hover:translate-x-0">
                        <span className="text-white font-semibold">Plan Trip</span>
                        <ArrowRight className="h-5 w-5 text-white" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          )}

          {/* Destination Grid - Cards with Photos */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {otherDestinations.map((dest) => (
              <Link key={dest.id} href={`/requests/new?destination=${dest.name.toLowerCase()}`}>
                <div className="group relative overflow-hidden rounded-xl cursor-pointer h-40 sm:h-44">
                  {/* Background Image */}
                  <div 
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                    style={{ backgroundImage: `url(${getDestinationImageUrl(dest)})` }}
                  />
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className={`absolute inset-0 bg-gradient-to-br ${getThemeColor(dest.themes)} opacity-0 group-hover:opacity-30 transition-opacity duration-300 mix-blend-overlay`} />
                  
                  {/* Content */}
                  <div className="absolute inset-0 flex flex-col justify-end p-3">
                    <Badge className={`bg-gradient-to-r ${getThemeColor(dest.themes)} text-white text-[10px] px-2 py-0.5 border-0 w-fit mb-1.5 shadow-sm`}>
                      {dest.themes[0] || 'Travel'}
                    </Badge>
                    <h4 className="font-bold text-white text-sm group-hover:text-purple-200 transition-colors">{dest.name}</h4>
                    <p className="text-white/60 text-xs">{dest.state}</p>
                  </div>
                  
                  {/* Hover overlay */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-lg">
                      <span className="text-white text-xs font-semibold">Plan Trip</span>
                      <ArrowRight className="h-3.5 w-3.5 text-white" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Mobile View All Button */}
          <Link href="/explore" className="sm:hidden mt-5 flex items-center justify-center gap-2 w-full py-3.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 rounded-xl text-white font-semibold text-sm transition-all duration-300 shadow-lg shadow-purple-500/30">
            Explore All Destinations
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ACTIVE TRIP CARD
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
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-lg transition-all duration-300 group">
      <div className="h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
      
      <div className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="text-5xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
              {getDestinationEmoji(request.destination?.country || request.destination?.city)}
            </div>
            <div>
              <h3 className="font-bold text-xl text-slate-900 group-hover:text-blue-600 transition-colors">
                {destination}
              </h3>
              <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  {formatDateRange(request.departureDate, request.returnDate)}
                </span>
                {request.travelers && (
                  <span className="flex items-center gap-1.5">
                    <Users className="h-4 w-4" />
                    {getTravelerCount(request.travelers)}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <StatusBadge stage={stage} agentsResponded={request.agentsResponded} />
        </div>

        {hasAgentViews && (stage === 'agents_responding' || stage === 'request_sent') && (
          <div className="flex items-center gap-3 mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
            <div className="flex -space-x-2">
              {[...Array(Math.min(request.agentsResponded || 0, 3))].map((_, i) => (
                <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 border-2 border-white flex items-center justify-center shadow-sm">
                  <Users className="h-3.5 w-3.5 text-white" />
                </div>
              ))}
            </div>
            <span className="text-sm text-blue-700 font-medium">
              {request.agentsResponded} advisor{(request.agentsResponded || 0) > 1 ? 's' : ''} working on your trip
            </span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-100">
          <Link href={`/dashboard/requests/${request.id}`}>
            <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-lg shadow-sm">
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </Button>
          </Link>
          
          <Link href={`/requests/edit/${request.id}`}>
            <Button variant="outline" className="border-slate-200 hover:border-blue-200 hover:bg-blue-50/50">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </Link>

          {stage === 'compare' && (
            <Link href="/dashboard/messages">
              <Button variant="outline" className="border-slate-200 hover:border-purple-200 hover:bg-purple-50/50">
                <MessageCircle className="h-4 w-4 mr-2" />
                Message Advisors
              </Button>
            </Link>
          )}

          {lastUpdated && (
            <div className="ml-auto flex items-center gap-2 text-xs text-slate-400">
              <span>Updated {getTimeAgo(lastUpdated.toISOString())}</span>
              <button 
                onClick={(e) => { e.preventDefault(); onRefresh(); }}
                className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ stage, agentsResponded }: { stage: JourneyStage; agentsResponded?: number }) {
  if (stage === 'compare') {
    return (
      <Badge className="bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 border border-amber-200 font-semibold px-3 py-1.5 rounded-xl">
        <Target className="h-3.5 w-3.5 mr-1.5" />
        Review Proposals
      </Badge>
    );
  }
  
  if ((stage === 'agents_responding' || stage === 'request_sent') && agentsResponded && agentsResponded > 0) {
    return (
      <Badge className="bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border border-blue-200 font-semibold px-3 py-1.5 rounded-xl">
        <Users className="h-3.5 w-3.5 mr-1.5" />
        {agentsResponded} responded
      </Badge>
    );
  }
  
  return (
    <Badge className="bg-slate-50 text-slate-600 border border-slate-200 font-semibold px-3 py-1.5 rounded-xl">
      <Clock className="h-3.5 w-3.5 mr-1.5" />
      Awaiting advisors
    </Badge>
  );
}

// ============================================================================
// UPCOMING TRIP CARD
// ============================================================================

function UpcomingTripCard({ booking }: { booking: Booking }) {
  const destination = booking.request?.destination?.label || booking.request?.destination?.city || 'Your Trip';
  const travelerCount = booking.request?.travelers 
    ? getTravelerCount(booking.request.travelers) 
    : undefined;
  // Get interests from preferences if available, otherwise default to empty array
  const highlights = (booking.request?.preferences?.interests as string[]) || [];
  
  return (
    <div className="space-y-4">
      {/* Trip Countdown Widget - Post Payment Only */}
      <TripCountdown
        tripId={booking.id}
        destination={destination}
        startDate={booking.travelStartDate}
        endDate={booking.travelEndDate}
        isPaymentConfirmed={booking.paymentState === 'paid' || booking.status === 'confirmed'}
        bookingReference={booking.confirmationCode}
        travelerCount={travelerCount}
        highlights={highlights.slice(0, 5)}
        variant="default"
      />
      
      {/* Quick Link to Booking Details */}
      <Link href={`/dashboard/bookings/${booking.id}`}>
        <div className="relative overflow-hidden bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500 rounded-2xl p-[2px] shadow-xl shadow-green-500/20 group hover:shadow-2xl transition-all duration-300">
          <div className="relative bg-white rounded-[14px] p-4 overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-green-50 to-emerald-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-3xl">
                  {getDestinationEmoji(booking.request?.destination?.country)}
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900 group-hover:text-green-600 transition-colors">
                    View Full Itinerary
                  </h3>
                  <p className="text-sm text-slate-500">
                    {formatDateRange(booking.travelStartDate, booking.travelEndDate)}
                  </p>
                </div>
              </div>
            
              <div className="flex items-center gap-4">
                {booking.agent && (
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-semibold text-slate-700">{booking.agent.fullName}</p>
                    {booking.agent.rating && (
                      <div className="flex items-center gap-1 justify-end mt-1">
                        <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                        <span className="text-sm font-medium text-slate-600">{booking.agent.rating.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                )}
                <ChevronRight className="h-5 w-5 text-green-500 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}

// ============================================================================
// MESSAGING PREVIEW
// ============================================================================

function MessagingPreview({ unreadCount }: { unreadCount: number }) {
  return (
    <Link href="/dashboard/messages">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 p-5 hover:shadow-lg hover:border-blue-200 transition-all duration-300 cursor-pointer group">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:scale-110 transition-transform">
                <MessageSquare className="h-6 w-6 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-white">
                {unreadCount}
              </div>
            </div>
            <div>
              <p className="font-bold text-slate-900 text-lg">
                {unreadCount} new message{unreadCount !== 1 ? 's' : ''}
              </p>
              <p className="text-sm text-slate-500">from your travel advisors</p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-blue-400 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </Link>
  );
}

// ============================================================================
// STATS OVERVIEW
// ============================================================================

function StatsOverview({ stats }: { stats: DashboardStats | null }) {
  const items = [
    { 
      label: 'Active Requests', 
      value: stats?.activeRequests || 0, 
      icon: Send, 
      color: 'from-blue-500 to-indigo-500',
      shadowColor: 'shadow-blue-500/20'
    },
    { 
      label: 'Upcoming Trips', 
      value: stats?.confirmedBookings || 0, 
      icon: Plane, 
      color: 'from-green-500 to-emerald-500',
      shadowColor: 'shadow-green-500/20'
    },
    { 
      label: 'Completed', 
      value: stats?.completedTrips || 0, 
      icon: Award, 
      color: 'from-amber-500 to-orange-500',
      shadowColor: 'shadow-amber-500/20'
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
      <div className="flex items-center gap-2.5 mb-5">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center shadow-lg shadow-purple-500/25">
          <TrendingUp className="h-4 w-4 text-white" />
        </div>
        <span className="font-bold text-slate-800">Your Stats</span>
      </div>
      
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between group">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${item.color} flex items-center justify-center text-white ${item.shadowColor} shadow-sm group-hover:scale-110 transition-transform`}>
                <item.icon className="h-4 w-4" />
              </div>
              <span className="text-sm text-slate-600 group-hover:text-slate-800 transition-colors">{item.label}</span>
            </div>
            <span className="text-lg font-bold text-slate-900 tabular-nums">{item.value}</span>
          </div>
        ))}
      </div>

      {(stats?.completedTrips || 0) > 0 && (
        <div className="mt-5 pt-4 border-t border-slate-100">
          <Link href="/dashboard/bookings" className="flex items-center justify-between text-sm text-green-600 hover:text-green-700 font-medium group">
            <span>View all trips</span>
            <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SIGNALS CARD
// ============================================================================

function SignalsCard({ stage }: { stage: JourneyStage }) {
  const getSignals = () => {
    switch (stage) {
      case 'idea':
        return [
          { icon: Zap, text: 'Most advisors respond in ~4 hours', color: 'blue' },
          { icon: Shield, text: "You're not obligated to book", color: 'green' },
          { icon: Heart, text: 'Free personalized itineraries', color: 'pink' },
        ];
      case 'request_sent':
      case 'agents_responding':
        return [
          { icon: Bell, text: "We'll notify when proposals arrive", color: 'blue' },
          { icon: Clock, text: 'Average response time: 4 hours', color: 'amber' },
          { icon: Shield, text: 'No commitment required', color: 'green' },
        ];
      case 'compare':
        return [
          { icon: Target, text: 'Compare 2-3 proposals minimum', color: 'blue' },
          { icon: MessageSquare, text: 'Ask advisors questions', color: 'purple' },
          { icon: Shield, text: 'Book only when ready', color: 'green' },
        ];
      default:
        return [
          { icon: MessageSquare, text: 'Your advisor is available', color: 'blue' },
          { icon: FileText, text: 'Download itinerary offline', color: 'purple' },
          { icon: Star, text: 'Leave a review after', color: 'amber' },
        ];
    }
  };

  const signals = getSignals();
  const colorMap: Record<string, string> = {
    blue: 'from-blue-500 to-indigo-500',
    green: 'from-green-500 to-emerald-500',
    amber: 'from-amber-500 to-orange-500',
    purple: 'from-purple-500 to-pink-500',
    pink: 'from-pink-500 to-rose-500',
  };

  const getTitle = () => {
    switch (stage) {
      case 'idea': return 'Good to know';
      case 'request_sent':
      case 'agents_responding': return 'What happens next';
      case 'compare': return 'Tips for choosing';
      default: return 'Quick tips';
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
      <div className="flex items-center gap-2.5 mb-5">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-500/25">
          <Shield className="h-4 w-4 text-white" />
        </div>
        <span className="font-bold text-slate-800">{getTitle()}</span>
      </div>
      
      <div className="space-y-4">
        {signals.map((signal, i) => (
          <div key={i} className="flex items-center gap-3 group">
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${colorMap[signal.color]} flex items-center justify-center text-white shadow-sm group-hover:scale-110 transition-transform`}>
              <signal.icon className="h-4 w-4" />
            </div>
            <span className="text-sm text-slate-600 group-hover:text-slate-800 transition-colors">{signal.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// QUICK LINKS CARD
// ============================================================================

function QuickLinksCard({ stage }: { stage: JourneyStage }) {
  const links = stage === 'idea' ? [
    { href: '/explore', label: 'Explore Destinations', icon: Globe },
    { href: '/compare-agents', label: 'Compare Advisors', icon: Users },
    { href: '/group-trip', label: 'Group Trip Planning', icon: Users },
    { href: '/how-it-works', label: 'How It Works', icon: Sparkles },
  ] : [
    { href: '/dashboard/requests', label: 'My Requests', icon: FileText },
    { href: '/dashboard/bookings', label: 'My Bookings', icon: Plane },
    { href: '/trip-countdown', label: 'Trip Countdown', icon: Calendar },
    { href: '/dashboard/messages', label: 'Messages', icon: MessageSquare },
    { href: '/group-trip', label: 'Group Trip Planning', icon: Users },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center">
          <Compass className="h-4 w-4 text-white" />
        </div>
        <span className="font-bold text-slate-800">Quick Links</span>
      </div>
      
      <div className="space-y-1">
        {links.map((link) => (
          <Link key={link.href} href={link.href}>
            <div className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors group cursor-pointer">
              <div className="flex items-center gap-3">
                <link.icon className="h-4 w-4 text-slate-400 group-hover:text-green-600 transition-colors" />
                <span className="text-sm text-slate-600 group-hover:text-slate-900 font-medium transition-colors">{link.label}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-green-600 group-hover:translate-x-0.5 transition-all" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// MOBILE BOTTOM CTA
// ============================================================================

function MobileBottomCTA({ 
  stage, 
  stats, 
  activeRequest,
  upcomingBooking 
}: { 
  stage: JourneyStage;
  stats: DashboardStats | null;
  activeRequest?: TravelRequest;
  upcomingBooking?: Booking;
}) {
  const getConfig = () => {
    if (stage === 'idea') {
      return {
        href: '/requests/new',
        icon: <Sparkles className="h-5 w-5" />,
        label: 'Start Planning',
        gradient: 'from-green-600 to-emerald-600',
      };
    }
    if (stage === 'compare') {
      return {
        href: '/dashboard/requests',
        icon: <Target className="h-5 w-5" />,
        label: `Compare ${stats?.awaitingSelection || ''} Proposals`,
        gradient: 'from-amber-500 to-orange-500',
      };
    }
    if (activeRequest) {
      return {
        href: `/dashboard/requests/${activeRequest.id}`,
        icon: <Eye className="h-5 w-5" />,
        label: 'View Trip Status',
        gradient: 'from-blue-600 to-indigo-600',
      };
    }
    if (upcomingBooking) {
      return {
        href: `/dashboard/bookings/${upcomingBooking.id}`,
        icon: <Plane className="h-5 w-5" />,
        label: 'View Itinerary',
        gradient: 'from-green-600 to-emerald-600',
      };
    }
    return {
      href: '/requests/new',
      icon: <Plus className="h-5 w-5" />,
      label: 'Plan New Trip',
      gradient: 'from-green-600 to-emerald-600',
    };
  };

  const config = getConfig();

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-xl border-t border-slate-200 shadow-2xl z-40 md:hidden">
      <Link href={config.href}>
        <Button className={`w-full bg-gradient-to-r ${config.gradient} text-white shadow-lg h-14 rounded-2xl font-bold text-base`}>
          {config.icon}
          <span className="ml-2">{config.label}</span>
        </Button>
      </Link>
    </div>
  );
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatDateRange(start: string, end: string): string {
  if (!start || !end) return 'Dates TBD';
  const startDate = new Date(start);
  const endDate = new Date(end);
  const startMonth = startDate.toLocaleDateString('en-US', { month: 'short' });
  const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' });
  
  if (startMonth === endMonth) {
    return `${startMonth} ${startDate.getDate()} - ${endDate.getDate()}`;
  }
  return `${startMonth} ${startDate.getDate()} - ${endMonth} ${endDate.getDate()}`;
}

function getTravelerCount(travelers: { adults?: number; children?: number; infants?: number; total?: number }): number {
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

// Suppress unused imports warning - these are used in JSX
void Card;
void CardContent;
