'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Plus, Filter, Search, Calendar, Users, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useUserSession } from '@/lib/user/session';
import { fetchUserRequests, type TravelRequest } from '@/lib/data/api';

export default function RequestsPage() {
  const { user, loading: userLoading } = useUserSession();
  const [requests, setRequests] = useState<TravelRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    if (!user?.userId) return;
    let cancelled = false;

    const loadRequests = async () => {
      setLoading(true);
      try {
        const data = await fetchUserRequests(user.userId);
        if (cancelled) return;
        setRequests(data);
      } catch (error) {
        if (cancelled) return;
        console.error('Error loading requests:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadRequests();
    return () => { cancelled = true; };
  }, [user?.userId]);

  // Filter requests based on search and status
  const filteredRequests = requests.filter(request => {
    const matchesSearch = searchQuery === '' || 
      (request.destination?.label || request.destination?.city || request.title || '')
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || request.state === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">My Requests</h1>
          <p className="text-muted-foreground">Manage your travel requests</p>
        </div>
        <Link href="/requests/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Request
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by destination..." 
            className="pl-10" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['all', 'DRAFT', 'SUBMITTED', 'MATCHING', 'PROPOSALS_RECEIVED', 'BOOKED'].map((status) => (
            <Button
              key={status}
              variant={filterStatus === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus(status)}
            >
              {status === 'all' ? 'All' : getStatusLabel(status)}
            </Button>
          ))}
        </div>
      </div>

      {/* Requests List */}
      <div className="space-y-4">
        {filteredRequests.map((request) => (
          <Card key={request.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-semibold">
                      {request.destination?.label || request.destination?.city || request.title}
                    </h3>
                    <StatusBadge status={request.state} />
                  </div>
                  <p className="text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {formatDateRange(request.departureDate, request.returnDate)}
                  </p>
                  <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {getTravelersCount(request.travelers)} traveler{getTravelersCount(request.travelers) !== 1 ? 's' : ''}
                    </span>
                    {request.budgetMax && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          {formatBudget(request.budgetMin, request.budgetMax)}
                        </span>
                      </>
                    )}
                    <span>•</span>
                    <span>Created: {formatDate(request.createdAt)}</span>
                  </div>
                </div>
                
                <div className="text-right">
                  {!['DRAFT', 'CANCELLED', 'EXPIRED'].includes(request.state) && (
                    <p className="text-sm mb-2">
                      <span className="text-2xl font-bold text-blue-600">{request.agentsResponded || 0}</span>
                      <span className="text-muted-foreground"> agent{(request.agentsResponded || 0) !== 1 ? 's' : ''} responded</span>
                    </p>
                  )}
                  <Link href={`/dashboard/requests/${request.id}`}>
                    <Button variant={request.state === 'PROPOSALS_RECEIVED' ? 'default' : 'outline'}>
                      {request.state === 'DRAFT' && 'Complete Request'}
                      {request.state === 'SUBMITTED' && 'View Status'}
                      {request.state === 'MATCHING' && 'View Status'}
                      {request.state === 'PROPOSALS_RECEIVED' && 'Compare Options'}
                      {request.state === 'BOOKED' && 'View Details'}
                      {request.state === 'COMPLETED' && 'View Details'}
                      {request.state === 'CANCELLED' && 'View Details'}
                      {request.state === 'EXPIRED' && 'View Details'}
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredRequests.length === 0 && !loading && (
        <Card>
          <CardContent className="py-12 text-center">
            {requests.length === 0 ? (
              <>
                <p className="text-muted-foreground mb-4">You haven&apos;t created any travel requests yet.</p>
                <Link href="/requests/new">
                  <Button>Create Your First Request</Button>
                </Link>
              </>
            ) : (
              <p className="text-muted-foreground">No requests match your filters.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    DRAFT: 'Draft',
    SUBMITTED: 'Submitted',
    MATCHING: 'Matching',
    PROPOSALS_RECEIVED: 'Proposals',
    BOOKED: 'Booked',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
    EXPIRED: 'Expired',
  };
  return labels[status] || status;
}

function formatDateRange(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const startMonth = startDate.toLocaleDateString('en-US', { month: 'short' });
  const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' });
  
  if (startMonth === endMonth) {
    return `${startMonth} ${startDate.getDate()} - ${endDate.getDate()}, ${endDate.getFullYear()}`;
  }
  return `${startMonth} ${startDate.getDate()} - ${endMonth} ${endDate.getDate()}, ${endDate.getFullYear()}`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatBudget(min: number | null, max: number | null): string {
  if (min && max) {
    return `₹${min.toLocaleString('en-IN')} - ₹${max.toLocaleString('en-IN')}`;
  }
  if (max) return `Up to ₹${max.toLocaleString('en-IN')}`;
  if (min) return `From ₹${min.toLocaleString('en-IN')}`;
  return 'Flexible';
}

function getTravelersCount(travelers: { adults?: number; children?: number; infants?: number; total?: number }): number {
  if (travelers.total) return travelers.total;
  return (travelers.adults || 0) + (travelers.children || 0) + (travelers.infants || 0);
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    DRAFT: { label: 'Draft', variant: 'secondary' },
    SUBMITTED: { label: 'Submitted', variant: 'default' },
    MATCHING: { label: 'Finding Agents', variant: 'default' },
    PROPOSALS_RECEIVED: { label: 'Select Option', variant: 'outline' },
    BOOKED: { label: 'Booked', variant: 'default' },
    COMPLETED: { label: 'Completed', variant: 'default' },
    CANCELLED: { label: 'Cancelled', variant: 'destructive' },
    EXPIRED: { label: 'Expired', variant: 'secondary' },
  };

  const config = variants[status] || { label: status, variant: 'secondary' as const };
  
  // Custom styling for specific statuses
  const customClasses: Record<string, string> = {
    MATCHING: 'bg-blue-100 text-blue-700 animate-pulse',
    PROPOSALS_RECEIVED: 'bg-amber-100 text-amber-700 border-amber-200',
    BOOKED: 'bg-green-100 text-green-700',
    COMPLETED: 'bg-green-100 text-green-700',
  };
  
  return (
    <Badge 
      variant={config.variant} 
      className={customClasses[status] || ''}
    >
      {config.label}
    </Badge>
  );
}
