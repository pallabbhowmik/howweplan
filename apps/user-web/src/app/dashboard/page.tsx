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
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
          {getGreeting()}, <span className="bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 text-transparent bg-clip-text">{userName}</span>! 👋
        </h1>
        <p className="text-gray-500 mt-1.5 text-base">
          {stage === 'idea' 
            ? "Ready to plan your next adventure?"
            : stage === 'compare'
            ? "You have proposals waiting for review!"
            : "Here's what's happening with your trips."
          }
        </p>
      </div>
      {(stats?.activeRequests || 0) > 0 && (
        <div className="flex items-center gap-2.5 px-4 py-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100/50 shadow-sm">
          <div className="relative">
            <div className="h-2.5 w-2.5 bg-blue-500 rounded-full" />
            <div className="absolute inset-0 h-2.5 w-2.5 bg-blue-500 rounded-full animate-ping" />
          </div>
          <span className="text-sm font-semibold text-blue-700">
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
    <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm hover:shadow-lg transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-blue-500/25">
          <TrendingUp className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-gray-900 text-lg">Your Journey</h3>
          <p className="text-sm text-gray-500">Track your trip planning progress</p>
        </div>
      </div>

      <div className="flex items-center justify-between relative px-2">
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
          
          return (
            <div key={s.key} className="flex flex-col items-center relative z-10 group">
              {/* Step Circle */}
              <div 
                className={`
                  w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-500
                  ${isComplete ? 'bg-gradient-to-br from-green-400 to-emerald-500 text-white shadow-lg shadow-green-500/40 rotate-0' : ''}
                  ${isCurrent ? 'bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 text-white ring-4 ring-blue-100 scale-110 shadow-xl shadow-blue-500/40' : ''}
                  ${isFuture ? 'bg-gray-50 text-gray-400 border-2 border-gray-200 group-hover:border-gray-300 group-hover:bg-gray-100' : ''}
                `}
              >
                {isComplete ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <s.icon className={`h-5 w-5 ${isCurrent ? 'animate-pulse' : ''}`} />
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
    bgPattern: string;
    emoji: string;
  }> = {
    idea: {
      title: 'Start your dream trip',
      subtitle: 'Tell us where you want to go. Expert agents compete to plan your perfect adventure — free, no commitment.',
      cta: { label: 'Create Trip Request', href: '/requests/new' },
      gradient: 'from-blue-500 via-indigo-500 to-purple-600',
      bgPattern: 'radial-gradient(circle at 20% 50%, rgba(99, 102, 241, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(168, 85, 247, 0.1) 0%, transparent 50%)',
      emoji: '✨',
    },
    request_sent: {
      title: 'Request submitted!',
      subtitle: 'Your trip request has been sent to travel agents. They\'re reviewing it now.',
      cta: { label: 'View Request Details', href: '/dashboard/requests', variant: 'outline' },
      gradient: 'from-amber-500 to-orange-500',
      bgPattern: 'radial-gradient(circle at 30% 50%, rgba(251, 191, 36, 0.1) 0%, transparent 50%)',
      emoji: '📤',
    },
    agents_responding: {
      title: 'Agents are crafting proposals',
      subtitle: `Expert agents are designing personalized itineraries. You'll be notified when they're ready.`,
      cta: { label: 'View Progress', href: '/dashboard/requests', variant: 'outline' },
      secondaryCta: { label: 'Edit Preferences', href: activeRequest ? `/dashboard/requests/${activeRequest.id}` : '/dashboard/requests' },
      gradient: 'from-cyan-500 to-blue-600',
      bgPattern: 'radial-gradient(circle at 70% 30%, rgba(34, 211, 238, 0.1) 0%, transparent 50%)',
      emoji: '⚡',
    },
    compare: {
      title: `${stats?.awaitingSelection || 'New'} proposals ready!`,
      subtitle: 'Agents have sent you personalized itineraries. Compare and choose your favorite.',
      cta: { label: 'Compare Proposals', href: '/dashboard/requests' },
      gradient: 'from-emerald-500 to-teal-600',
      bgPattern: 'radial-gradient(circle at 20% 80%, rgba(16, 185, 129, 0.15) 0%, transparent 50%)',
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
      bgPattern: 'radial-gradient(circle at 80% 20%, rgba(34, 197, 94, 0.1) 0%, transparent 50%)',
      emoji: upcomingBooking ? '🎉' : '🌎',
    },
    traveling: {
      title: 'Enjoy your trip!',
      subtitle: 'Your agent is on standby if you need any assistance.',
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
      href: '/agents', 
      icon: Award, 
      label: 'Meet Our Agents', 
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
// ACTIVE TRIP CARD - Shows current request details
// ============================================================================

function ActiveTripCard({ request, stage }: { request: TravelRequest; stage: JourneyStage }) {
  const destination = request.destination?.label || request.destination?.city || request.title || 'Your Trip';
  
  return (
    <Link href={`/dashboard/requests/${request.id}`}>
      <Card className="border border-gray-200 hover:border-blue-300 hover:shadow-xl transition-all duration-300 cursor-pointer group overflow-hidden rounded-2xl">
        <CardContent className="p-0">
          {/* Gradient accent bar */}
          <div className="h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
          
          <div className="p-6">
            <div className="flex items-start justify-between">
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
              
              <div className="flex items-center gap-3">
                <StatusBadge stage={stage} agentsResponded={request.agentsResponded} />
                <div className="p-2 rounded-xl bg-gray-50 group-hover:bg-blue-50 transition-colors">
                  <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
                </div>
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
        {agentsResponded} agent{agentsResponded > 1 ? 's' : ''} responded
      </Badge>
    );
  }
  
  return (
    <Badge className="bg-gray-50 text-gray-600 border border-gray-200 font-semibold px-3 py-1.5 rounded-xl">
      <Clock className="h-3.5 w-3.5 mr-1.5" />
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
                <p className="text-sm text-gray-500">from your agents</p>
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
  const colorMap: Record<string, { bg: string; text: string; iconBg: string }> = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', iconBg: 'from-blue-500 to-indigo-500' },
    green: { bg: 'bg-green-50', text: 'text-green-600', iconBg: 'from-green-500 to-emerald-500' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', iconBg: 'from-amber-500 to-orange-500' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', iconBg: 'from-purple-500 to-pink-500' },
  };
  const defaultColor = { bg: 'bg-blue-50', text: 'text-blue-600', iconBg: 'from-blue-500 to-indigo-500' };

  return (
    <Card className="border border-gray-100 rounded-2xl overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="p-2 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 shadow-lg shadow-green-500/25">
            <Shield className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-bold text-gray-800">Good to know</span>
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
