'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  Filter,
  MapPin,
  Calendar,
  DollarSign,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  ArrowRight,
  Sparkles,
  Target,
  ChevronDown,
  SlidersHorizontal,
  Globe,
  Heart,
} from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Input,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Textarea,
} from '@/components/ui';
import { cn } from '@/lib/utils';
import { useAgentSession } from '@/lib/agent/session';
import {
  acceptMatch,
  declineMatch,
  listMatchedRequests,
  type AgentRequestMatch,
} from '@/lib/data/agent';

type RequestVM = {
  matchId: string;
  requestId: string;
  destination: string;
  country: string;
  region: string;
  dates: { start: string; end: string; flexibility: string };
  budget: { min: number; max: number; currency: string };
  travelers: { adults: number; children: number; infants: number };
  travelStyle: string;
  interests: string[];
  description: string;
  requirements: string[];
  receivedAt: string;
  expiresAt: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired' | string;
  matchScore: number;
  client: { firstName: string; avatarUrl: string | null };
};

function titleize(value: string): string {
  return String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function toRequestVM(match: AgentRequestMatch): RequestVM {
  const req = match.request;
  
  // Parse destination - handle JSON string
  let dest: any = req?.destination ?? {};
  if (typeof dest === 'string') {
    try {
      dest = JSON.parse(dest);
    } catch {
      dest = {};
    }
  }
  
  const regions: string[] = Array.isArray(dest?.regions) ? dest.regions.filter(Boolean) : [];
  const country = typeof dest?.country === 'string' ? dest.country : '—';

  const destinationTitle =
    regions.length === 1
      ? regions[0]
      : regions.length > 1
      ? `${regions[0]} +${regions.length - 1}`
      : req?.title ?? country;

  // Parse travelers - handle JSON string
  let travelers: any = req?.travelers ?? {};
  if (typeof travelers === 'string') {
    try {
      travelers = JSON.parse(travelers);
    } catch {
      travelers = {};
    }
  }

  // Parse preferences - handle JSON string
  let preferences: any = req?.preferences ?? {};
  if (typeof preferences === 'string') {
    try {
      preferences = JSON.parse(preferences);
    } catch {
      preferences = {};
    }
  }
  
  const interests = Array.from(
    new Set<string>([
      ...regions,
      ...(Array.isArray(preferences?.special_occasions) ? preferences.special_occasions.map(titleize) : []),
      ...(typeof preferences?.accommodation_type === 'string' ? [titleize(preferences.accommodation_type)] : []),
    ].filter(Boolean))
  ).slice(0, 6);

  const requirements = Array.from(
    new Set<string>([
      ...(Array.isArray(preferences?.dietary_restrictions) ? preferences.dietary_restrictions.map(titleize) : []),
    ].filter(Boolean))
  ).slice(0, 4);

  const receivedAt = match.matchedAt ?? req?.created_at ?? new Date().toISOString();
  const expiresAt = match.expiresAt ?? req?.expires_at ?? new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

  return {
    matchId: match.matchId,
    requestId: match.requestId,
    destination: destinationTitle,
    country,
    region: regions.length > 0 ? regions.join(', ') : '—',
    dates: {
      start: req?.departure_date,
      end: req?.return_date,
      flexibility: typeof dest?.flexibility === 'string' ? dest.flexibility : 'exact',
    },
    budget: {
      min: Number(req?.budget_min ?? 0),
      max: Number(req?.budget_max ?? 0),
      currency: req?.budget_currency ?? 'INR',
    },
    travelers: {
      adults: Number(travelers?.adults ?? 0),
      children: Number(travelers?.children ?? 0),
      infants: Number(travelers?.infants ?? 0),
    },
    travelStyle: req?.travel_style ?? '—',
    interests,
    description: req?.description ?? '—',
    requirements,
    receivedAt,
    expiresAt,
    status: match.status,
    matchScore: match.matchScore ?? 0,
    client: {
      firstName: match.user ? `${match.user.first_name}` : 'Client',
      avatarUrl: match.user?.avatar_url ?? null,
    },
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
  }).format(cents);
}

