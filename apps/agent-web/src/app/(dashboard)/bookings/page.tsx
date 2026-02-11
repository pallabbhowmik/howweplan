'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Search,
  Calendar,
  MapPin,
  Users,
  DollarSign,
  Clock,
  MessageSquare,
  FileText,
  MoreVertical,
  ArrowRight,
  Plane,
  CheckCircle,
  AlertCircle,
  Filter,
  Loader2,
} from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Input,
  Tabs,
  TabsList,
  TabsTrigger,
  Avatar,
  AvatarFallback,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Skeleton,
} from '@/components/ui';
import { cn } from '@/lib/utils';
import { listAgentBookings, type AgentBooking } from '@/lib/data/agent';

// ============================================================================
// TYPES
// ============================================================================

type BookingCardData = {
  id: string;
  destination: string;
  client: { firstName: string; lastName: string; email: string };
  dates: { start: string; end: string };
  travelers: { count: number };
  status: string;
  totalValue: number;
  commission: number;
  paymentStatus: string;
  daysUntilTrip: number;
  hasUnreadMessages: number;
  createdAt: string;
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
  }).format(cents / 100);
}

function formatDateRange(start: string | null, end: string | null): string {
  if (!start || !end) return 'Dates TBD';
  const startDate = new Date(start);
  const endDate = new Date(end);
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const yearOptions: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
  
  if (startDate.getFullYear() === endDate.getFullYear()) {
    return `${startDate.toLocaleDateString('en-US', options)} - ${endDate.toLocaleDateString('en-US', yearOptions)}`;
  }
  return `${startDate.toLocaleDateString('en-US', yearOptions)} - ${endDate.toLocaleDateString('en-US', yearOptions)}`;
}

