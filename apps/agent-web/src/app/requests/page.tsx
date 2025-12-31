'use client';

import Link from 'next/link';
import { useState } from 'react';
import { 
  MapPin, 
  Calendar, 
  Users, 
  DollarSign, 
  Tag,
  CheckCircle,
  XCircle,
  Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Mock data
const allRequests = [
  {
    id: 'R001',
    destination: 'Rajasthan, India',
    dates: 'Jun 15 - Jun 25, 2025',
    budget: { min: 800000, max: 1200000 },
    status: 'pending',
    travelers: 2,
    specialties: ['Luxury', 'Honeymoon', 'Heritage'],
    description: 'Planning our honeymoon in Rajasthan. Looking for romantic palace stays, royal experiences, and luxury accommodations.',
    receivedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    client: { name: 'Rahul & Priya S.', email: 'rahul@example.com' },
  },
  {
    id: 'R002',
    destination: 'Kerala, India',
    dates: 'Jul 1 - Jul 14, 2025',
    budget: { min: 500000, max: 700000 },
    status: 'pending',
    travelers: 4,
    specialties: ['Family', 'Beach', 'Ayurveda'],
    description: 'Family vacation with two kids (8 and 12). Looking for houseboat stays, beach time, and nature experiences.',
    receivedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    client: { name: 'The Kumar Family', email: 'kumar@example.com' },
  },
  {
    id: 'R003',
    destination: 'Ladakh, India',
    dates: 'Aug 10 - Aug 20, 2025',
    budget: { min: 600000, max: 900000 },
    status: 'pending',
    travelers: 2,
    specialties: ['Adventure', 'Mountains', 'Trekking'],
    description: 'First trip to Ladakh. Interested in trekking, monastery visits, and scenic mountain experiences.',
    receivedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    client: { name: 'Amit P.', email: 'amit@example.com' },
  },
  {
    id: 'R004',
    destination: 'Goa, India',
    dates: 'Sep 5 - Sep 15, 2025',
    budget: { min: 700000, max: 1000000 },
    status: 'accepted',
    travelers: 2,
    specialties: ['Beach', 'Romance', 'Nightlife'],
    description: 'Anniversary trip seeking beautiful beaches, amazing food, and romantic sunsets.',
    receivedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    client: { name: 'Vikram & Sneha G.', email: 'vikram@example.com' },
  },
];

function RequestDetailCard({ request, onAccept, onDecline }: {
  request: typeof allRequests[0];
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(cents / 100);
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    return `${Math.floor(diffInHours / 24)} days ago`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="warning">New Request</Badge>;
      case 'accepted':
        return <Badge variant="success">Accepted</Badge>;
      case 'declined':
        return <Badge variant="destructive">Declined</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card className={expanded ? 'shadow-lg' : ''}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <CardTitle className="text-xl">{request.destination}</CardTitle>
              {getStatusBadge(request.status)}
            </div>
            <CardDescription>Request #{request.id} · {formatTimeAgo(request.receivedAt)}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Travel Dates</p>
              <p className="text-sm font-medium">{request.dates}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Travelers</p>
              <p className="text-sm font-medium">{request.travelers} people</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Budget</p>
              <p className="text-sm font-medium">
                {formatCurrency(request.budget.min)} - {formatCurrency(request.budget.max)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Type</p>
              <p className="text-sm font-medium">{request.specialties[0]}</p>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <p className="text-sm text-muted-foreground mb-2">Interests & Preferences</p>
          <div className="flex flex-wrap gap-2">
            {request.specialties.map((specialty) => (
              <Badge key={specialty} variant="outline">
                {specialty}
              </Badge>
            ))}
          </div>
        </div>

        {expanded && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium mb-2">Client Requirements:</p>
            <p className="text-sm text-gray-700">{request.description}</p>
            <div className="mt-3 pt-3 border-t">
              <p className="text-xs text-muted-foreground">Client: {request.client.name}</p>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          {request.status === 'pending' && (
            <>
              <Button
                size="sm"
                onClick={() => onAccept(request.id)}
                className="flex-1"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Accept Request
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onDecline(request.id)}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Decline
              </Button>
            </>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setExpanded(!expanded)}
          >
            <Eye className="h-4 w-4 mr-1" />
            {expanded ? 'Less' : 'More'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function RequestsPage() {
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted' | 'declined'>('all');
  
  const handleAccept = (id: string) => {
    console.log('Accepting request:', id);
    // TODO: Implement API call
  };

  const handleDecline = (id: string) => {
    console.log('Declining request:', id);
    // TODO: Implement API call
  };

  const filteredRequests = allRequests.filter(req => 
    filter === 'all' || req.status === filter
  );

  const stats = {
    pending: allRequests.filter(r => r.status === 'pending').length,
    accepted: allRequests.filter(r => r.status === 'accepted').length,
    declined: allRequests.filter(r => r.status === 'declined').length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-1">Travel Requests</h1>
              <p className="text-muted-foreground">Review and respond to incoming trip requests</p>
            </div>
            <Link href="/dashboard">
              <Button variant="outline">← Back to Dashboard</Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div className="space-y-6">
          {/* Filter Tabs */}
          <Card>
            <CardContent className="p-4">
              <div className="flex gap-2">
                <Button
                  variant={filter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('all')}
                >
                  All Requests ({allRequests.length})
                </Button>
                <Button
                  variant={filter === 'pending' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('pending')}
                >
                  Pending ({stats.pending})
                </Button>
                <Button
                  variant={filter === 'accepted' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('accepted')}
                >
                  Accepted ({stats.accepted})
                </Button>
                <Button
                  variant={filter === 'declined' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('declined')}
                >
                  Declined ({stats.declined})
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Requests List */}
          <div className="space-y-4">
            {filteredRequests.length > 0 ? (
              filteredRequests.map((request) => (
                <RequestDetailCard
                  key={request.id}
                  request={request}
                  onAccept={handleAccept}
                  onDecline={handleDecline}
                />
              ))
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <p className="text-muted-foreground">No requests found</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
