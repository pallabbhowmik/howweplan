'use client';

import Link from 'next/link';
import { 
  Inbox, 
  FileText, 
  Calendar, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  TrendingUp,
  Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Mock data for demonstration
const mockRequests = [
  {
    id: 'R001',
    destination: 'Rajasthan, India',
    dates: 'Jun 15 - Jun 25, 2025',
    budget: '₹6,00,000 - ₹10,00,000',
    status: 'pending',
    travelers: 2,
    specialties: ['Luxury', 'Honeymoon', 'Heritage'],
    receivedAt: '2 hours ago',
  },
  {
    id: 'R002',
    destination: 'Kerala, India',
    dates: 'Jul 1 - Jul 14, 2025',
    budget: '₹4,00,000 - ₹6,00,000',
    status: 'pending',
    travelers: 4,
    specialties: ['Family', 'Beach', 'Ayurveda'],
    receivedAt: '5 hours ago',
  },
  {
    id: 'R003',
    destination: 'Ladakh, India',
    dates: 'Aug 10 - Aug 20, 2025',
    budget: '₹5,00,000 - ₹8,00,000',
    status: 'pending',
    travelers: 2,
    specialties: ['Adventure', 'Mountains', 'Trekking'],
    receivedAt: '1 day ago',
  },
];

const mockActiveBookings = [
  {
    id: 'B001',
    requestId: 'R045',
    destination: 'Goa, India',
    dates: 'Mar 1 - Mar 10, 2025',
    status: 'confirmed',
    commission: 45000,
    client: 'Rahul V.',
  },
  {
    id: 'B002',
    requestId: 'R048',
    destination: 'Andaman Islands, India',
    dates: 'Apr 5 - Apr 15, 2025',
    status: 'itinerary_approved',
    commission: 38000,
    client: 'Priya S.',
  },
];

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ReactNode;
  trend?: string;
  color?: 'blue' | 'green' | 'yellow' | 'purple';
}

function StatCard({ title, value, description, icon, trend, color = 'blue' }: StatCardProps) {
  const colorClasses = {
    blue: 'text-blue-600 bg-blue-50',
    green: 'text-green-600 bg-green-50',
    yellow: 'text-yellow-600 bg-yellow-50',
    purple: 'text-purple-600 bg-purple-50',
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
          <div className={`p-3 rounded-full ${colorClasses[color]}`}>
            {icon}
          </div>
        </div>
        {trend && (
          <div className="mt-3 flex items-center text-xs text-green-600">
            <TrendingUp className="h-3 w-3 mr-1" />
            {trend}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RequestCard({ request }: { request: typeof mockRequests[0] }) {
  return (
    <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-lg">{request.destination}</h3>
            <Badge variant="info" className="text-xs">New</Badge>
          </div>
          <p className="text-sm text-muted-foreground">Request ID: {request.id}</p>
        </div>
        <span className="text-xs text-muted-foreground">{request.receivedAt}</span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
        <div>
          <p className="text-muted-foreground">Travel Dates</p>
          <p className="font-medium">{request.dates}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Budget</p>
          <p className="font-medium">{request.budget}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Travelers</p>
          <p className="font-medium">{request.travelers} people</p>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-sm text-muted-foreground mb-2">Interests</p>
        <div className="flex flex-wrap gap-2">
          {request.specialties.map((specialty) => (
            <Badge key={specialty} variant="outline" className="text-xs">
              {specialty}
            </Badge>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <Button size="sm" className="flex-1">
          <CheckCircle className="h-4 w-4 mr-1" />
          Accept Request
        </Button>
        <Button size="sm" variant="outline">
          View Details
        </Button>
      </div>
    </div>
  );
}

export default function AgentDashboard() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Agent Dashboard</h1>
              <p className="text-muted-foreground">Welcome back, Sarah!</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="success" className="flex items-center gap-1">
                <Star className="h-3 w-3" />
                Star Agent
              </Badge>
              <Link href="/dashboard/availability">
                <Button variant="outline" size="sm">
                  <Clock className="h-4 w-4 mr-2" />
                  Set Availability
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div className="space-y-8">
          {/* Stats Grid */}
          <div className="grid gap-4 md:grid-cols-4">
            <StatCard
              title="Pending Requests"
              value={mockRequests.length}
              description="Awaiting response"
              icon={<Inbox className="h-5 w-5" />}
              color="blue"
            />
            <StatCard
              title="Active Bookings"
              value={mockActiveBookings.length}
              description="In progress"
              icon={<Calendar className="h-5 w-5" />}
              color="green"
              trend="+2 this week"
            />
            <StatCard
              title="This Month Commission"
              value="₹1,03,000"
              description="From 8 bookings"
              icon={<DollarSign className="h-5 w-5" />}
              color="purple"
              trend="+18% from last month"
            />
            <StatCard
              title="Client Rating"
              value="4.9"
              description="From 45 reviews"
              icon={<Star className="h-5 w-5" />}
              color="yellow"
            />
          </div>

          {/* Main Content */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* New Requests - 2 columns */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>New Requests</CardTitle>
                      <CardDescription>Potential trips matching your expertise</CardDescription>
                    </div>
                    <Link href="/dashboard/requests">
                      <Button variant="outline" size="sm">View All</Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {mockRequests.map((request) => (
                      <RequestCard key={request.id} request={request} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar - 1 column */}
            <div className="space-y-6">
              {/* Active Bookings */}
              <Card>
                <CardHeader>
                  <CardTitle>Active Bookings</CardTitle>
                  <CardDescription>Trips in progress</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {mockActiveBookings.map((booking) => (
                      <div key={booking.id} className="border-b last:border-0 pb-4 last:pb-0">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <p className="font-medium">{booking.destination}</p>
                            <p className="text-sm text-muted-foreground">{booking.client}</p>
                          </div>
                          <Badge variant="success" className="text-xs">
                            {booking.status === 'confirmed' ? 'Confirmed' : 'Pending'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">{booking.dates}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-green-600">
                            ₹{(booking.commission / 100).toFixed(0)} commission
                          </span>
                          <Link href={`/dashboard/bookings/${booking.id}`}>
                            <Button size="sm" variant="ghost" className="text-xs h-7">
                              View →
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Link href="/dashboard/itineraries/new" className="block">
                      <Button variant="outline" className="w-full justify-start" size="sm">
                        <FileText className="h-4 w-4 mr-2" />
                        Create Itinerary
                      </Button>
                    </Link>
                    <Link href="/dashboard/requests" className="block">
                      <Button variant="outline" className="w-full justify-start" size="sm">
                        <Inbox className="h-4 w-4 mr-2" />
                        Browse All Requests
                      </Button>
                    </Link>
                    <Link href="/dashboard/bookings" className="block">
                      <Button variant="outline" className="w-full justify-start" size="sm">
                        <Calendar className="h-4 w-4 mr-2" />
                        Manage Bookings
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>

              {/* Performance Tips */}
              <Card className="bg-blue-50 border-blue-200">
                <CardHeader>
                  <CardTitle className="text-blue-900">⚡ Performance Tip</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-blue-800">
                    Respond to requests within 4 hours to improve your acceptance rate and maintain your Star Agent status!
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