function formatDateRange(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
  return `${startDate.toLocaleDateString('en-US', options)} - ${endDate.toLocaleDateString('en-US', options)}`;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

function getTimeRemaining(expiresAt: string): string {
  const expires = new Date(expiresAt);
  const now = new Date();
  const diffMs = expires.getTime() - now.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${mins}m`;
}

function getTravelStyleLabel(style: string): string {
  const labels: Record<string, string> = {
    budget: 'Budget',
    mid_range: 'Mid-Range',
    luxury: 'Luxury',
    ultra_luxury: 'Ultra Luxury',
    adventure: 'Adventure',
  };
  return labels[style] || style;
}

function getFlexibilityLabel(flex: string): string {
  const labels: Record<string, string> = {
    exact: 'Exact dates',
    flexible_1_3_days: '± 1-3 days',
    flexible_week: '± 1 week',
    flexible_month: 'Flexible month',
    somewhat_flexible: 'Somewhat flexible',
  };
  return labels[flex] || flex;
}

// ============================================================================
// COMPONENTS
// ============================================================================

function RequestCard({ 
  request, 
  onAccept, 
  onDecline, 
  onViewDetails,
  busy,
}: {
  request: RequestVM;
  onAccept: () => void;
  onDecline: () => void;
  onViewDetails: () => void;
  busy?: boolean;
}) {
  const isAccepted = request.status === 'accepted';
  const isExpiringSoon = new Date(request.expiresAt).getTime() - Date.now() < 4 * 60 * 60 * 1000;

  return (
    <Card className={cn(
      'group transition-all duration-200 hover:shadow-lg',
      isAccepted && 'border-green-200 bg-green-50/30',
      isExpiringSoon && !isAccepted && 'border-amber-200'
    )}>
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h3 className="text-xl font-semibold text-gray-900">{request.destination}</h3>
              <div className="flex items-center gap-1 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 px-2.5 py-0.5 text-xs font-semibold text-white">
                <Target className="h-3 w-3" />
                {request.matchScore}%
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Globe className="h-4 w-4" />
              <span>{request.country}</span>
              <span>•</span>
              <span>{request.region}</span>
            </div>
          </div>
          <div className="text-right">
            {isAccepted ? (
              <Badge variant="success">Accepted</Badge>
            ) : (
              <Badge variant={isExpiringSoon ? 'warning' : 'outline'} className="gap-1">
                <Clock className="h-3 w-3" />
                {getTimeRemaining(request.expiresAt)}
              </Badge>
            )}
            <p className="mt-1 text-xs text-gray-400">Received {formatRelativeTime(request.receivedAt)}</p>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="text-xs text-gray-500 mb-1">Travel Dates</p>
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">{formatDateRange(request.dates.start, request.dates.end)}</span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">{getFlexibilityLabel(request.dates.flexibility)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Budget</p>
            <div className="flex items-center gap-1.5">
              <DollarSign className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">{formatCurrency(request.budget.min)} - {formatCurrency(request.budget.max)}</span>
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Travelers</p>
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium">
                {request.travelers.adults} adult{request.travelers.adults > 1 ? 's' : ''}
                {request.travelers.children > 0 && `, ${request.travelers.children} child${request.travelers.children > 1 ? 'ren' : ''}`}
              </span>
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Style</p>
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium">{getTravelStyleLabel(request.travelStyle)}</span>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="mb-4">
          <p className="text-sm text-gray-600 line-clamp-2">{request.description}</p>
        </div>

        {/* Interests */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {request.interests.map((interest) => (
            <Badge key={interest} variant="secondary" className="text-xs">
              {interest}
            </Badge>
          ))}
        </div>

        {/* Requirements Preview */}
        {request.requirements.length > 0 && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-100 rounded-lg">
            <p className="text-xs font-medium text-amber-800 mb-1">Special Requirements:</p>
            <p className="text-xs text-amber-700">{request.requirements.join(' • ')}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t border-gray-100">
          {!isAccepted && (
            <>
              <Button
                onClick={onAccept}
                disabled={busy}
                className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Accept Request
              </Button>
              <Button onClick={onDecline} disabled={busy} variant="outline">
                <XCircle className="mr-2 h-4 w-4" />
                Decline
              </Button>
            </>
          )}
          {isAccepted && (
            <Link href={`/itineraries/new?requestId=${request.requestId}`} className="flex-1">
              <Button className="w-full">
                Create Itinerary
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          )}
          <Button variant="ghost" onClick={onViewDetails}>
            View Details
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function DeclineDialog({ 
  open, 
  onClose, 
  onConfirm, 
  requestId 
}: { 
  open: boolean; 
  onClose: () => void; 
  onConfirm: (reason: string) => void;
  requestId: string;
}) {
  const [reason, setReason] = useState('');

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Decline Request</DialogTitle>
          <DialogDescription>
            Please provide a reason for declining this request. This helps us improve our matching algorithm.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Textarea
            placeholder="e.g., Dates conflict with existing booking, Destination not in my expertise area..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            variant="destructive" 
            onClick={() => {
              onConfirm(reason);
              onClose();
            }}
          >
            Decline Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function RequestsPage() {
  const { agent } = useAgentSession();
  const router = useRouter();

  const [requests, setRequests] = useState<RequestVM[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyMatchIds, setBusyMatchIds] = useState<Set<string>>(new Set());

  const [activeTab, setActiveTab] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('match_score');
  const [declineDialogOpen, setDeclineDialogOpen] = useState(false);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);

  const loadRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const matches = await listMatchedRequests(agent.agentId);
      setRequests(matches.map(toRequestVM));
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load matched requests');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent.agentId]);

  const filteredRequests = useMemo(() => {
    return requests.filter((request) => {
    // Tab filter
    if (activeTab === 'pending' && request.status !== 'pending') return false;
    if (activeTab === 'accepted' && request.status !== 'accepted') return false;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        request.destination.toLowerCase().includes(query) ||
        request.country.toLowerCase().includes(query) ||
        request.interests.some((i) => i.toLowerCase().includes(query))
      );
    }

    return true;
    });
  }, [activeTab, requests, searchQuery]);

  // Sort
  const sortedRequests = useMemo(() => {
    return [...filteredRequests].sort((a, b) => {
    switch (sortBy) {
      case 'match_score':
        return (b.matchScore ?? 0) - (a.matchScore ?? 0);
      case 'budget_high':
        return b.budget.max - a.budget.max;
      case 'budget_low':
        return a.budget.min - b.budget.min;
      case 'date_newest':
        return new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime();
      case 'expires_soon':
        return new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime();
      default:
        return 0;
    }
    });
  }, [filteredRequests, sortBy]);

  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const acceptedCount = requests.filter((r) => r.status === 'accepted').length;

  const setBusy = (matchId: string, busy: boolean) => {
    setBusyMatchIds((prev) => {
      const next = new Set(prev);
      if (busy) next.add(matchId);
      else next.delete(matchId);
      return next;
    });
  };

  const handleAccept = async (matchId: string) => {
    setBusy(matchId, true);
    try {
      await acceptMatch(matchId);
      setRequests((prev) => prev.map((r) => (r.matchId === matchId ? { ...r, status: 'accepted' } : r)));
    } catch (e: any) {
      setError(e?.message ?? 'Failed to accept request');
    } finally {
      setBusy(matchId, false);
    }
  };

  const handleDecline = (matchId: string) => {
    setSelectedMatchId(matchId);
    setDeclineDialogOpen(true);
  };

  const confirmDecline = async (reason: string) => {
    if (!selectedMatchId) return;
    setBusy(selectedMatchId, true);
    try {
      await declineMatch(selectedMatchId, reason);
      setRequests((prev) => prev.map((r) => (r.matchId === selectedMatchId ? { ...r, status: 'declined' } : r)));
    } catch (e: any) {
      setError(e?.message ?? 'Failed to decline request');
    } finally {
      setBusy(selectedMatchId, false);
      setSelectedMatchId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Travel Requests</h1>
          <p className="mt-1 text-gray-500">
            Browse and manage requests matched to your expertise
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="pending">
                  New Requests
                  {pendingCount > 0 && (
                    <Badge variant="destructive" className="ml-2 h-5 min-w-5 px-1.5">
                      {pendingCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="accepted">
                  Accepted
                  {acceptedCount > 0 && (
                    <Badge variant="secondary" className="ml-2 h-5 min-w-5 px-1.5">
                      {acceptedCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="all">All</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Search & Sort */}
            <div className="flex gap-3">
              <div className="relative flex-1 lg:w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search destinations, interests..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-44">
                  <SlidersHorizontal className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="match_score">Best Match</SelectItem>
                  <SelectItem value="expires_soon">Expires Soon</SelectItem>
                  <SelectItem value="budget_high">Budget: High to Low</SelectItem>
                  <SelectItem value="budget_low">Budget: Low to High</SelectItem>
                  <SelectItem value="date_newest">Newest First</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {loading ? (
        <Card>
          <CardContent className="py-16 text-center text-gray-500">
            <p>Loading matched requests…</p>
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-gray-700 mb-4">{error}</p>
            <Button variant="outline" onClick={loadRequests}>Retry</Button>
          </CardContent>
        </Card>
      ) : sortedRequests.length > 0 ? (
        <div className="space-y-4">
          {sortedRequests.map((request) => (
            <RequestCard
              key={request.matchId}
              request={request}
              onAccept={() => handleAccept(request.matchId)}
              onDecline={() => handleDecline(request.matchId)}
              onViewDetails={() => router.push(`/requests/${request.requestId}`)}
              busy={busyMatchIds.has(request.matchId)}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Search className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No requests found</h3>
            <p className="text-gray-500">
              {searchQuery
                ? 'Try adjusting your search terms'
                : activeTab === 'pending'
                ? 'New requests matching your profile will appear here'
                : 'No requests in this category'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Decline Dialog */}
      <DeclineDialog
        open={declineDialogOpen}
        onClose={() => setDeclineDialogOpen(false)}
        onConfirm={confirmDecline}
        requestId={selectedMatchId || ''}
      />
    </div>
  );
}
