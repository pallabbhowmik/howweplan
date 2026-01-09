'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Calendar, Mail, MapPin, MessageSquare, Users, AlertCircle } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle, Badge, Skeleton } from '@/components/ui';
import { getAgentBookingById, type AgentBooking } from '@/lib/data/agent';

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatDateRange(start: string | null, end: string | null): string {
  if (!start || !end) return 'Dates TBD';
  const startDate = new Date(start);
  const endDate = new Date(end);
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
  return `${startDate.toLocaleDateString('en-US', options)} - ${endDate.toLocaleDateString('en-US', options)}`;
}

export default function BookingDetailsPage() {
  const params = useParams<{ bookingId: string }>();
  const bookingId = params.bookingId;

  const [booking, setBooking] = useState<AgentBooking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadBooking() {
      if (!bookingId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const data = await getAgentBookingById(bookingId);
        setBooking(data);
      } catch (err) {
        console.error('Failed to load booking:', err);
        setError('Failed to load booking details. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }

    loadBooking();
  }, [bookingId]);

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/bookings">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/bookings">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to bookings
            </Button>
          </Link>
        </div>
        <Card>
          <CardContent className="py-16 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">Error loading booking</h3>
            <p className="text-gray-500 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/bookings">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to bookings
            </Button>
          </Link>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Booking not found</CardTitle>
          </CardHeader>
          <CardContent className="text-gray-600">
            This booking could not be found.
          </CardContent>
        </Card>
      </div>
    );
  }

  const destination = [booking.destinationCity, booking.destinationCountry]
    .filter(Boolean)
    .join(', ') || 'Destination TBD';
  const commission = Math.round(booking.totalAmountCents * 0.1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/bookings">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{destination}</h1>
            <p className="text-gray-500">Booking {booking.bookingNumber || booking.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/messages?booking=${encodeURIComponent(booking.id)}`}>
            <Button variant="outline">
              <MessageSquare className="mr-2 h-4 w-4" />
              Open chat
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Trip overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{booking.state}</Badge>
              <Badge variant="outline">Payment: {booking.paymentState}</Badge>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Dates</p>
                  <p className="font-medium text-gray-900">{formatDateRange(booking.tripStartDate, booking.tripEndDate)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Travelers</p>
                  <p className="font-medium text-gray-900">
                    {booking.travelerCount ?? 'TBD'} traveler{(booking.travelerCount ?? 0) !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Destination</p>
                  <p className="font-medium text-gray-900">{destination}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Client</p>
                  <p className="font-medium text-gray-900">
                    {booking.client ? `${booking.client.firstName} ${booking.client.lastName}` : 'Client'}
                  </p>
                  {booking.client?.email && (
                    <p className="text-sm text-gray-500">{booking.client.email}</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Financials</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Trip value</span>
              <span className="font-semibold">{formatCurrency(booking.totalAmountCents)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Commission</span>
              <span className="font-semibold text-emerald-700">{formatCurrency(commission)}</span>
            </div>
            <div className="pt-2 text-sm text-gray-500">
              Created {new Date(booking.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
