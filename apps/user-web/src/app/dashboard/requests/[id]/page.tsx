'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Users,
  Clock,
  MessageSquare,
  FileText,
  Loader2,
  Wallet,
  Sparkles,
  Globe,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronRight,
  Star,
  Palmtree,
  Mountain,
  Briefcase,
  Heart,
  Camera,
  Utensils,
  Share2,
  Edit,
  RefreshCw,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useUserSession } from '@/lib/user/session';
import { fetchRequest, cancelTravelRequest, type TravelRequest } from '@/lib/data/api';
import { useRequestUpdates } from '@/lib/realtime';

const tripTypeIcons: Record<string, React.ElementType> = {
  leisure: Palmtree,
  adventure: Mountain,
  business: Briefcase,
  honeymoon: Heart,
  cultural: Camera,
  culinary: Utensils,
};

export default function RequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const requestId = params.id as string;
  const { user, loading: userLoading } = useUserSession();
  const [request, setRequest] = useState<TravelRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Callback to refresh request data
  const refreshRequest = useCallback(async () => {
    try {
      const data = await fetchRequest(requestId);
      if (data) {
        setRequest(data);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Error refreshing request:', error);
    }
  }, [requestId]);

  // Real-time updates hook
  const {
    isConnected: realtimeConnected,
    isPolling: realtimePolling,
    lastEvent,
  } = useRequestUpdates({
    requestId,
    userId: user?.userId,
    enabled: !!request && !['completed', 'cancelled', 'expired', 'COMPLETED', 'CANCELLED', 'EXPIRED'].includes(request?.state || ''),
    onUpdate: (event) => {
      console.log('[RequestDetail] Realtime update received:', event);
      // Refresh request data when we receive an update
      refreshRequest();
    },
    pollInterval: 15000, // Poll every 15 seconds as fallback
  });

  // Initial load
  useEffect(() => {
    const loadRequest = async () => {
      setLoading(true);
      try {
        const data = await fetchRequest(requestId);
        setRequest(data);
        setLastUpdated(new Date());
      } catch (error) {
        console.error('Error loading request:', error);
      } finally {
        setLoading(false);
      }
    };

    loadRequest();
  }, [requestId]);

  // The old polling is now handled by useRequestUpdates hook with fallback polling
  // Keeping manual refresh function for user-initiated refreshes

  const handleCancelRequest = async () => {
    if (!request) return;
    
    setCancelling(true);
    try {
      await cancelTravelRequest(requestId);
      // Refresh the request data
      const updatedRequest = await fetchRequest(requestId);
      setRequest(updatedRequest);
      setLastUpdated(new Date());
      setShowCancelConfirm(false);
    } catch (error) {
      console.error('Error cancelling request:', error);
      setCancelError('Failed to cancel request. Please try again.');
      setTimeout(() => setCancelError(null), 5000);
    } finally {
      setCancelling(false);
    }
  };

  if (userLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-500">Loading request details...</p>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="bg-slate-100 rounded-full p-6 mb-4">
          <AlertCircle className="h-12 w-12 text-slate-400" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Request Not Found</h2>
        <p className="text-muted-foreground mb-6">The request you&apos;re looking for doesn&apos;t exist or has been removed.</p>
        <Link href="/dashboard/requests">
          <Button className="bg-gradient-to-r from-blue-600 to-purple-600">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Requests
          </Button>
        </Link>
      </div>
    );
  }

  const hasProposals = (request.agentsResponded ?? 0) > 0;
  const canEdit = ['draft', 'open', 'DRAFT', 'SUBMITTED'].includes(request.state);
  const isActive = !['completed', 'cancelled', 'expired', 'COMPLETED', 'CANCELLED', 'EXPIRED'].includes(request.state);
  const tripDuration = getTripDuration(request.departureDate, request.returnDate);
  const TripIcon = tripTypeIcons[request.travelStyle?.toLowerCase() || 'leisure'] || Globe;

  return (
    <div className="space-y-6 pb-8">
      {/* Back Button */}
      <Link href="/dashboard/requests" className="inline-flex items-center text-sm text-slate-500 hover:text-slate-900 group">
        <ArrowLeft className="h-4 w-4 mr-1 group-hover:-translate-x-1 transition-transform" />
        Back to Requests
      </Link>

      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl p-8 text-white shadow-2xl">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtOS45NCAwLTE4IDguMDYtMTggMThzOC4wNiAxOCAxOCAxOCAxOC04LjA2IDE4LTE4LTguMDYtMTgtMTgtMTh6bTAgMzJjLTcuNzMyIDAtMTQtNi4yNjgtMTQtMTRzNi4yNjgtMTQgMTQtMTQgMTQgNi4yNjggMTQgMTQtNi4yNjggMTQtMTQgMTR6IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9Ii4wNSIvPjwvZz48L3N2Zz4=')] opacity-30" />
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        
        <div className="relative">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                  <TripIcon className="h-8 w-8" />
                </div>
                <StatusBadge status={request.state} />
              </div>
              
              <h1 className="text-4xl font-bold mb-2">{getDestinationLabel(request)}</h1>
              
              <div className="flex flex-wrap gap-6 text-blue-100 mt-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  <span>{formatDateRange(request.departureDate, request.returnDate)}</span>
                </div>
                {tripDuration !== null && tripDuration > 0 && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    <span>{tripDuration} days</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  <span>{getTravelersCount(request.travelers)} travelers</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {hasProposals && (
                <Link href={`/dashboard/requests/${request.id}/proposals`}>
                  <Button size="lg" variant="secondary" className="shadow-xl group font-semibold">
                    <MessageSquare className="h-5 w-5 mr-2" />
                    View {request.agentsResponded} Proposal{request.agentsResponded !== 1 ? 's' : ''}
                    <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              )}
              {canEdit && (
                <Button 
                  size="lg" 
                  variant="secondary" 
                  className="bg-white/10 border-white/20 hover:bg-white/20"
                  onClick={() => router.push(`/requests/edit/${request.id}`)}
                >
                  <Edit className="h-5 w-5 mr-2" />
                  Edit
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Trip Details Card */}
          <Card className="border-0 shadow-lg overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50/50 border-b">
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <MapPin className="h-5 w-5 text-blue-600" />
                </div>
                Trip Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <DetailItem
                    icon={<Globe className="h-5 w-5 text-blue-600" />}
                    label="Destination"
                    value={getDestinationLabel(request)}
                  />
                  <DetailItem
                    icon={<Calendar className="h-5 w-5 text-purple-600" />}
                    label="Travel Dates"
                    value={formatDateRange(request.departureDate, request.returnDate)}
                    subtext={tripDuration ? `${tripDuration} days trip` : undefined}
                  />
                  <DetailItem
                    icon={<Users className="h-5 w-5 text-green-600" />}
                    label="Travelers"
                    value={getTravelersLabel(request.travelers)}
                  />
                </div>
                <div className="space-y-6">
                  <DetailItem
                    icon={<Wallet className="h-5 w-5 text-emerald-600" />}
                    label="Budget"
                    value={formatBudget(request.budgetMin, request.budgetMax)}
                    highlight
                  />
                  {request.travelStyle && (
                    <DetailItem
                      icon={<Sparkles className="h-5 w-5 text-amber-600" />}
                      label="Travel Style"
                      value={request.travelStyle.charAt(0).toUpperCase() + request.travelStyle.slice(1)}
                    />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preferences Card */}
          {request.preferences && Object.keys(request.preferences).length > 0 && (
            <Card className="border-0 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-purple-50/50 border-b">
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Star className="h-5 w-5 text-purple-600" />
                  </div>
                  Preferences & Interests
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex flex-wrap gap-3">
                  {renderPreferences(request.preferences)}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes Card */}
          {(request.description || request.notes) && (
            <Card className="border-0 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-amber-50/50 border-b">
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <FileText className="h-5 w-5 text-amber-600" />
                  </div>
                  Special Requirements
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <p className="text-slate-600 whitespace-pre-wrap leading-relaxed">
                  {request.description || request.notes}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Card */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50">
            <CardHeader className="border-b bg-slate-50/50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Request Status</CardTitle>
                {/* Real-time connection indicator */}
                {isActive && (
                  <div className="flex items-center gap-1.5" title={realtimeConnected ? 'Live updates active' : realtimePolling ? 'Checking for updates...' : 'Updates paused'}>
                    {realtimeConnected ? (
                      <>
                        <Wifi className="h-4 w-4 text-green-500" />
                        <span className="text-xs text-green-600">Live</span>
                      </>
                    ) : realtimePolling ? (
                      <>
                        <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
                        <span className="text-xs text-blue-600">Syncing</span>
                      </>
                    ) : (
                      <>
                        <WifiOff className="h-4 w-4 text-slate-400" />
                        <span className="text-xs text-slate-500">Offline</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Status</span>
                <StatusBadge status={request.state} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Agents Responded</span>
                <span className="text-2xl font-bold text-blue-600">{request.agentsResponded || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Created</span>
                <span className="font-medium">{formatDate(request.createdAt)}</span>
              </div>
              {lastUpdated && (
                <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t">
                  <span>Last updated</span>
                  <span>{formatRelativeTime(lastUpdated)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions Card */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="border-b bg-slate-50/50">
              <CardTitle className="text-lg">Actions</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {hasProposals && (
                <Link href={`/dashboard/requests/${request.id}/proposals`} className="block">
                  <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 h-12 font-semibold">
                    <MessageSquare className="h-5 w-5 mr-2" />
                    View Proposals
                  </Button>
                </Link>
              )}
              <Button 
                variant="outline" 
                className="w-full h-11"
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({ title: `Travel Request - ${request?.destination?.label || 'Trip'}`, url: window.location.href });
                  } else {
                    navigator.clipboard.writeText(window.location.href);
                  }
                }}
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share Request
              </Button>
              {isActive && !showCancelConfirm && (
                <Button 
                  variant="outline" 
                  className="w-full h-11 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                  onClick={() => setShowCancelConfirm(true)}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancel Request
                </Button>
              )}
              {showCancelConfirm && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
                  <p className="text-sm text-red-700 font-medium">Are you sure you want to cancel this request?</p>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => setShowCancelConfirm(false)}
                      disabled={cancelling}
                    >
                      No, Keep It
                    </Button>
                    <Button 
                      size="sm" 
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                      onClick={handleCancelRequest}
                      disabled={cancelling}
                    >
                      {cancelling ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          Cancelling...
                        </>
                      ) : (
                        'Yes, Cancel'
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timeline Card */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="border-b bg-slate-50/50 flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Timeline</CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={refreshRequest}
                className="h-8 w-8 p-0 hover:bg-blue-50"
                title="Refresh"
              >
                <RefreshCw className="h-4 w-4 text-slate-500 hover:text-blue-600" />
              </Button>
            </CardHeader>
            <CardContent className="p-6">
              {/* Last Updated */}
              <div className="flex items-center gap-2 text-xs text-slate-400 mb-4 pb-3 border-b border-dashed">
                <Clock className="h-3 w-3" />
                <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
                {isActive && (
                  <span className="ml-auto flex items-center gap-1 text-green-600">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    Live
                  </span>
                )}
              </div>
              
              <div className="space-y-4">
                <TimelineItem
                  icon={<CheckCircle className="h-4 w-4" />}
                  title="Request Created"
                  date={formatDate(request.createdAt)}
                  active
                />
                {!['draft', 'DRAFT'].includes(request.state) && (
                  <TimelineItem
                    icon={<CheckCircle className="h-4 w-4" />}
                    title="Request Submitted"
                    date={formatDate(request.updatedAt)}
                    active
                  />
                )}
                {hasProposals && (
                  <TimelineItem
                    icon={<MessageSquare className="h-4 w-4" />}
                    title="Proposals Received"
                    date={`${request.agentsResponded} agent(s)`}
                    active
                    highlight
                  />
                )}
                {['booked', 'BOOKED'].includes(request.state) && (
                  <TimelineItem
                    icon={<CheckCircle className="h-4 w-4" />}
                    title="Trip Booked"
                    date={formatDate(request.updatedAt)}
                    active
                    highlight
                  />
                )}
                {['completed', 'COMPLETED'].includes(request.state) && (
                  <TimelineItem
                    icon={<Star className="h-4 w-4" />}
                    title="Trip Completed"
                    date={formatDate(request.updatedAt)}
                    active
                    highlight
                  />
                )}
                {['cancelled', 'CANCELLED'].includes(request.state) && (
                  <TimelineItem
                    icon={<XCircle className="h-4 w-4" />}
                    title="Request Cancelled"
                    date={formatDate(request.updatedAt)}
                    cancelled
                  />
                )}
                {['expired', 'EXPIRED'].includes(request.state) && (
                  <TimelineItem
                    icon={<Clock className="h-4 w-4" />}
                    title="Request Expired"
                    date={formatDate(request.updatedAt)}
                    expired
                  />
                )}
                {!hasProposals && isActive && (
                  <TimelineItem
                    icon={<Clock className="h-4 w-4" />}
                    title="Awaiting Proposals"
                    date="In progress..."
                    pending
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Components
// ============================================================================

function DetailItem({ 
  icon, 
  label, 
  value, 
  subtext,
  highlight 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: string;
  subtext?: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className={`p-2.5 rounded-xl ${highlight ? 'bg-gradient-to-br from-emerald-100 to-green-100' : 'bg-slate-100'}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-slate-500 mb-0.5">{label}</p>
        <p className={`font-semibold ${highlight ? 'text-emerald-700 text-lg' : 'text-slate-900'}`}>{value}</p>
        {subtext && <p className="text-xs text-slate-400 mt-0.5">{subtext}</p>}
      </div>
    </div>
  );
}

function TimelineItem({ 
  icon, 
  title, 
  date, 
  active, 
  pending,
  highlight,
  cancelled,
  expired
}: { 
  icon: React.ReactNode; 
  title: string; 
  date: string;
  active?: boolean;
  pending?: boolean;
  highlight?: boolean;
  cancelled?: boolean;
  expired?: boolean;
}) {
  return (
    <div className="flex gap-4">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
        cancelled ? 'bg-red-100 text-red-600' :
        expired ? 'bg-slate-200 text-slate-500' :
        highlight ? 'bg-green-100 text-green-600' :
        active ? 'bg-blue-100 text-blue-600' : 
        pending ? 'bg-slate-100 text-slate-400 animate-pulse' : 
        'bg-slate-100 text-slate-400'
      }`}>
        {icon}
      </div>
      <div>
        <p className={`font-medium ${
          cancelled ? 'text-red-600' : 
          expired ? 'text-slate-500' :
          pending ? 'text-slate-400' : 
          'text-slate-900'
        }`}>{title}</p>
        <p className={`text-sm ${cancelled ? 'text-red-400' : expired ? 'text-slate-400' : 'text-slate-500'}`}>{date}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalizedStatus = status.toLowerCase();
  const config: Record<string, { label: string; className: string; icon: React.ElementType }> = {
    draft: { label: 'Draft', className: 'bg-slate-100 text-slate-700', icon: FileText },
    open: { label: 'Open', className: 'bg-blue-100 text-blue-700', icon: Globe },
    submitted: { label: 'Submitted', className: 'bg-blue-100 text-blue-700', icon: CheckCircle },
    matched: { label: 'Agents Matched', className: 'bg-purple-100 text-purple-700', icon: Users },
    proposals_received: { label: 'Proposals Ready', className: 'bg-amber-100 text-amber-700', icon: MessageSquare },
    accepted: { label: 'Accepted', className: 'bg-green-100 text-green-700', icon: CheckCircle },
    completed: { label: 'Completed', className: 'bg-green-100 text-green-700', icon: CheckCircle },
    cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-700', icon: XCircle },
    expired: { label: 'Expired', className: 'bg-slate-100 text-slate-500', icon: Clock },
  };

  const { label, className, icon: Icon } = config[normalizedStatus] || { 
    label: status, 
    className: 'bg-slate-100 text-slate-700', 
    icon: AlertCircle 
  };
  
  return (
    <Badge className={`${className} px-3 py-1 font-medium gap-1.5`}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </Badge>
  );
}

function renderPreferences(preferences: Record<string, unknown>): React.ReactNode[] {
  const badges: React.ReactNode[] = [];
  
  // Handle experiences array
  if (Array.isArray(preferences.experiences)) {
    preferences.experiences.forEach((exp, i) => {
      badges.push(
        <Badge key={`exp-${i}`} variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200 px-3 py-1.5">
          {exp}
        </Badge>
      );
    });
  }
  
  // Handle trip type
  if (preferences.tripType && typeof preferences.tripType === 'string') {
    badges.push(
      <Badge key="tripType" className="bg-purple-50 text-purple-700 border-purple-200 px-3 py-1.5">
        {preferences.tripType}
      </Badge>
    );
  }
  
  // Handle budget range
  if (preferences.budgetRange && typeof preferences.budgetRange === 'string') {
    badges.push(
      <Badge key="budget" className="bg-green-50 text-green-700 border-green-200 px-3 py-1.5">
        {preferences.budgetRange}
      </Badge>
    );
  }

  // Handle traveler breakdown
  if (preferences.adults) {
    badges.push(
      <Badge key="adults" variant="outline" className="px-3 py-1.5">
        {String(preferences.adults)} Adults
      </Badge>
    );
  }
  if (preferences.children && Number(preferences.children) > 0) {
    badges.push(
      <Badge key="children" variant="outline" className="px-3 py-1.5">
        {String(preferences.children)} Children
      </Badge>
    );
  }
  if (preferences.infants && Number(preferences.infants) > 0) {
    badges.push(
      <Badge key="infants" variant="outline" className="px-3 py-1.5">
        {String(preferences.infants)} Infants
      </Badge>
    );
  }

  return badges.length > 0 ? badges : [
    <span key="none" className="text-slate-500">No specific preferences set</span>
  ];
}

// ============================================================================
// Helper Functions
// ============================================================================

function getDestinationLabel(request: TravelRequest): string {
  if (request.destination) {
    if (typeof request.destination === 'string') return request.destination;
    return request.destination.label || request.destination.city || request.title || 'Trip';
  }
  return request.title || 'Trip';
}

function getTripDuration(start: string, end: string): number | null {
  if (!start || !end) return null;
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return null;
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  return days > 0 ? days : null;
}

function formatDateRange(start: string, end: string): string {
  if (!start || !end) return 'Dates not set';
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return 'Invalid dates';
  
  const startMonth = startDate.toLocaleDateString('en-US', { month: 'short' });
  const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' });
  
  if (startMonth === endMonth) {
    return `${startMonth} ${startDate.getDate()} - ${endDate.getDate()}, ${endDate.getFullYear()}`;
  }
  return `${startMonth} ${startDate.getDate()} - ${endMonth} ${endDate.getDate()}, ${endDate.getFullYear()}`;
}

function formatDate(dateString: string): string {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Invalid date';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  
  if (diffSec < 5) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function getTravelersCount(travelers: { adults?: number; children?: number; infants?: number; total?: number }): number {
  if (travelers.total) return travelers.total;
  return (travelers.adults || 0) + (travelers.children || 0) + (travelers.infants || 0);
}

function getTravelersLabel(travelers: { adults?: number; children?: number; infants?: number; total?: number }): string {
  const parts = [];
  if (travelers.adults) parts.push(`${travelers.adults} adult${travelers.adults > 1 ? 's' : ''}`);
  if (travelers.children) parts.push(`${travelers.children} child${travelers.children > 1 ? 'ren' : ''}`);
  if (travelers.infants) parts.push(`${travelers.infants} infant${travelers.infants > 1 ? 's' : ''}`);
  if (parts.length > 0) return parts.join(', ');
  const total = getTravelersCount(travelers);
  return `${total} traveler${total !== 1 ? 's' : ''}`;
}

function formatBudget(min: number | null, max: number | null): string {
  if (min && max) {
    return `₹${min.toLocaleString('en-IN')} - ₹${max.toLocaleString('en-IN')}`;
  }
  if (max) return `Up to ₹${max.toLocaleString('en-IN')}`;
  if (min) return `From ₹${min.toLocaleString('en-IN')}`;
  return 'Flexible';
}
