'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { 
  Plus, 
  Search, 
  Calendar, 
  Users, 
  Loader2,
  MapPin,
  Wallet,
  ChevronRight,
  Sparkles,
  Clock,
  Globe,
  Plane,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';
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
        <div className="text-center">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur-xl opacity-30 animate-pulse" />
            <Loader2 className="relative h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          </div>
          <p className="text-slate-500 font-medium">Loading your requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl p-8 text-white shadow-2xl">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtOS45NCAwLTE4IDguMDYtMTggMThzOC4wNiAxOCAxOCAxOCAxOC04LjA2IDE4LTE4LTguMDYtMTgtMTgtMTh6bTAgMzJjLTcuNzMyIDAtMTQtNi4yNjgtMTQtMTRzNi4yNjgtMTQgMTQtMTQgMTQgNi4yNjggMTQgMTQtNi4yNjggMTQtMTQgMTR6IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9Ii4wNSIvPjwvZz48L3N2Zz4=')] opacity-30" />
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
              <Globe className="h-10 w-10" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold">My Travel Requests</h1>
              <p className="text-blue-100 mt-1">Track and manage all your trip requests</p>
            </div>
          </div>
          <Link href="/requests/new">
            <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50 shadow-lg font-semibold h-12 px-6">
              <Plus className="h-5 w-5 mr-2" />
              New Request
            </Button>
          </Link>
        </div>

        {/* Quick Stats */}
        <div className="relative mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <p className="text-blue-100 text-sm">Total Requests</p>
            <p className="text-2xl font-bold">{requests.length}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <p className="text-blue-100 text-sm">Active</p>
            <p className="text-2xl font-bold">{requests.filter(r => ['SUBMITTED', 'MATCHING', 'PROPOSALS_RECEIVED'].includes(r.state)).length}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <p className="text-blue-100 text-sm">With Proposals</p>
            <p className="text-2xl font-bold">{requests.filter(r => r.state === 'PROPOSALS_RECEIVED').length}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <p className="text-blue-100 text-sm">Booked</p>
            <p className="text-2xl font-bold">{requests.filter(r => ['BOOKED', 'COMPLETED'].includes(r.state)).length}</p>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <Input 
            placeholder="Search by destination..." 
            className="pl-12 h-12 border-slate-200 bg-white shadow-sm" 
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
              className={filterStatus === status 
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 border-0' 
                : 'hover:bg-slate-50'
              }
            >
              {status === 'all' ? 'All' : getStatusLabel(status)}
            </Button>
          ))}
        </div>
      </div>

      {/* Requests List */}
      <div className="space-y-4">
        {filteredRequests.map((request) => {
          const tripDays = getTripDuration(request.departureDate, request.returnDate);
          const travelersCount = getTravelersCount(request.travelers);
          
          return (
            <Link key={request.id} href={`/dashboard/requests/${request.id}`} className="block group">
              <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group-hover:-translate-y-1">
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row">
                    {/* Left Color Strip */}
                    <div className={`w-full md:w-2 h-2 md:h-auto ${getStatusColor(request.state)}`} />
                    
                    <div className="flex-1 p-6">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        {/* Main Content */}
                        <div className="flex-1 space-y-4">
                          {/* Header with destination */}
                          <div className="flex items-start gap-3">
                            <div className={`p-3 rounded-xl ${getStatusBgColor(request.state)}`}>
                              <MapPin className={`h-6 w-6 ${getStatusIconColor(request.state)}`} />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-3 flex-wrap">
                                <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                                  {getDestination(request)}
                                </h3>
                                <StatusBadge status={request.state} />
                              </div>
                              <p className="text-slate-500 text-sm mt-1">
                                Request #{request.id.slice(0, 8)}
                              </p>
                            </div>
                          </div>

                          {/* Trip Details Grid */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="flex items-center gap-2 text-slate-600">
                              <Calendar className="h-4 w-4 text-blue-500" />
                              <span className="text-sm">{formatDateRange(request.departureDate, request.returnDate)}</span>
                            </div>
                            {tripDays && (
                              <div className="flex items-center gap-2 text-slate-600">
                                <Clock className="h-4 w-4 text-purple-500" />
                                <span className="text-sm">{tripDays} days</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2 text-slate-600">
                              <Users className="h-4 w-4 text-green-500" />
                              <span className="text-sm">{travelersCount} traveler{travelersCount !== 1 ? 's' : ''}</span>
                            </div>
                            {request.budgetMax && (
                              <div className="flex items-center gap-2 text-slate-600">
                                <Wallet className="h-4 w-4 text-amber-500" />
                                <span className="text-sm">{formatBudget(request.budgetMin, request.budgetMax)}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Right Side - Stats & Action */}
                        <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-start gap-4 pt-4 md:pt-0 border-t md:border-t-0 md:border-l md:pl-6">
                          {!['DRAFT', 'CANCELLED', 'EXPIRED'].includes(request.state) && (
                            <div className="text-center md:text-right">
                              <div className="flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-amber-500" />
                                <span className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                  {request.agentsResponded || 0}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 mt-1">
                                agent{(request.agentsResponded || 0) !== 1 ? 's' : ''} responded
                              </p>
                            </div>
                          )}
                          <Button 
                            variant={request.state === 'PROPOSALS_RECEIVED' ? 'default' : 'outline'}
                            className={request.state === 'PROPOSALS_RECEIVED' 
                              ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700' 
                              : 'group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:border-blue-200'
                            }
                          >
                            {getButtonText(request.state)}
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {filteredRequests.length === 0 && !loading && (
        <Card className="border-0 shadow-lg">
          <CardContent className="py-16 text-center">
            {requests.length === 0 ? (
              <div className="space-y-4">
                <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
                  <Plane className="h-10 w-10 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900">No travel requests yet</h3>
                <p className="text-slate-500 max-w-sm mx-auto">
                  Start your journey by creating your first travel request. Our expert agents will help plan your perfect trip!
                </p>
                <Link href="/requests/new">
                  <Button size="lg" className="mt-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                    <Plus className="h-5 w-5 mr-2" />
                    Create Your First Request
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="mx-auto w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center">
                  <Search className="h-10 w-10 text-slate-400" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900">No matching requests</h3>
                <p className="text-slate-500">Try adjusting your search or filter criteria.</p>
                <Button variant="outline" onClick={() => { setSearchQuery(''); setFilterStatus('all'); }}>
                  Clear Filters
                </Button>
              </div>
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

function getDestination(request: TravelRequest): string {
  if (typeof request.destination === 'string') {
    return request.destination;
  }
  return request.destination?.label || request.destination?.city || request.title || 'Unknown';
}

function getButtonText(status: string): string {
  const texts: Record<string, string> = {
    DRAFT: 'Complete',
    SUBMITTED: 'View Status',
    MATCHING: 'View Status',
    PROPOSALS_RECEIVED: 'Compare Options',
    BOOKED: 'View Details',
    COMPLETED: 'View Details',
    CANCELLED: 'View Details',
    EXPIRED: 'View Details',
  };
  return texts[status] || 'View';
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    DRAFT: 'bg-slate-400',
    SUBMITTED: 'bg-blue-500',
    MATCHING: 'bg-indigo-500',
    PROPOSALS_RECEIVED: 'bg-amber-500',
    BOOKED: 'bg-green-500',
    COMPLETED: 'bg-emerald-500',
    CANCELLED: 'bg-red-500',
    EXPIRED: 'bg-slate-500',
  };
  return colors[status] || 'bg-slate-400';
}

function getStatusBgColor(status: string): string {
  const colors: Record<string, string> = {
    DRAFT: 'bg-slate-100',
    SUBMITTED: 'bg-blue-100',
    MATCHING: 'bg-indigo-100',
    PROPOSALS_RECEIVED: 'bg-amber-100',
    BOOKED: 'bg-green-100',
    COMPLETED: 'bg-emerald-100',
    CANCELLED: 'bg-red-100',
    EXPIRED: 'bg-slate-100',
  };
  return colors[status] || 'bg-slate-100';
}

function getStatusIconColor(status: string): string {
  const colors: Record<string, string> = {
    DRAFT: 'text-slate-600',
    SUBMITTED: 'text-blue-600',
    MATCHING: 'text-indigo-600',
    PROPOSALS_RECEIVED: 'text-amber-600',
    BOOKED: 'text-green-600',
    COMPLETED: 'text-emerald-600',
    CANCELLED: 'text-red-600',
    EXPIRED: 'text-slate-600',
  };
  return colors[status] || 'text-slate-600';
}

function getTripDuration(start: string, end: string): number | null {
  if (!start || !end) return null;
  const startDate = new Date(start);
  const endDate = new Date(end);
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  return days > 0 ? days : null;
}

function formatDateRange(start: string, end: string): string {
  if (!start || !end) return 'Dates not set';
  const startDate = new Date(start);
  const endDate = new Date(end);
  const startMonth = startDate.toLocaleDateString('en-US', { month: 'short' });
  const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' });
  
  if (startMonth === endMonth) {
    return `${startMonth} ${startDate.getDate()} - ${endDate.getDate()}, ${endDate.getFullYear()}`;
  }
  return `${startMonth} ${startDate.getDate()} - ${endMonth} ${endDate.getDate()}, ${endDate.getFullYear()}`;
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
  if (!travelers) return 1;
  if (travelers.total) return travelers.total;
  return (travelers.adults || 0) + (travelers.children || 0) + (travelers.infants || 0) || 1;
}

function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
    DRAFT: { 
      label: 'Draft', 
      icon: null,
      className: 'bg-slate-100 text-slate-700 border-slate-200' 
    },
    SUBMITTED: { 
      label: 'Submitted', 
      icon: <CheckCircle className="h-3 w-3" />,
      className: 'bg-blue-100 text-blue-700 border-blue-200' 
    },
    MATCHING: { 
      label: 'Finding Agents', 
      icon: <Sparkles className="h-3 w-3 animate-pulse" />,
      className: 'bg-indigo-100 text-indigo-700 border-indigo-200 animate-pulse' 
    },
    PROPOSALS_RECEIVED: { 
      label: 'Review Proposals', 
      icon: <AlertCircle className="h-3 w-3" />,
      className: 'bg-amber-100 text-amber-700 border-amber-200 font-semibold' 
    },
    BOOKED: { 
      label: 'Booked', 
      icon: <CheckCircle className="h-3 w-3" />,
      className: 'bg-green-100 text-green-700 border-green-200' 
    },
    COMPLETED: { 
      label: 'Completed', 
      icon: <CheckCircle className="h-3 w-3" />,
      className: 'bg-emerald-100 text-emerald-700 border-emerald-200' 
    },
    CANCELLED: { 
      label: 'Cancelled', 
      icon: <XCircle className="h-3 w-3" />,
      className: 'bg-red-100 text-red-700 border-red-200' 
    },
    EXPIRED: { 
      label: 'Expired', 
      icon: <Clock className="h-3 w-3" />,
      className: 'bg-slate-100 text-slate-600 border-slate-200' 
    },
  };

  const config = configs[status] || { label: status, icon: null, className: 'bg-slate-100 text-slate-700' };
  
  return (
    <Badge variant="outline" className={`${config.className} flex items-center gap-1`}>
      {config.icon}
      {config.label}
    </Badge>
  );
}
