'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CreditCard, MapPin, Calendar, User, MessageSquare, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useUserSession } from '@/lib/user/session';
import { fetchUserBookings, type Booking } from '@/lib/data/api';

export default function BookingsPage() {
  const { user, loading: userLoading } = useUserSession();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.userId) return;

    const loadBookings = async () => {
      setLoading(true);
      try {
        const data = await fetchUserBookings(user.userId);
        setBookings(data);
      } catch (error) {
        console.error('Error loading bookings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadBookings();
  }, [user?.userId]);

  // Calculate stats from bookings
  const stats = {
    confirmed: bookings.filter(b => b.status === 'confirmed' || b.status === 'CONFIRMED').length,
    pendingPayment: bookings.filter(b => 
      b.status === 'pending_payment' || 
      b.status === 'PENDING_PAYMENT' || 
      b.status === 'AWAITING_PAYMENT'
    ).length,
    completed: bookings.filter(b => b.status === 'completed' || b.status === 'COMPLETED').length,
  };

  if (userLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">My Bookings</h1>
        <p className="text-muted-foreground">Track your confirmed trips and payments</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-green-50 text-green-600">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Confirmed</p>
                <p className="text-2xl font-bold">{stats.confirmed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-yellow-50 text-yellow-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Payment</p>
                <p className="text-2xl font-bold">{stats.pendingPayment}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-50 text-blue-600">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed Trips</p>
                <p className="text-2xl font-bold">{stats.completed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bookings List */}
      <div className="space-y-4">
        {bookings.map((booking) => (
          <Card key={booking.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-semibold">{getDestinationLabel(booking)}</h3>
                    <StatusBadge status={booking.status} />
                  </div>
                  
                  <div className="flex gap-6 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {formatDateRange(booking.departureDate || booking.startDate, booking.returnDate || booking.endDate)}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      {getTravelersCount(booking.travelers)} travelers
                    </span>
                  </div>

                  {booking.agent && (
                    <div className="flex items-center gap-2 text-sm">
                      <span>Agent:</span>
                      <span className="font-medium">{booking.agent.fullName || booking.agent.businessName}</span>
                      {booking.agent.rating && (
                        <span className="text-yellow-500">★ {booking.agent.rating.toFixed(1)}</span>
                      )}
                    </div>
                  )}

                  {booking.confirmationCode && (
                    <div className="text-xs text-muted-foreground">
                      Confirmation: {booking.confirmationCode}
                    </div>
                  )}
                </div>

                <div className="text-right space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="text-2xl font-bold">₹{formatAmount(booking.totalAmount)}</p>
                    {isPendingPayment(booking.status) && booking.paidAmount && (
                      <p className="text-sm text-muted-foreground">
                        Paid: ₹{formatAmount(booking.paidAmount)} ({Math.round(booking.paidAmount / booking.totalAmount * 100)}%)
                      </p>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <Link href={`/dashboard/messages?booking=${booking.id}`}>
                      <Button variant="outline" size="sm">
                        <MessageSquare className="h-4 w-4 mr-1" />
                        Chat
                      </Button>
                    </Link>
                    <Link href={`/dashboard/bookings/${booking.id}`}>
                      <Button variant={isPendingPayment(booking.status) ? 'default' : 'outline'} size="sm">
                        {isPendingPayment(booking.status) ? 'Complete Payment' : 'View Details'}
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {bookings.length === 0 && !loading && (
        <Card>
          <CardContent className="py-12 text-center">
            <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground mb-4">No bookings yet</p>
            <Link href="/requests/new">
              <Button>Create Travel Request</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

function getDestinationLabel(booking: Booking): string {
  if (booking.destination) {
    if (typeof booking.destination === 'string') return booking.destination;
    return booking.destination.label || booking.destination.city || 'Trip';
  }
  return booking.title || 'Trip';
}

function formatDateRange(start?: string, end?: string): string {
  if (!start || !end) return 'Dates TBD';
  const startDate = new Date(start);
  const endDate = new Date(end);
  const startMonth = startDate.toLocaleDateString('en-US', { month: 'short' });
  const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' });
  
  if (startMonth === endMonth) {
    return `${startMonth} ${startDate.getDate()} - ${endDate.getDate()}, ${endDate.getFullYear()}`;
  }
  return `${startMonth} ${startDate.getDate()} - ${endMonth} ${endDate.getDate()}, ${endDate.getFullYear()}`;
}

function getTravelersCount(travelers?: { adults?: number; children?: number; infants?: number; total?: number }): number {
  if (!travelers) return 1;
  if (travelers.total) return travelers.total;
  return (travelers.adults || 0) + (travelers.children || 0) + (travelers.infants || 0);
}

function formatAmount(amount: number): string {
  // Check if amount is in cents (greater than reasonable dollar amount) or dollars
  const value = amount > 100000 ? amount / 100 : amount;
  return value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function isPendingPayment(status: string): boolean {
  const pendingStatuses = ['pending_payment', 'PENDING_PAYMENT', 'AWAITING_PAYMENT'];
  return pendingStatuses.includes(status);
}

function StatusBadge({ status }: { status: string }) {
  const normalizedStatus = status.toLowerCase().replace(/_/g, '_');
  
  const variants: Record<string, { label: string; className: string }> = {
    pending_payment: { label: 'Pending Payment', className: 'bg-yellow-100 text-yellow-700' },
    awaiting_payment: { label: 'Pending Payment', className: 'bg-yellow-100 text-yellow-700' },
    confirmed: { label: 'Confirmed', className: 'bg-green-100 text-green-700' },
    in_progress: { label: 'In Progress', className: 'bg-blue-100 text-blue-700' },
    completed: { label: 'Completed', className: 'bg-slate-100 text-slate-700' },
    cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-700' },
    disputed: { label: 'Disputed', className: 'bg-red-100 text-red-700' },
  };

  const config = variants[normalizedStatus] || { label: status, className: 'bg-slate-100 text-slate-700' };
  return <Badge className={config.className}>{config.label}</Badge>;
}
