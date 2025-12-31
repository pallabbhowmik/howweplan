'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
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
  MapPin,
  Users,
  ArrowRight,
  Sparkles,
  Target,
  Award,
  MessageSquare,
} from 'lucide-react';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Badge, Progress, Avatar, AvatarFallback } from '@/components/ui';
import { cn } from '@/lib/utils';

// ============================================================================
// MOCK DATA - Replace with real API calls
// ============================================================================

const mockStats = {
  pendingRequests: 5,
  activeBookings: 3,
  thisMonthCommission: 284500, // in cents
  lastMonthCommission: 241000,
  rating: 4.9,
  totalReviews: 127,
  responseRate: 94,
  acceptanceRate: 78,
  completedTrips: 89,
};

const mockPendingRequests = [
  {
    id: 'REQ-2024-001',
    destination: 'Udaipur & Jaipur',
    country: 'India',
    dates: { start: '2025-02-15', end: '2025-02-22' },
    budget: { min: 800000, max: 1200000, currency: 'INR' },
    travelers: { adults: 2, children: 0 },
    travelStyle: 'Luxury',
    interests: ['Heritage', 'Honeymoon', 'Palace', 'Spa'],
    receivedAt: '2024-12-30T10:15:00Z',
    expiresIn: '23h 15m',
    matchScore: 95,
  },
  {
    id: 'REQ-2024-002',
    destination: 'Kerala Backwaters',
    country: 'India',
    dates: { start: '2025-03-20', end: '2025-04-02' },
    budget: { min: 600000, max: 900000, currency: 'INR' },
    travelers: { adults: 2, children: 2 },
    travelStyle: 'Mid-Range',
    interests: ['Nature', 'Ayurveda', 'Family', 'Houseboat'],
    receivedAt: '2024-12-30T08:00:00Z',
    expiresIn: '20h 45m',
    matchScore: 88,
  },
  {
    id: 'REQ-2024-003',
    destination: 'Ladakh',
    country: 'India',
    dates: { start: '2025-01-25', end: '2025-02-01' },
    budget: { min: 500000, max: 700000, currency: 'INR' },
    travelers: { adults: 4, children: 0 },
    travelStyle: 'Adventure',
    interests: ['Trekking', 'Mountains', 'Adventure', 'Nature'],
    receivedAt: '2024-12-30T03:00:00Z',
    expiresIn: '15h 30m',
    matchScore: 82,
  },
];

const mockActiveBookings = [
  {
    id: 'BK-2024-089',
    destination: 'Goa, India',
    client: { firstName: 'Arjun', lastName: 'Kumar' },
    dates: { start: '2025-01-15', end: '2025-01-25' },
    status: 'confirmed',
    daysUntilTrip: 16,
    commission: 45000,
    hasUnreadMessages: true,
  },
  {
    id: 'BK-2024-087',
    destination: 'Rajasthan, India',
    client: { firstName: 'Priya', lastName: 'Sharma' },
    dates: { start: '2025-02-10', end: '2025-02-17' },
    status: 'itinerary_approved',
    daysUntilTrip: 42,
    commission: 38500,
    hasUnreadMessages: false,
  },
  {
    id: 'BK-2024-085',
    destination: 'Ranthambore, India',
    client: { firstName: 'Sneha', lastName: 'Gupta' },
    dates: { start: '2025-03-01', end: '2025-03-10' },
    status: 'pending_payment',
    daysUntilTrip: 61,
    commission: 62000,
    hasUnreadMessages: true,
  },
];

const mockRecentActivity = [
  { type: 'booking_confirmed', message: 'Goa trip confirmed by Arjun K.', time: '2 hours ago' },
  { type: 'review_received', message: 'New 5-star review from Rahul V.', time: '5 hours ago' },
  { type: 'itinerary_approved', message: 'Rajasthan itinerary approved', time: '1 day ago' },
  { type: 'message_received', message: 'New message from Sneha G.', time: '1 day ago' },
];

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
    case 'confirmed': return 'success';
    case 'itinerary_approved': return 'info';
    case 'pending_payment': return 'warning';
    default: return 'default';
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'confirmed': return 'Confirmed';
    case 'itinerary_approved': return 'Itinerary Approved';
    case 'pending_payment': return 'Awaiting Payment';
    default: return status;
  }
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

