'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Calendar, Mail, MapPin, MessageSquare, Users } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle, Badge } from '@/components/ui';
import { getMockBookingById } from '@/lib/mock/bookings';

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatDateRange(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
  return `${startDate.toLocaleDateString('en-US', options)} - ${endDate.toLocaleDateString('en-US', options)}`;
}

export default function BookingDetailsPage() {
  const params = useParams<{ bookingId: string }>();
  const bookingId = params.bookingId;

  const booking = getMockBookingById(bookingId);

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
            This booking ID doesn’t exist in the demo dataset.
          </CardContent>
        </Card>
      </div>
    );
  }

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
            <h1 className="text-2xl font-bold text-gray-900">{booking.destination}</h1>
            <p className="text-gray-500">Booking {booking.id}</p>
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
              <Badge variant="secondary">{booking.status}</Badge>
              <Badge variant="outline">Payment: {booking.paymentStatus}</Badge>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Dates</p>
                  <p className="font-medium text-gray-900">{formatDateRange(booking.dates.start, booking.dates.end)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Travelers</p>
                  <p className="font-medium text-gray-900">
                    {booking.travelers.adults + booking.travelers.children} total ({booking.travelers.adults} adults{booking.travelers.children ? `, ${booking.travelers.children} children` : ''})
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Destination</p>
                  <p className="font-medium text-gray-900">{booking.destination}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Client</p>
                  <p className="font-medium text-gray-900">{booking.client.firstName} {booking.client.lastName}</p>
                  <p className="text-sm text-gray-500">{booking.client.email}</p>
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
              <span className="font-semibold">{formatCurrency(booking.totalValue)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Commission</span>
              <span className="font-semibold text-emerald-700">{formatCurrency(booking.commission)}</span>
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
