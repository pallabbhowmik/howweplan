'use client';

import Link from 'next/link';
import { Calendar, MapPin, Users, DollarSign, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const mockBookings = [
  {
    id: 'B001',
    requestId: 'R045',
    destination: 'Goa, India',
    dates: 'Mar 1 - Mar 10, 2025',
    status: 'confirmed',
    commission: 45000,
    totalValue: 950000,
    client: { name: 'Rahul V.', email: 'rahul@example.com' },
    travelers: 2,
    paymentStatus: 'paid',
    departureDate: '2025-03-01',
  },
  {
    id: 'B002',
    requestId: 'R048',
    destination: 'Andaman Islands, India',
    dates: 'Apr 5 - Apr 15, 2025',
    status: 'itinerary_approved',
    commission: 38000,
    totalValue: 850000,
    client: { name: 'Priya S.', email: 'priya@example.com' },
    travelers: 2,
    paymentStatus: 'pending',
    departureDate: '2025-04-05',
  },
  {
    id: 'B003',
    requestId: 'R051',
    destination: 'Kerala, India',
    dates: 'May 10 - May 24, 2025',
    status: 'completed',
    commission: 52000,
    totalValue: 1100000,
    client: { name: 'Vikram & Sneha G.', email: 'vikram@example.com' },
    travelers: 4,
    paymentStatus: 'paid',
    departureDate: '2025-05-10',
  },
];

function BookingCard({ booking }: { booking: typeof mockBookings[0] }) {
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(cents / 100);
  };

  const getDaysUntilDeparture = (departureDate: string) => {
    const now = new Date();
    const departure = new Date(departureDate);
    const diffInDays = Math.ceil((departure.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffInDays;
  };

  const daysUntilDeparture = getDaysUntilDeparture(booking.departureDate);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge variant="success">Confirmed</Badge>;
      case 'itinerary_approved':
        return <Badge variant="warning">Awaiting Payment</Badge>;
      case 'completed':
        return <Badge variant="outline">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-lg">{booking.destination}</h3>
              {getStatusBadge(booking.status)}
            </div>
            <p className="text-sm text-muted-foreground">Booking #{booking.id}</p>
            {daysUntilDeparture > 0 && daysUntilDeparture < 30 && (
              <p className="text-xs text-blue-600 font-medium mt-1">
                Departs in {daysUntilDeparture} days
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground">Travel Dates</p>
              <p className="font-medium">{booking.dates}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground">Travelers</p>
              <p className="font-medium">{booking.travelers} people</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground">Total Value</p>
              <p className="font-medium">{formatCurrency(booking.totalValue)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-green-600" />
            <div>
              <p className="text-muted-foreground">Your Commission</p>
              <p className="font-medium text-green-600">{formatCurrency(booking.commission)}</p>
            </div>
          </div>
        </div>

        <div className="border-t pt-4 mb-4">
          <div className="flex items-center justify-between text-sm">
            <div>
              <p className="text-muted-foreground">Client</p>
              <p className="font-medium">{booking.client.name}</p>
            </div>
            <div className="flex items-center gap-2">
              {booking.paymentStatus === 'paid' ? (
                <Badge variant="success" className="text-xs">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Paid
                </Badge>
              ) : (
                <Badge variant="warning" className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  Payment Pending
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Link href={`/dashboard/bookings/${booking.id}`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full">
              View Details
            </Button>
          </Link>
          {booking.status === 'confirmed' && (
            <Button size="sm" variant="ghost">
              Contact Client
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function BookingsPage() {
  const totalCommission = mockBookings
    .filter(b => b.status === 'completed' || b.status === 'confirmed')
    .reduce((sum, b) => sum + b.commission, 0);

  const activeBookings = mockBookings.filter(
    b => b.status === 'confirmed' || b.status === 'itinerary_approved'
  );

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(cents / 100);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-1">Bookings</h1>
              <p className="text-muted-foreground">Track and manage your active bookings</p>
            </div>
            <Link href="/dashboard">
              <Button variant="outline">← Back to Dashboard</Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold">{activeBookings.length}</div>
                    <p className="text-sm text-muted-foreground">Active Bookings</p>
                  </div>
                  <Calendar className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold">{mockBookings.filter(b => b.status === 'completed').length}</div>
                    <p className="text-sm text-muted-foreground">Completed</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold">{formatCurrency(totalCommission)}</div>
                    <p className="text-sm text-muted-foreground">Total Commission</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold">{mockBookings.filter(b => b.paymentStatus === 'pending').length}</div>
                    <p className="text-sm text-muted-foreground">Pending Payment</p>
                  </div>
                  <Clock className="h-8 w-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bookings List */}
          <div>
            <h2 className="text-lg font-semibold mb-4">All Bookings</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {mockBookings.map((booking) => (
                <BookingCard key={booking.id} booking={booking} />
              ))}
            </div>
          </div>

          {/* Info Card */}
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-900">ℹ️ Commission Information</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-blue-800">
                Commissions are earned when bookings are completed. Payment is processed within 7 days after the trip completion date. Star agents receive 5% commission, while bench agents receive 3%.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
