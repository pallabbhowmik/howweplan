'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, MapPin, Calendar, Users, MessageSquare, FileText, Phone, AlertTriangle, CheckCircle, Star, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useUserSession } from '@/lib/user/session';
import { fetchBooking, type Booking } from '@/lib/data/api';

export default function BookingDetailPage() {
  const params = useParams();
  const bookingId = params.id as string;
  const { loading: userLoading } = useUserSession();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const loadBooking = async () => {
      setLoading(true);
      try {
        const data = await fetchBooking(bookingId);
        setBooking(data);
      } catch (error) {
        console.error('Error loading booking:', error);
      } finally {
        setLoading(false);
      }
    };

    loadBooking();
  }, [bookingId]);

  if (userLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <h2 className="text-2xl font-bold mb-2">Booking Not Found</h2>
        <p className="text-muted-foreground mb-4">The booking you&apos;re looking for doesn&apos;t exist.</p>
        <Link href="/dashboard/bookings">
          <Button>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Bookings
          </Button>
        </Link>
      </div>
    );
  }

  const normalizedStatus = booking.status.toLowerCase();
  const canCancel = !['completed', 'cancelled', 'in_progress', 'in-progress'].includes(normalizedStatus);
  const canRequestChanges = !['completed', 'cancelled'].includes(normalizedStatus);
  const canLeaveReview = normalizedStatus === 'completed';
  const needsPayment = ['partial', 'pending', 'pending_payment', 'awaiting_payment'].includes(normalizedStatus);

  const handleCancel = async () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setShowCancelModal(false);
      setActionMessage({ type: 'success', text: 'Cancellation request submitted.' });
    }, 2000);
  };

  return (
    <div className="space-y-6">
      <Link href="/dashboard/bookings" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Bookings
      </Link>

      {actionMessage && (
        <div className={`p-4 rounded-lg flex items-center gap-2 ${actionMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {actionMessage.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
          {actionMessage.text}
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">{getDestinationLabel(booking)}</h1>
            <StatusBadge status={booking.status} />
          </div>
          <div className="flex flex-wrap gap-4 text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {formatDateRange(booking.departureDate || booking.startDate, booking.returnDate || booking.endDate)}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {getTravelersCount(booking.travelers)} travelers
            </span>
            {booking.confirmationCode && (
              <span className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                {booking.confirmationCode}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/messages?booking=${booking.id}`}>
            <Button variant="outline">
              <MessageSquare className="h-4 w-4 mr-2" />
              Message Agent
            </Button>
          </Link>
          {needsPayment && (
            <Button>
              Complete Payment
            </Button>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle>Trip Summary</CardTitle></CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Destination</p>
                    <p className="font-medium flex items-center gap-1">
                      <MapPin className="h-4 w-4 text-blue-600" />
                      {getDestinationLabel(booking)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Travel Dates</p>
                    <p className="font-medium">{formatDateRange(booking.departureDate || booking.startDate, booking.returnDate || booking.endDate)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Travelers</p>
                    <p className="font-medium">{getTravelersLabel(booking.travelers)}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Cost</p>
                    <p className="text-2xl font-bold text-blue-600">₹{formatAmount(booking.totalAmount)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Amount Paid</p>
                    <p className="font-medium">₹{formatAmount(booking.paidAmount || 0)}</p>
                    {booking.totalAmount > 0 && (
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div className="bg-green-600 h-2 rounded-full" style={{ width: `${Math.min(100, ((booking.paidAmount || 0) / booking.totalAmount) * 100)}%` }} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {booking.notes && (
            <Card>
              <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
              <CardContent><p className="text-muted-foreground whitespace-pre-wrap">{booking.notes}</p></CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Booking Actions</CardTitle>
              <CardDescription>Manage your booking</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-4">
                {canRequestChanges && (
                  <Button variant="outline"><MessageSquare className="h-4 w-4 mr-2" />Request Changes</Button>
                )}
                {canLeaveReview && (
                  <Button variant="outline" onClick={() => setShowReviewModal(true)}>
                    <Star className="h-4 w-4 mr-2" />Leave Review
                  </Button>
                )}
                {canCancel && (
                  <Button variant="outline" className="text-red-600 hover:text-red-700" onClick={() => setShowCancelModal(true)}>
                    <AlertTriangle className="h-4 w-4 mr-2" />Request Cancellation
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {booking.agent && (
            <Card>
              <CardHeader><CardTitle>Your Travel Agent</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-lg font-semibold">
                    {getInitials(booking.agent.fullName)}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{booking.agent.fullName}</h3>
                    {booking.agent.businessName && <p className="text-sm text-muted-foreground">{booking.agent.businessName}</p>}
                    {booking.agent.rating && (
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-medium">{booking.agent.rating.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                </div>
                <Button variant="outline" className="w-full mt-4"><MessageSquare className="h-4 w-4 mr-2" />Send Message</Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle>Booking Info</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <StatusBadge status={booking.status} />
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Booked On</span>
                <span className="text-sm font-medium">{formatDate(booking.createdAt)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Need Help?</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">Our support team is available 24/7.</p>
              <Button variant="outline" className="w-full"><Phone className="h-4 w-4 mr-2" />Contact Support</Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCancelModal(false)}>
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-2">Request Cancellation</h3>
            <p className="text-muted-foreground mb-4">Are you sure? Cancellation fees may apply.</p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowCancelModal(false)} disabled={isProcessing}>Keep Booking</Button>
              <Button variant="destructive" onClick={handleCancel} disabled={isProcessing}>
                {isProcessing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <AlertTriangle className="h-4 w-4 mr-2" />}
                Request Cancellation
              </Button>
            </div>
          </div>
        </div>
      )}

      {showReviewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowReviewModal(false)}>
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Leave a Review</h3>
            <div className="flex justify-center gap-2 mb-4">
              {[1, 2, 3, 4, 5].map((star) => (<button key={star} className="text-2xl text-gray-300 hover:text-yellow-400">★</button>))}
            </div>
            <textarea className="w-full border rounded-lg p-3 mb-4" rows={4} placeholder="Share your experience..." />
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowReviewModal(false)}>Cancel</Button>
              <Button onClick={() => { setShowReviewModal(false); setActionMessage({ type: 'success', text: 'Thank you for your review!' }); }}>Submit Review</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
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
  return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function getTravelersCount(travelers?: { adults?: number; children?: number; infants?: number; total?: number }): number {
  if (!travelers) return 1;
  if (travelers.total) return travelers.total;
  return (travelers.adults || 0) + (travelers.children || 0) + (travelers.infants || 0);
}

function getTravelersLabel(travelers?: { adults?: number; children?: number; infants?: number; total?: number }): string {
  if (!travelers) return '1 traveler';
  const parts = [];
  if (travelers.adults) parts.push(`${travelers.adults} adult${travelers.adults > 1 ? 's' : ''}`);
  if (travelers.children) parts.push(`${travelers.children} child${travelers.children > 1 ? 'ren' : ''}`);
  if (travelers.infants) parts.push(`${travelers.infants} infant${travelers.infants > 1 ? 's' : ''}`);
  return parts.length > 0 ? parts.join(', ') : `${getTravelersCount(travelers)} traveler(s)`;
}

function formatAmount(amount: number): string {
  const value = amount > 100000 ? amount / 100 : amount;
  return value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function StatusBadge({ status }: { status: string }) {
  const normalizedStatus = status.toLowerCase().replace(/_/g, '_');
  const variants: Record<string, { label: string; className: string }> = {
    pending_payment: { label: 'Pending Payment', className: 'bg-yellow-100 text-yellow-700' },
    awaiting_payment: { label: 'Pending Payment', className: 'bg-yellow-100 text-yellow-700' },
    confirmed: { label: 'Confirmed', className: 'bg-green-100 text-green-700' },
    upcoming: { label: 'Upcoming', className: 'bg-blue-100 text-blue-700' },
    in_progress: { label: 'In Progress', className: 'bg-blue-100 text-blue-700' },
    completed: { label: 'Completed', className: 'bg-slate-100 text-slate-700' },
    cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-700' },
  };
  const config = variants[normalizedStatus] || { label: status, className: 'bg-slate-100 text-slate-700' };
  return <Badge className={config.className}>{config.label}</Badge>;
}