function calculateDaysUntilTrip(startDate: string | null): number {
  if (!startDate) return 999;
  const start = new Date(startDate);
  const now = new Date();
  const diffTime = start.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function getStatusConfig(status: string): { label: string; variant: 'success' | 'warning' | 'info' | 'default' | 'destructive'; icon: React.ReactNode } {
  const configs: Record<string, { label: string; variant: 'success' | 'warning' | 'info' | 'default' | 'destructive'; icon: React.ReactNode }> = {
    confirmed: { label: 'Confirmed', variant: 'success', icon: <CheckCircle className="h-3 w-3" /> },
    itinerary_approved: { label: 'Itinerary Approved', variant: 'info', icon: <FileText className="h-3 w-3" /> },
    pending_payment: { label: 'Awaiting Payment', variant: 'warning', icon: <Clock className="h-3 w-3" /> },
    pending: { label: 'Pending', variant: 'warning', icon: <Clock className="h-3 w-3" /> },
    in_progress: { label: 'In Progress', variant: 'info', icon: <Plane className="h-3 w-3" /> },
    completed: { label: 'Completed', variant: 'default', icon: <CheckCircle className="h-3 w-3" /> },
    cancelled: { label: 'Cancelled', variant: 'destructive', icon: <AlertCircle className="h-3 w-3" /> },
  };
  return configs[status] || { label: status, variant: 'default', icon: null };
}

function getTripStatus(daysUntil: number): { label: string; color: string } {
  if (daysUntil < 0) return { label: 'Past', color: 'text-gray-500' };
  if (daysUntil === 0) return { label: 'Today!', color: 'text-green-600' };
  if (daysUntil <= 7) return { label: `${daysUntil}d away`, color: 'text-amber-600' };
  if (daysUntil <= 30) return { label: `${daysUntil}d away`, color: 'text-blue-600' };
  return { label: `${daysUntil}d away`, color: 'text-gray-500' };
}

/** Transform API booking to UI card data */
function transformBookingToCard(booking: AgentBooking): BookingCardData {
  const destination = [booking.destinationCity, booking.destinationCountry]
    .filter(Boolean)
    .join(', ') || 'Destination TBD';

  // Estimate commission as 10% of total (adjust based on actual business logic)
  const commission = Math.round(booking.totalAmountCents * 0.1);

  return {
    id: booking.id,
    destination,
    client: booking.client ?? {
      firstName: 'Client',
      lastName: '',
      email: '',
    },
    dates: {
      start: booking.tripStartDate ?? '',
      end: booking.tripEndDate ?? '',
    },
    travelers: {
      count: booking.travelerCount ?? 1,
    },
    status: booking.state,
    totalValue: booking.totalAmountCents,
    commission,
    paymentStatus: booking.paymentState,
    daysUntilTrip: calculateDaysUntilTrip(booking.tripStartDate),
    hasUnreadMessages: 0, // Would need to fetch from messaging service
    createdAt: booking.createdAt,
  };
}

// ============================================================================
// COMPONENTS
// ============================================================================

function BookingCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-center gap-6">
          <div className="flex items-start gap-4 flex-1">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <Skeleton className="h-8 w-24" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-5 w-20" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 w-9" />
              <Skeleton className="h-9 w-16" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BookingCard({ booking }: { booking: BookingCardData }) {
  const statusConfig = getStatusConfig(booking.status);
  const tripStatus = getTripStatus(booking.daysUntilTrip);

  return (
    <Card className="group transition-all duration-200 hover:shadow-lg">
      <CardContent className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-center gap-6">
          {/* Client & Destination Info */}
          <div className="flex items-start gap-4 flex-1">
            <Avatar size="lg">
              <AvatarFallback>
                {booking.client.firstName[0] ?? 'C'}{booking.client.lastName[0] ?? ''}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-semibold text-gray-900">{booking.destination}</h3>
                {booking.hasUnreadMessages > 0 && (
                  <Badge variant="destructive" className="h-5 px-1.5">
                    <MessageSquare className="h-3 w-3 mr-1" />
                    {booking.hasUnreadMessages}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-gray-600">
                {booking.client.firstName} {booking.client.lastName}
              </p>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {formatDateRange(booking.dates.start, booking.dates.end)}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {booking.travelers.count} traveler{booking.travelers.count !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Status & Trip Countdown */}
          <div className="flex items-center gap-6 lg:gap-8">
            <div className="text-center">
              <Badge variant={statusConfig.variant} className="gap-1">
                {statusConfig.icon}
                {statusConfig.label}
              </Badge>
              <p className={cn('text-sm font-medium mt-1', tripStatus.color)}>
                {tripStatus.label}
              </p>
            </div>

            {/* Financials */}
            <div className="text-right">
              <p className="text-sm text-gray-500">Trip Value</p>
              <p className="text-lg font-semibold text-gray-900">{formatCurrency(booking.totalValue)}</p>
              <p className="text-sm text-emerald-600 font-medium">
                {formatCurrency(booking.commission)} commission
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Link href={`/messages?booking=${booking.id}`}>
                <Button variant="outline" size="sm">
                  <MessageSquare className="h-4 w-4" />
                </Button>
              </Link>
              <Link href={`/bookings/${booking.id}`}>
                <Button size="sm">
                  View
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function BookingsPage() {
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('trip_date');
  const [bookings, setBookings] = useState<BookingCardData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch bookings on mount
  useEffect(() => {
    async function loadBookings() {
      try {
        setIsLoading(true);
        setError(null);
        const apiBookings = await listAgentBookings({ limit: 100 });
        setBookings(apiBookings.map(transformBookingToCard));
      } catch (err) {
        console.error('Failed to load bookings:', err);
        setError('Failed to load bookings. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }

    loadBookings();
  }, []);

  const filteredBookings = bookings.filter((booking) => {
    // Tab filter
    if (activeTab === 'upcoming' && booking.daysUntilTrip < 0) return false;
    if (activeTab === 'in_progress' && booking.status !== 'in_progress') return false;
    if (activeTab === 'completed' && booking.status !== 'completed') return false;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        booking.destination.toLowerCase().includes(query) ||
        booking.client.firstName.toLowerCase().includes(query) ||
        booking.client.lastName.toLowerCase().includes(query) ||
        booking.id.toLowerCase().includes(query)
      );
    }

    return true;
  });

  const sortedBookings = [...filteredBookings].sort((a, b) => {
    switch (sortBy) {
      case 'trip_date':
        return new Date(a.dates.start || 0).getTime() - new Date(b.dates.start || 0).getTime();
      case 'created':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'value_high':
        return b.totalValue - a.totalValue;
      case 'value_low':
        return a.totalValue - b.totalValue;
      default:
        return 0;
    }
  });

  const upcomingCount = bookings.filter((b) => b.daysUntilTrip >= 0 && b.status !== 'completed').length;
  const inProgressCount = bookings.filter((b) => b.status === 'in_progress').length;
  const completedCount = bookings.filter((b) => b.status === 'completed').length;

  const totalCommission = bookings
    .filter((b) => b.status !== 'completed')
    .reduce((sum, b) => sum + b.commission, 0);

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Page Header Skeleton */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Bookings</h1>
            <p className="mt-1 text-gray-500">
              Manage your confirmed trips and track progress
            </p>
          </div>
          <Card className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-100">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-emerald-100 p-3">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-emerald-700">Expected Commission</p>
                <Skeleton className="h-7 w-24" />
              </div>
            </div>
          </Card>
        </div>

        {/* Filters Skeleton */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <Skeleton className="h-10 w-96" />
              <div className="flex gap-3">
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-10 w-40" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Booking Cards Skeleton */}
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <BookingCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Bookings</h1>
          <p className="mt-1 text-gray-500">
            Manage your confirmed trips and track progress
          </p>
        </div>
        <Card>
          <CardContent className="py-16 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">Error loading bookings</h3>
            <p className="text-gray-500 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Bookings</h1>
          <p className="mt-1 text-gray-500">
            Manage your confirmed trips and track progress
          </p>
        </div>
        <Card className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-100">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-emerald-100 p-3">
              <DollarSign className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-emerald-700">Expected Commission</p>
              <p className="text-xl font-bold text-emerald-900">{formatCurrency(totalCommission)}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="all">All Bookings</TabsTrigger>
                <TabsTrigger value="upcoming">
                  Upcoming
                  <Badge variant="secondary" className="ml-2">{upcomingCount}</Badge>
                </TabsTrigger>
                <TabsTrigger value="in_progress">
                  In Progress
                  {inProgressCount > 0 && (
                    <Badge variant="info" className="ml-2">{inProgressCount}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex gap-3">
              <div className="relative flex-1 lg:w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search bookings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trip_date">Trip Date</SelectItem>
                  <SelectItem value="created">Recently Added</SelectItem>
                  <SelectItem value="value_high">Value: High to Low</SelectItem>
                  <SelectItem value="value_low">Value: Low to High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bookings List */}
      {sortedBookings.length > 0 ? (
        <div className="space-y-4">
          {sortedBookings.map((booking) => (
            <BookingCard key={booking.id} booking={booking} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Calendar className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No bookings found</h3>
            <p className="text-gray-500">
              {searchQuery
                ? 'Try adjusting your search terms'
                : 'Confirmed trips will appear here'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