function RequestCard({ request, onAccept, onDecline }: {
  request: typeof mockPendingRequests[0];
  onAccept: () => void;
  onDecline: () => void;
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
            {request.expiresIn}
          </Badge>
        </div>
      </div>

      {/* Details Grid */}
      <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2 text-gray-600">
          <Calendar className="h-4 w-4 text-gray-400" />
          <span>{formatDateRange(request.dates.start, request.dates.end)}</span>
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
          <span>{request.travelStyle}</span>
        </div>
      </div>

      {/* Interests */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {request.interests.slice(0, 4).map((interest) => (
          <Badge key={interest} variant="secondary" className="text-xs font-normal">
            {interest}
          </Badge>
        ))}
        {request.interests.length > 4 && (
          <Badge variant="secondary" className="text-xs font-normal">
            +{request.interests.length - 4} more
          </Badge>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button onClick={onAccept} size="sm" className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600">
          <CheckCircle className="mr-1.5 h-4 w-4" />
          Accept
        </Button>
        <Button onClick={onDecline} variant="outline" size="sm" className="flex-1">
          <XCircle className="mr-1.5 h-4 w-4" />
          Decline
        </Button>
        <Link href="/requests">
          <Button variant="ghost" size="sm">
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* Received timestamp */}
      <p className="mt-3 text-center text-xs text-gray-400">
        Received <RelativeTime date={request.receivedAt} />
      </p>
    </div>
  );
}

function BookingCard({ booking }: { booking: typeof mockActiveBookings[0] }) {
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
        <p className="text-xs text-gray-400">{booking.daysUntilTrip} days until trip</p>
      </div>
    </div>
  );
}

function ActivityItem({ activity }: { activity: typeof mockRecentActivity[0] }) {
  const icons = {
    booking_confirmed: <CheckCircle className="h-4 w-4 text-emerald-500" />,
    review_received: <Star className="h-4 w-4 text-amber-500" />,
    itinerary_approved: <FileText className="h-4 w-4 text-blue-500" />,
    message_received: <MessageSquare className="h-4 w-4 text-purple-500" />,
  };

  return (
    <div className="flex items-center gap-3 py-2">
      <div className="rounded-full bg-gray-100 p-2">
        {icons[activity.type as keyof typeof icons]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-700 truncate">{activity.message}</p>
        <p className="text-xs text-gray-400">{activity.time}</p>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN DASHBOARD PAGE
// ============================================================================

export default function DashboardPage() {
  const [requests, setRequests] = useState(mockPendingRequests);

  const handleAccept = (requestId: string) => {
    setRequests((prev) => prev.filter((r) => r.id !== requestId));
  };

  const handleDecline = (requestId: string) => {
    setRequests((prev) => prev.filter((r) => r.id !== requestId));
  };

  const commissionGrowth = Math.round(
    ((mockStats.thisMonthCommission - mockStats.lastMonthCommission) / mockStats.lastMonthCommission) * 100
  );

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Dashboard</h1>
          <p className="mt-1 text-gray-500">Welcome back! Here's what's happening with your business.</p>
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
        <StatCard
          title="Pending Requests"
          value={requests.length}
          subtext="Awaiting your response"
          icon={<Inbox className="h-6 w-6" />}
          color="blue"
        />
        <StatCard
          title="Active Bookings"
          value={mockStats.activeBookings}
          subtext="Trips in progress"
          icon={<Calendar className="h-6 w-6" />}
          color="green"
        />
        <StatCard
          title="This Month"
          value={formatCurrency(mockStats.thisMonthCommission)}
          subtext="Commission earned"
          icon={<DollarSign className="h-6 w-6" />}
          trend={{ value: commissionGrowth, isPositive: commissionGrowth > 0 }}
          color="purple"
        />
        <StatCard
          title="Rating"
          value={mockStats.rating}
          subtext={`${mockStats.totalReviews} reviews`}
          icon={<Star className="h-6 w-6" />}
          color="amber"
        />
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
                <span className="font-semibold text-gray-900">{mockStats.responseRate}%</span>
              </div>
              <Progress value={mockStats.responseRate} color="green" />
              <p className="text-xs text-gray-400">Target: 90%</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Acceptance Rate</span>
                <span className="font-semibold text-gray-900">{mockStats.acceptanceRate}%</span>
              </div>
              <Progress value={mockStats.acceptanceRate} color="blue" />
              <p className="text-xs text-gray-400">Target: 70%</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Completed Trips</span>
                <span className="font-semibold text-gray-900">{mockStats.completedTrips}</span>
              </div>
              <Progress value={(mockStats.completedTrips / 100) * 100} color="purple" />
              <p className="text-xs text-gray-400">Lifetime total</p>
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
              {requests.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {requests.slice(0, 4).map((request) => (
                    <RequestCard
                      key={request.id}
                      request={request}
                      onAccept={() => handleAccept(request.id)}
                      onDecline={() => handleDecline(request.id)}
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
                <CardTitle className="text-base">Active Bookings</CardTitle>
                <Link href="/bookings">
                  <Button variant="ghost" size="sm" className="h-8 text-xs">
                    View All
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {mockActiveBookings.map((booking) => (
                <Link key={booking.id} href={`/bookings/${booking.id}`} className="block">
                  <BookingCard booking={booking} />
                </Link>
              ))}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-gray-100">
                {mockRecentActivity.map((activity, i) => (
                  <ActivityItem key={i} activity={activity} />
                ))}
              </div>
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
