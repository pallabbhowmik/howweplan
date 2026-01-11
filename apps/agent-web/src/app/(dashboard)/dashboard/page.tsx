'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import {
  Inbox,
  FileText,
  Calendar,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Star,
  Users,
  ArrowRight,
  Sparkles,
  Target,
  Award,
  MessageSquare,
  Loader2,
  AlertCircle,
  ShieldAlert,
  LogOut,
} from 'lucide-react';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Badge, Progress, Avatar, AvatarFallback } from '@/components/ui';
import { cn } from '@/lib/utils';
import {
  getAgentIdentity,
  getAgentStats,
  listMatchedRequests,
  acceptMatch,
  declineMatch,
  ApiError,
  type AgentIdentity,
  type AgentStatsSummary,
  type AgentRequestMatch,
} from '@/lib/data/agent';
import { getAccessToken, logout, clearAuthData } from '@/lib/api/auth';

// ============================================================================
// TYPES
// ============================================================================

interface DashboardStats {
  pendingMatches: number;
  acceptedMatches: number;
  activeBookings: number;
  unreadMessages: number;
  thisMonthCommission: number;
  lastMonthCommission: number;
  rating: number | null;
  totalReviews: number;
  responseRate: number;
  acceptanceRate: number;
  completedTrips: number;
}

interface RequestCardData {
  id: string;
  matchId: string;
  destination: string;
  country: string;
  dates: { start: string; end: string };
  budget: { min: number; max: number; currency: string };
  travelers: { adults: number; children: number };
  travelStyle: string;
  interests: string[];
  receivedAt: string;
  expiresAt: string | null;
  matchScore: number;
  clientName: string;
}
interface BookingCardData {
  id: string;
  destination: string;
  client: { firstName: string; lastName: string };
  dates: { start: string; end: string };
  status: string;
  daysUntilTrip: number;
  commission: number;
  hasUnreadMessages: boolean;
}

