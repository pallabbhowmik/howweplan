'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { 
  CreditCard, 
  MapPin, 
  Calendar, 
  Users, 
  MessageSquare, 
  Loader2,
  Plane,
  CheckCircle2,
  Clock,
  Star,
  ChevronRight,
  Sparkles,
  Trophy,
  Wallet,
  ArrowRight,
  Globe,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useUserSession } from '@/lib/user/session';
import { fetchUserBookings, type Booking } from '@/lib/data/api';

export default function BookingsPage() {
  const { user, loading: userLoading } = useUserSession();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.userId) return;
    let cancelled = false;

    const loadBookings = async () => {
      setLoading(true);
      try {
        const data = await fetchUserBookings(user.userId);
        if (cancelled) return;
        setBookings(data);
      } catch (error) {
        if (cancelled) return;
        console.error('Error loading bookings:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadBookings();
    return () => { cancelled = true; };
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
    total: bookings.length,
  };

  // Calculate total spent
  const totalSpent = bookings
    .filter(b => ['confirmed', 'CONFIRMED', 'completed', 'COMPLETED'].includes(b.status))
    .reduce((sum, b) => sum + (b.totalAmount > 100000 ? b.totalAmount / 100 : b.totalAmount), 0);

  if (userLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full blur-xl opacity-30 animate-pulse" />
            <Loader2 className="relative h-12 w-12 animate-spin text-green-600 mx-auto mb-4" />
          </div>
          <p className="text-slate-500 font-medium">Loading your bookings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 rounded-3xl p-8 text-white shadow-2xl">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtOS45NCAwLTE4IDguMDYtMTggMThzOC4wNiAxOCAxOCAxOCAxOC04LjA2IDE4LTE4LTguMDYtMTgtMTgtMTh6bTAgMzJjLTcuNzMyIDAtMTQtNi4yNjgtMTQtMTRzNi4yNjgtMTQgMTQtMTQgMTQgNi4yNjggMTQgMTQtNi4yNjggMTQtMTQgMTR6IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9Ii4wNSIvPjwvZz48L3N2Zz4=')] opacity-30" />
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
              <Plane className="h-10 w-10" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold">My Bookings</h1>
              <p className="text-green-100 mt-1">Track your confirmed trips and adventures</p>
            </div>
          </div>
          <Link href="/requests/new">
            <Button size="lg" className="bg-white text-green-600 hover:bg-green-50 shadow-lg font-semibold h-12 px-6">
              <Sparkles className="h-5 w-5 mr-2" />
              Plan New Trip
            </Button>
          </Link>
        </div>

        {/* Quick Stats */}
        <div className="relative mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="h-4 w-4 text-green-200" />
              <p className="text-green-100 text-sm">Confirmed</p>
            </div>
            <p className="text-3xl font-bold">{stats.confirmed}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-yellow-200" />
              <p className="text-green-100 text-sm">Pending Payment</p>
            </div>
            <p className="text-3xl font-bold">{stats.pendingPayment}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="h-4 w-4 text-amber-200" />
              <p className="text-green-100 text-sm">Completed</p>
            </div>
            <p className="text-3xl font-bold">{stats.completed}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="h-4 w-4 text-emerald-200" />
              <p className="text-green-100 text-sm">Total Spent</p>
            </div>
            <p className="text-2xl font-bold">₹{totalSpent.toLocaleString('en-IN')}</p>
          </div>
        </div>
      </div>

      {/* Bookings List */}
      {bookings.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
            <Globe className="h-5 w-5 text-green-600" />
            Your Adventures ({bookings.length})
          </h2>
          
          {bookings.map((booking) => {
            const status = normalizeStatus(booking.status);
            const statusConfig = getStatusConfig(status);
            
            return (
              <Card 
                key={booking.id} 
                className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group hover:-translate-y-1"
              >
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row">
                    {/* Left Color Strip */}
                    <div className={`w-full md:w-2 h-2 md:h-auto ${statusConfig.barColor}`} />
                    
                    <div className="flex-1 p-6">
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                        {/* Main Content */}
                        <div className="flex-1 space-y-4">
                          {/* Header */}
                          <div className="flex items-start gap-4">
                            <div className={`p-3 rounded-xl ${statusConfig.iconBg}`}>
                              <MapPin className={`h-6 w-6 ${statusConfig.iconColor}`} />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-3 flex-wrap">
                                <h3 className="text-xl font-bold text-slate-900 group-hover:text-green-600 transition-colors">
                                  {getDestinationLabel(booking)}
                                </h3>
                                <StatusBadge status={status} config={statusConfig} />
                              </div>
                              {booking.confirmationCode && (
                                <p className="text-slate-500 text-sm mt-1 flex items-center gap-1">
                                  <CreditCard className="h-3 w-3" />
                                  Confirmation: <span className="font-mono font-medium">{booking.confirmationCode}</span>
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Trip Details Grid */}
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div className="flex items-center gap-2 text-slate-600">
                              <Calendar className="h-4 w-4 text-green-500" />
                              <span className="text-sm">{formatDateRange(booking.departureDate || booking.startDate, booking.returnDate || booking.endDate)}</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-600">
                              <Users className="h-4 w-4 text-blue-500" />
                              <span className="text-sm">{getTravelersCount(booking.travelers)} traveler{getTravelersCount(booking.travelers) !== 1 ? 's' : ''}</span>
                            </div>
                            {booking.agent && (
                              <div className="flex items-center gap-2 text-slate-600">
                                <Star className="h-4 w-4 text-amber-500" />
                                <span className="text-sm">
                                  {booking.agent.fullName || booking.agent.businessName}
                                  {booking.agent.rating && (
                                    <span className="ml-1 text-amber-600 font-medium">({booking.agent.rating.toFixed(1)})</span>
                                  )}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Right Side - Amount & Actions */}
                        <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between lg:justify-start gap-4 pt-4 lg:pt-0 border-t lg:border-t-0 lg:border-l lg:pl-6">
                          <div className="text-left lg:text-right">
                            <p className="text-xs text-slate-500 uppercase tracking-wide">Total Amount</p>
                            <p className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                              ₹{formatAmount(booking.totalAmount)}
                            </p>
                            {isPendingPayment(booking.status) && booking.paidAmount && booking.paidAmount > 0 && (
                              <div className="mt-1">
                                <p className="text-xs text-slate-500">
                                  Paid: ₹{formatAmount(booking.paidAmount)}
                                </p>
                                <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1">
                                  <div 
                                    className="bg-gradient-to-r from-green-500 to-emerald-500 h-1.5 rounded-full" 
                                    style={{ width: `${Math.round(booking.paidAmount / booking.totalAmount * 100)}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex gap-2">
                            <Link href={`/dashboard/messages?booking=${booking.id}`}>
                              <Button variant="outline" size="sm" className="gap-1 hover:bg-green-50 hover:text-green-600 hover:border-green-200">
                                <MessageSquare className="h-4 w-4" />
                                Chat
                              </Button>
                            </Link>
                            <Link href={`/dashboard/bookings/${booking.id}`}>
                              <Button 
                                size="sm"
                                className={isPendingPayment(booking.status) 
                                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 gap-1' 
                                  : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 gap-1'
                                }
                              >
                                {isPendingPayment(booking.status) ? (
                                  <>
                                    <Wallet className="h-4 w-4" />
                                    Pay Now
                                  </>
                                ) : (
                                  <>
                                    View
                                    <ChevronRight className="h-4 w-4" />
                                  </>
                                )}
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <Card className="border-0 shadow-xl overflow-hidden">
          <CardContent className="p-0">
            <div className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 py-16 px-8">
              <div className="max-w-md mx-auto text-center">
                <div className="relative inline-block mb-6">
                  <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full blur-xl opacity-30 animate-pulse" />
                  <div className="relative w-24 h-24 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto">
                    <Plane className="h-12 w-12 text-white" />
                  </div>
                </div>
                
                <h3 className="text-2xl font-bold text-slate-800 mb-3">
                  No bookings yet
                </h3>
                <p className="text-slate-600 mb-8">
                  Your confirmed trips will appear here. Start by creating a travel request and let our expert agents craft the perfect itinerary for you!
                </p>
                
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link href="/requests/new">
                    <Button size="lg" className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg gap-2 w-full sm:w-auto">
                      <Sparkles className="h-5 w-5" />
                      Plan Your First Trip
                    </Button>
                  </Link>
                  <Link href="/dashboard/requests">
                    <Button variant="outline" size="lg" className="gap-2 w-full sm:w-auto">
                      View My Requests
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>

                {/* Fun Stats Teaser */}
                <div className="mt-12 grid grid-cols-3 gap-4 max-w-sm mx-auto">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">500+</p>
                    <p className="text-xs text-slate-500">Trips Booked</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-emerald-600">4.9★</p>
                    <p className="text-xs text-slate-500">Avg Rating</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-teal-600">98%</p>
                    <p className="text-xs text-slate-500">Happy Travelers</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

function normalizeStatus(status: string): string {
  return status.toLowerCase().replace(/_/g, '_');
}

function getStatusConfig(status: string): { 
  label: string; 
  barColor: string; 
  iconBg: string; 
  iconColor: string;
  badgeClass: string;
  emoji: string;
} {
  const configs: Record<string, { 
    label: string; 
    barColor: string; 
    iconBg: string; 
    iconColor: string;
    badgeClass: string;
    emoji: string;
  }> = {
    pending_payment: { 
      label: 'Pending Payment', 
      barColor: 'bg-gradient-to-b from-amber-400 to-orange-500',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      badgeClass: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white',
      emoji: '⏳'
    },
    awaiting_payment: { 
      label: 'Awaiting Payment', 
      barColor: 'bg-gradient-to-b from-amber-400 to-orange-500',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      badgeClass: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white',
      emoji: '⏳'
    },
    confirmed: { 
      label: 'Confirmed', 
      barColor: 'bg-gradient-to-b from-green-400 to-emerald-500',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      badgeClass: 'bg-gradient-to-r from-green-500 to-emerald-500 text-white',
      emoji: '✅'
    },
    in_progress: { 
      label: 'In Progress', 
      barColor: 'bg-gradient-to-b from-blue-400 to-indigo-500',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      badgeClass: 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white',
      emoji: '✈️'
    },
    completed: { 
      label: 'Completed', 
      barColor: 'bg-gradient-to-b from-emerald-400 to-teal-500',
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      badgeClass: 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white',
      emoji: '🏆'
    },
    cancelled: { 
      label: 'Cancelled', 
      barColor: 'bg-gradient-to-b from-red-400 to-rose-500',
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      badgeClass: 'bg-gradient-to-r from-red-500 to-rose-500 text-white',
      emoji: '❌'
    },
    disputed: { 
      label: 'Disputed', 
      barColor: 'bg-gradient-to-b from-red-400 to-rose-500',
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      badgeClass: 'bg-gradient-to-r from-red-500 to-rose-500 text-white',
      emoji: '⚠️'
    },
  };

  return configs[status] || { 
    label: status, 
    barColor: 'bg-slate-400',
    iconBg: 'bg-slate-100',
    iconColor: 'text-slate-600',
    badgeClass: 'bg-slate-500 text-white',
    emoji: '📋'
  };
}

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
  return (travelers.adults || 0) + (travelers.children || 0) + (travelers.infants || 0) || 1;
}

function formatAmount(amount: number): string {
  const value = amount > 100000 ? amount / 100 : amount;
  return value.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function isPendingPayment(status: string): boolean {
  const pendingStatuses = ['pending_payment', 'PENDING_PAYMENT', 'AWAITING_PAYMENT', 'awaiting_payment'];
  return pendingStatuses.includes(status);
}

function StatusBadge({ status, config }: { status: string; config: ReturnType<typeof getStatusConfig> }) {
  return (
    <span className={`
      inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold shadow-md
      ${config.badgeClass}
    `}>
      <span>{config.emoji}</span>
      {config.label}
    </span>
  );
}