interface ActivityItem {
  type: string;
  message: string;
  time: string;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

function formatTimeUntil(dateString: string | null): string {
  if (!dateString) return 'No deadline';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  if (diffMs <= 0) return 'Expired';
  
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (diffHours >= 24) {
    const days = Math.floor(diffHours / 24);
    return `${days}d ${diffHours % 24}h`;
  }
  return `${diffHours}h ${diffMins}m`;
}

// Client-only relative time component to avoid hydration mismatch
function RelativeTime({ date }: { date: string }) {
  const [time, setTime] = useState<string>('');
  
  useEffect(() => {
    setTime(formatRelativeTime(date));
    // Update every minute
    const interval = setInterval(() => {
      setTime(formatRelativeTime(date));
    }, 60000);
    return () => clearInterval(interval);
  }, [date]);
  
  // Return empty during SSR, show time only on client
  if (!time) return <span>just now</span>;
  return <span>{time}</span>;
}

function formatDateRange(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${startDate.toLocaleDateString('en-US', options)} - ${endDate.toLocaleDateString('en-US', options)}`;
}

function getStatusColor(status: string): 'success' | 'warning' | 'info' | 'default' {
  switch (status) {
    case 'confirmed':
    case 'CONFIRMED':
      return 'success';
    case 'itinerary_approved':
    case 'ITINERARIES_RECEIVED':
      return 'info';
    case 'pending_payment':
    case 'PENDING_PAYMENT':
      return 'warning';
    default: return 'default';
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'confirmed':
    case 'CONFIRMED':
      return 'Confirmed';
    case 'itinerary_approved':
    case 'ITINERARIES_RECEIVED':
      return 'Itinerary Approved';
    case 'pending_payment':
    case 'PENDING_PAYMENT':
      return 'Awaiting Payment';
    default: return status;
  }
}

// Transform API match to card data
function transformMatchToCard(match: AgentRequestMatch): RequestCardData {
  let dest = match.request?.destination;
  let destination = 'Unknown Destination';
  let country = 'India';
  
  // Handle JSON string - parse it first
  if (typeof dest === 'string') {
    try {
      dest = JSON.parse(dest);
    } catch {
      // Not valid JSON, use as plain string
      destination = dest;
      dest = null;
    }
  }
  
  if (dest && typeof dest === 'object') {
    const regions = (dest as any).regions;
    if (Array.isArray(regions) && regions.length > 0) {
      destination = regions.slice(0, 2).join(' & ');
    } else if ((dest as any).city) {
      destination = (dest as any).city;
    }
    country = (dest as any).country || 'India';
  }

  let travelers = match.request?.travelers;
  let adults = 2, children = 0;
  
  // Handle JSON string for travelers
  if (typeof travelers === 'string') {
    try {
      travelers = JSON.parse(travelers);
    } catch {
      travelers = null;
    }
  }
  
  if (travelers && typeof travelers === 'object') {
    adults = (travelers as any).adults ?? 2;
    children = (travelers as any).children ?? 0;
  }

  let prefs = match.request?.preferences;
  let interests: string[] = [];
  
  // Handle JSON string for preferences
  if (typeof prefs === 'string') {
    try {
      prefs = JSON.parse(prefs);
    } catch {
      prefs = null;
    }
  }
  
  if (prefs && typeof prefs === 'object') {
    const prefsObj = prefs as any;
    if (Array.isArray(prefsObj.interests)) {
      interests = prefsObj.interests;
    }
    if (prefsObj.special_occasions) {
      interests = [...interests, ...prefsObj.special_occasions];
    }
  }

  return {
    id: match.requestId,
    matchId: match.matchId,
    destination,
    country,
    dates: {
      start: match.request?.departure_date || '',
      end: match.request?.return_date || '',
    },
    budget: {
      min: (match.request?.budget_min || 0) * 100, // Convert to cents
      max: (match.request?.budget_max || 0) * 100,
      currency: match.request?.budget_currency || 'INR',
    },
    travelers: { adults, children },
    travelStyle: match.request?.travel_style || 'Standard',
    interests,
    receivedAt: match.matchedAt || new Date().toISOString(),
    expiresAt: match.expiresAt,
    matchScore: match.matchScore ? Math.round(match.matchScore * 100) : 0,
    clientName: match.user ? `${match.user.first_name} ${match.user.last_name?.[0] || ''}.` : 'Anonymous',
  };
}

// ============================================================================
// COMPONENTS
// ============================================================================

interface StatCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon: React.ReactNode;
  trend?: { value: number; isPositive: boolean };
  color: 'blue' | 'green' | 'purple' | 'amber';
}

function StatCard({ title, value, subtext, icon, trend, color }: StatCardProps) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-emerald-500 to-emerald-600',
    purple: 'from-purple-500 to-purple-600',
    amber: 'from-amber-500 to-amber-600',
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className={cn('bg-gradient-to-br p-4 text-white', colorClasses[color])}>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-white/80">{title}</p>
              <p className="text-3xl font-bold">{value}</p>
              {subtext && <p className="text-xs text-white/70">{subtext}</p>}
            </div>
            <div className="rounded-full bg-white/20 p-3">{icon}</div>
          </div>
          {trend && (
            <div className="mt-3 flex items-center gap-1 text-sm">
              {trend.isPositive ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span className={trend.isPositive ? 'text-white' : 'text-white/70'}>
                {trend.isPositive ? '+' : ''}{trend.value}% from last month
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function RequestCard({ request, onAccept, onDecline, isLoading }: {
  request: RequestCardData;
  onAccept: () => void;
  onDecline: () => void;
  isLoading?: boolean;
}) {
  return (
    <div className="group relative rounded-xl border border-gray-200 bg-white p-5 transition-all duration-200 hover:border-blue-300 hover:shadow-lg">
      {/* Match Score Badge */}
      <div className="absolute -top-2 -right-2">
        <div className="flex items-center gap-1 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 px-2.5 py-1 text-xs font-semibold text-white shadow-md">
          <Target className="h-3 w-3" />
          {request.matchScore}% Match
        </div>
      </div>

      {/* Header */}
      <div className="mb-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{request.destination}</h3>
            <p className="text-sm text-gray-500">{request.country}</p>
          </div>
          <Badge variant="outline" className="text-xs">
            <Clock className="mr-1 h-3 w-3" />
            {formatTimeUntil(request.expiresAt)}
          </Badge>
        </div>
      </div>

      {/* Details Grid */}
      <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2 text-gray-600">
          <Calendar className="h-4 w-4 text-gray-400" />
          <span>{request.dates.start && request.dates.end ? formatDateRange(request.dates.start, request.dates.end) : 'Dates TBD'}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600">
          <DollarSign className="h-4 w-4 text-gray-400" />
          <span>{formatCurrency(request.budget.min)} - {formatCurrency(request.budget.max)}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600">
          <Users className="h-4 w-4 text-gray-400" />
          <span>{request.travelers.adults} adults{request.travelers.children > 0 && `, ${request.travelers.children} children`}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600">
          <Sparkles className="h-4 w-4 text-gray-400" />
          <span className="capitalize">{request.travelStyle}</span>
        </div>
      </div>

      {/* Interests */}
      {request.interests.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {request.interests.slice(0, 4).map((interest) => (
            <Badge key={interest} variant="secondary" className="text-xs font-normal capitalize">
              {interest}
            </Badge>
          ))}
          {request.interests.length > 4 && (
            <Badge variant="secondary" className="text-xs font-normal">
              +{request.interests.length - 4} more
            </Badge>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button 
          onClick={onAccept} 
          size="sm" 
          className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-1.5 h-4 w-4" />}
          Accept
        </Button>
        <Button onClick={onDecline} variant="outline" size="sm" className="flex-1" disabled={isLoading}>
          <XCircle className="mr-1.5 h-4 w-4" />
          Decline
        </Button>
        <Link href={`/requests`}>
          <Button variant="ghost" size="sm">
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* Client name & received timestamp */}
      <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
        <span>From {request.clientName}</span>
        <span>Received <RelativeTime date={request.receivedAt} /></span>
      </div>
    </div>
  );
}

function BookingCard({ booking }: { booking: BookingCardData }) {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-gray-100 bg-white p-4 transition-all hover:border-gray-200 hover:shadow-sm">
      <Avatar size="lg">
        <AvatarFallback className="text-sm">
          {booking.client.firstName[0]}{booking.client.lastName[0]}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-gray-900 truncate">{booking.destination}</h4>
          {booking.hasUnreadMessages && (
            <span className="flex h-2 w-2 rounded-full bg-blue-500" />
          )}
        </div>
        <p className="text-sm text-gray-500">{booking.client.firstName} {booking.client.lastName[0]}.</p>
        <p className="text-xs text-gray-400">{formatDateRange(booking.dates.start, booking.dates.end)}</p>
      </div>

      <div className="text-right">
        <Badge variant={getStatusColor(booking.status)} className="mb-1">
          {getStatusLabel(booking.status)}
        </Badge>
        <p className="text-sm font-semibold text-emerald-600">{formatCurrency(booking.commission)}</p>
        <p className="text-xs text-gray-400">{booking.daysUntilTrip > 0 ? `${booking.daysUntilTrip} days until trip` : 'Trip in progress'}</p>
      </div>
    </div>
  );
}

function ActivityItemComponent({ activity }: { activity: ActivityItem }) {
  const icons: Record<string, React.ReactNode> = {
    booking_confirmed: <CheckCircle className="h-4 w-4 text-emerald-500" />,
    review_received: <Star className="h-4 w-4 text-amber-500" />,
    itinerary_approved: <FileText className="h-4 w-4 text-blue-500" />,
    message_received: <MessageSquare className="h-4 w-4 text-purple-500" />,
    match_accepted: <CheckCircle className="h-4 w-4 text-blue-500" />,
    match_received: <Inbox className="h-4 w-4 text-indigo-500" />,
  };

  return (
    <div className="flex items-center gap-3 py-2">
      <div className="rounded-full bg-gray-100 p-2">
        {icons[activity.type] || <FileText className="h-4 w-4 text-gray-500" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-700 truncate">{activity.message}</p>
        <p className="text-xs text-gray-400">{activity.time}</p>
      </div>
    </div>
  );
}

// Loading skeleton components
function StatCardSkeleton() {
  return (
    <Card className="overflow-hidden animate-pulse">
      <CardContent className="p-0">
        <div className="bg-gray-200 p-4 h-32" />
      </CardContent>
    </Card>
  );
}

function RequestCardSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 animate-pulse">
      <div className="h-6 bg-gray-200 rounded w-3/4 mb-4" />
      <div className="space-y-3">
        <div className="h-4 bg-gray-200 rounded w-1/2" />
        <div className="h-4 bg-gray-200 rounded w-2/3" />
      </div>
      <div className="mt-4 flex gap-2">
        <div className="h-9 bg-gray-200 rounded flex-1" />
        <div className="h-9 bg-gray-200 rounded flex-1" />
      </div>
    </div>
  );
}

// ============================================================================
// MAIN DASHBOARD PAGE
// ============================================================================

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [agentIdentity, setAgentIdentity] = useState<AgentIdentity | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [requests, setRequests] = useState<RequestCardData[]>([]);
  const [bookings, setBookings] = useState<BookingCardData[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const loadDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const token = getAccessToken();
      if (!token) {
        setError('Please log in to view your dashboard');
        setIsLoading(false);
        return;
      }

      // Fetch agent identity and stats in parallel
      const [identity, agentStats, matches] = await Promise.all([
        getAgentIdentity('current'),
        getAgentStats('current'),
        listMatchedRequests('current'),
      ]);

      setAgentIdentity(identity);
      
      // Transform matches to request cards (only pending ones)
      const pendingMatches = matches.filter(m => m.status === 'pending');
      const requestCards = pendingMatches.map(transformMatchToCard);
      setRequests(requestCards);

      // Build stats from real data
      const acceptedMatches = matches.filter(m => m.status === 'accepted');
      setStats({
        pendingMatches: pendingMatches.length,
        acceptedMatches: acceptedMatches.length,
        activeBookings: agentStats.activeBookings,
        unreadMessages: agentStats.unreadMessages,
        thisMonthCommission: 0, // Would come from earnings API
        lastMonthCommission: 0,
        rating: identity?.rating ?? null,
        totalReviews: identity?.totalReviews ?? 0,
        responseRate: 94, // Would come from performance metrics API
        acceptanceRate: matches.length > 0 
          ? Math.round((acceptedMatches.length / matches.length) * 100) 
          : 0,
        completedTrips: 0, // Would come from bookings API
      });

      // Generate recent activity from matches
      const activity: ActivityItem[] = matches.slice(0, 4).map(m => ({
        type: m.status === 'accepted' ? 'match_accepted' : 'match_received',
        message: m.status === 'accepted' 
          ? `Accepted request: ${m.request?.title || 'Travel Request'}`
          : `New match: ${m.request?.title || 'Travel Request'}`,
        time: m.matchedAt ? formatRelativeTime(m.matchedAt) : 'Recently',
      }));
      setRecentActivity(activity);

      // TODO: Fetch actual bookings from booking-payments service
      // For now, show accepted matches as "active bookings" proxy
      const bookingCards: BookingCardData[] = acceptedMatches.slice(0, 3).map(m => {
        const dest = m.request?.destination;
        let destination = 'Unknown';
        if (dest && typeof dest === 'object') {
          const regions = (dest as any).regions;
          destination = Array.isArray(regions) ? regions.join(', ') : 'India';
        }
        
        const startDate = new Date(m.request?.departure_date || Date.now());
        const daysUntil = Math.ceil((startDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        
        return {
          id: m.requestId,
          destination,
          client: {
            firstName: m.user?.first_name || 'Client',
            lastName: m.user?.last_name || '',
          },
          dates: {
            start: m.request?.departure_date || '',
            end: m.request?.return_date || '',
          },
          status: 'accepted',
          daysUntilTrip: daysUntil,
          commission: (m.request?.budget_min || 0) * 10, // Estimate 10% commission
          hasUnreadMessages: false,
        };
      });
      setBookings(bookingCards);

    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      
      // Handle specific error types
      if (err instanceof ApiError) {
        if (err.status === 403) {
          // User has wrong role - not an agent
          setError('ACCESS_DENIED');
        } else if (err.status === 401) {
          // Not authenticated
          setError('NOT_AUTHENTICATED');
        } else {
          setError(err.message || 'Failed to load dashboard data. Please try again.');
        }
      } else {
        setError('Failed to load dashboard data. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleAccept = async (matchId: string, requestId: string) => {
    try {
      setActionInProgress(matchId);
      await acceptMatch(matchId);
      setRequests(prev => prev.filter(r => r.matchId !== matchId));
      // Update stats
      setStats(prev => prev ? {
        ...prev,
        pendingMatches: prev.pendingMatches - 1,
        acceptedMatches: prev.acceptedMatches + 1,
      } : null);
    } catch (err) {
      console.error('Failed to accept match:', err);
      alert('Failed to accept request. Please try again.');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDecline = async (matchId: string, requestId: string) => {
    try {
      setActionInProgress(matchId);
      await declineMatch(matchId);
      setRequests(prev => prev.filter(r => r.matchId !== matchId));
      setStats(prev => prev ? {
        ...prev,
        pendingMatches: prev.pendingMatches - 1,
      } : null);
    } catch (err) {
      console.error('Failed to decline match:', err);
      alert('Failed to decline request. Please try again.');
    } finally {
      setActionInProgress(null);
    }
  };

  const commissionGrowth = stats && stats.lastMonthCommission > 0
    ? Math.round(((stats.thisMonthCommission - stats.lastMonthCommission) / stats.lastMonthCommission) * 100)
    : 0;

  const router = useRouter();

  const handleLogout = async () => {
    try {
      const token = getAccessToken();
      if (token) {
        await logout(token);
      }
    } catch {
      // Continue even if logout API fails
    }
    clearAuthData();
    router.push('/login');
  };

  // Access denied error state (wrong role)
  if (error === 'ACCESS_DENIED' && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center px-4">
        <ShieldAlert className="h-16 w-16 text-amber-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Agent Access Required</h2>
        <p className="text-gray-600 mb-2 max-w-md">
          Your account is registered as a regular user, not a travel agent.
        </p>
        <p className="text-gray-500 mb-6 max-w-md text-sm">
          To access the Agent Portal, you need an account with the &quot;agent&quot; role. 
          Please contact support if you believe this is an error, or log in with a different account.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Switch Account
          </Button>
          <Link href="mailto:support@howweplan.com">
            <Button>Contact Support</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Not authenticated error state
  if (error === 'NOT_AUTHENTICATED' && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center px-4">
        <AlertCircle className="h-16 w-16 text-blue-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Session Expired</h2>
        <p className="text-gray-600 mb-6 max-w-md">
          Please log in again to access your agent dashboard.
        </p>
        <Link href="/login">
          <Button>Log In</Button>
        </Link>
      </div>
    );
  }

  // Generic error state
  if (error && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Unable to Load Dashboard</h2>
        <p className="text-gray-500 mb-4">{error}</p>
        <Button onClick={loadDashboardData}>
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Dashboard</h1>
          <p className="mt-1 text-gray-500">
            {agentIdentity 
              ? `Welcome back, ${agentIdentity.firstName}! Here's what's happening with your business.`
              : 'Welcome back! Here\'s what\'s happening with your business.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/requests">
            <Button variant="outline">
              <Inbox className="mr-2 h-4 w-4" />
              View All Requests
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              title="Pending Requests"
              value={stats?.pendingMatches ?? 0}
              subtext="Awaiting your response"
              icon={<Inbox className="h-6 w-6" />}
              color="blue"
            />
            <StatCard
              title="Accepted Requests"
              value={stats?.acceptedMatches ?? 0}
              subtext="Ready to create itineraries"
              icon={<Calendar className="h-6 w-6" />}
              color="green"
            />
            <StatCard
              title="This Month"
              value={stats?.thisMonthCommission ? formatCurrency(stats.thisMonthCommission) : '₹0'}
              subtext="Commission earned"
              icon={<DollarSign className="h-6 w-6" />}
              trend={commissionGrowth !== 0 ? { value: commissionGrowth, isPositive: commissionGrowth > 0 } : undefined}
              color="purple"
            />
            <StatCard
              title="Rating"
              value={stats?.rating?.toFixed(1) ?? 'N/A'}
              subtext={`${stats?.totalReviews ?? 0} reviews`}
              icon={<Star className="h-6 w-6" />}
              color="amber"
            />
          </>
        )}
      </div>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-blue-500" />
            Performance Metrics
          </CardTitle>
          <CardDescription>Your key performance indicators this month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Response Rate</span>
                <span className="font-semibold text-gray-900">{stats?.responseRate ?? 0}%</span>
              </div>
              <Progress value={stats?.responseRate ?? 0} color="green" />
              <p className="text-xs text-gray-400">Target: 90%</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Acceptance Rate</span>
                <span className="font-semibold text-gray-900">{stats?.acceptanceRate ?? 0}%</span>
              </div>
              <Progress value={stats?.acceptanceRate ?? 0} color="blue" />
              <p className="text-xs text-gray-400">Target: 70%</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Unread Messages</span>
                <span className="font-semibold text-gray-900">{stats?.unreadMessages ?? 0}</span>
              </div>
              <Progress value={Math.min((stats?.unreadMessages ?? 0) * 10, 100)} color="purple" />
              <p className="text-xs text-gray-400">Respond promptly</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Pending Requests */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>New Travel Requests</CardTitle>
                  <CardDescription>Matched to your expertise - respond within 24 hours</CardDescription>
                </div>
                <Link href="/requests">
                  <Button variant="ghost" size="sm">
                    View All
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <RequestCardSkeleton />
                  <RequestCardSkeleton />
                </div>
              ) : requests.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {requests.slice(0, 4).map((request) => (
                    <RequestCard
                      key={request.matchId}
                      request={request}
                      onAccept={() => handleAccept(request.matchId, request.id)}
                      onDecline={() => handleDecline(request.matchId, request.id)}
                      isLoading={actionInProgress === request.matchId}
                    />
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <Inbox className="mx-auto h-12 w-12 text-gray-300" />
                  <h3 className="mt-4 text-lg font-medium text-gray-900">No pending requests</h3>
                  <p className="mt-1 text-gray-500">New requests matching your profile will appear here.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Active Bookings */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Accepted Requests</CardTitle>
                <Link href="/bookings">
                  <Button variant="ghost" size="sm" className="h-8 text-xs">
                    View All
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                <div className="animate-pulse space-y-3">
                  <div className="h-20 bg-gray-200 rounded" />
                  <div className="h-20 bg-gray-200 rounded" />
                </div>
              ) : bookings.length > 0 ? (
                bookings.map((booking) => (
                  <Link key={booking.id} href={`/bookings/${booking.id}`} className="block">
                    <BookingCard booking={booking} />
                  </Link>
                ))
              ) : (
                <div className="py-6 text-center text-gray-500 text-sm">
                  No accepted requests yet
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="animate-pulse space-y-3">
                  <div className="h-10 bg-gray-200 rounded" />
                  <div className="h-10 bg-gray-200 rounded" />
                  <div className="h-10 bg-gray-200 rounded" />
                </div>
              ) : recentActivity.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {recentActivity.map((activity, i) => (
                    <ActivityItemComponent key={i} activity={activity} />
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-gray-500 text-sm">
                  No recent activity
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tips Card */}
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-blue-100 p-2">
                  <Sparkles className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-medium text-blue-900">Pro Tip</h4>
                  <p className="mt-1 text-sm text-blue-700">
                    Agents who respond within 4 hours see 40% higher acceptance rates. Keep your response time low!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
