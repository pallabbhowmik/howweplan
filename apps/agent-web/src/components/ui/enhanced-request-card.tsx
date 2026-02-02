'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  Calendar,
  MapPin,
  Users,
  DollarSign,
  Clock,
  Target,
  Globe,
  Sparkles,
  Heart,
  CheckCircle,
  XCircle,
  ArrowRight,
  MessageSquare,
  Star,
  AlertCircle,
  Loader2,
  ChevronRight,
  Eye,
} from 'lucide-react';
import { Card, CardContent } from './card';
import { Badge } from './badge';
import { Button } from './button';
import { StatusProgressTracker, MiniStatusBadge } from './status-progress-tracker';
import { QuickActions, type QuickAction } from './quick-actions';

// ============================================================================
// Types
// ============================================================================

export interface RequestData {
  matchId: string;
  requestId: string;
  destination: string;
  country: string;
  region: string;
  dates: {
    start: string;
    end: string;
    flexibility: string;
  };
  budget: {
    min: number;
    max: number;
    currency: string;
  };
  travelers: {
    adults: number;
    children: number;
    infants: number;
  };
  travelStyle: string;
  interests: string[];
  description: string;
  requirements: string[];
  receivedAt: string;
  expiresAt: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired' | string;
  matchScore: number;
  client: {
    firstName: string;
    avatarUrl: string | null;
  };
}

export interface EnhancedRequestCardProps {
  request: RequestData;
  onAccept?: () => Promise<void>;
  onDecline?: (reason: string) => Promise<void>;
  onMessage?: () => void;
  onViewDetails?: () => void;
  onCreateItinerary?: () => void;
  showProgress?: boolean;
  compact?: boolean;
  className?: string;
}

// ============================================================================
// Utility Functions
// ============================================================================

function formatCurrency(amount: number, currency: string = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatDateRange(start: string, end: string): string {
  if (!start || !end) return 'Flexible dates';
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const startDate = new Date(start);
  const endDate = new Date(end);
  return `${startDate.toLocaleDateString('en-US', options)} - ${endDate.toLocaleDateString('en-US', options)}`;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

function getTimeRemaining(expiresAt: string): { text: string; isUrgent: boolean } {
  const expires = new Date(expiresAt);
  const now = new Date();
  const diffMs = expires.getTime() - now.getTime();
  
  if (diffMs <= 0) return { text: 'Expired', isUrgent: true };
  
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  return {
    text: hours > 0 ? `${hours}h ${mins}m` : `${mins}m`,
    isUrgent: hours < 4,
  };
}

function getTravelStyleConfig(style: string): { label: string; icon: React.ReactNode } {
  const configs: Record<string, { label: string; icon: React.ReactNode }> = {
    budget: { label: 'Budget', icon: <DollarSign className="h-4 w-4" /> },
    mid_range: { label: 'Mid-Range', icon: <Star className="h-4 w-4" /> },
    luxury: { label: 'Luxury', icon: <Sparkles className="h-4 w-4" /> },
    ultra_luxury: { label: 'Ultra Luxury', icon: <Heart className="h-4 w-4" /> },
    adventure: { label: 'Adventure', icon: <MapPin className="h-4 w-4" /> },
  };
  return configs[style] || { label: style, icon: <Star className="h-4 w-4" /> };
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
// EnhancedRequestCard Component
// ============================================================================

export function EnhancedRequestCard({
  request,
  onAccept,
  onDecline,
  onMessage,
  onViewDetails,
  onCreateItinerary,
  showProgress = false,
  compact = false,
  className,
}: EnhancedRequestCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isActioning, setIsActioning] = useState<'accept' | 'decline' | null>(null);
  const [showDeclineReason, setShowDeclineReason] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [justActioned, setJustActioned] = useState<'accepted' | 'declined' | null>(null);

  const isAccepted = request.status === 'accepted';
  const isDeclined = request.status === 'declined';
  const isPending = request.status === 'pending';
  const timeRemaining = getTimeRemaining(request.expiresAt);
  const styleConfig = getTravelStyleConfig(request.travelStyle);
  const totalTravelers = request.travelers.adults + request.travelers.children + request.travelers.infants;

  // Handle accept with animation
  const handleAccept = useCallback(async () => {
    if (!onAccept || isActioning) return;
    setIsActioning('accept');
    try {
      await onAccept();
      setJustActioned('accepted');
      setTimeout(() => setJustActioned(null), 2000);
    } finally {
      setIsActioning(null);
    }
  }, [onAccept, isActioning]);

  // Handle decline with reason
  const handleDecline = useCallback(async () => {
    if (!onDecline || isActioning) return;
    
    if (!showDeclineReason) {
      setShowDeclineReason(true);
      return;
    }
    
    setIsActioning('decline');
    try {
      await onDecline(declineReason || 'No reason provided');
      setJustActioned('declined');
      setShowDeclineReason(false);
      setDeclineReason('');
      setTimeout(() => setJustActioned(null), 2000);
    } finally {
      setIsActioning(null);
    }
  }, [onDecline, isActioning, showDeclineReason, declineReason]);

  // Quick actions
  const quickActions: QuickAction[] = [];
  
  if (isPending) {
    quickActions.push({
      id: 'accept',
      label: 'Accept',
      icon: <CheckCircle className="h-4 w-4" />,
      variant: 'success',
      shortcut: 'A',
      loading: isActioning === 'accept',
      onClick: handleAccept,
    });
    quickActions.push({
      id: 'decline',
      label: 'Decline',
      icon: <XCircle className="h-4 w-4" />,
      variant: 'destructive',
      shortcut: 'D',
      loading: isActioning === 'decline',
      onClick: handleDecline,
    });
  }

  if (isAccepted && onCreateItinerary) {
    quickActions.push({
      id: 'create-itinerary',
      label: 'Create Itinerary',
      icon: <ArrowRight className="h-4 w-4" />,
      variant: 'default',
      onClick: onCreateItinerary,
    });
  }

  if (onMessage) {
    quickActions.push({
      id: 'message',
      label: 'Message',
      icon: <MessageSquare className="h-4 w-4" />,
      onClick: onMessage,
    });
  }

  if (onViewDetails) {
    quickActions.push({
      id: 'details',
      label: 'Details',
      icon: <Eye className="h-4 w-4" />,
      onClick: onViewDetails,
    });
  }

  return (
    <Card
      className={cn(
        'group relative transition-all duration-300 overflow-hidden',
        // Status-based styling
        isAccepted && 'border-emerald-200 bg-gradient-to-br from-emerald-50/50 via-white to-white',
        isDeclined && 'border-gray-200 bg-gray-50 opacity-75',
        timeRemaining.isUrgent && isPending && 'border-amber-300 ring-2 ring-amber-100',
        // Just actioned animation
        justActioned === 'accepted' && 'animate-pulse ring-2 ring-emerald-400',
        justActioned === 'declined' && 'animate-pulse ring-2 ring-red-300',
        // Hover effects
        'hover:shadow-lg hover:border-blue-200',
        className
      )}
    >
      {/* Status ribbon for accepted */}
      {isAccepted && (
        <div className="absolute top-0 right-0 overflow-hidden w-20 h-20 z-10">
          <div className="absolute transform rotate-45 bg-emerald-500 text-white text-xs font-semibold py-1 right-[-35px] top-[15px] w-[120px] text-center shadow">
            Accepted
          </div>
        </div>
      )}

      {/* Urgent indicator */}
      {timeRemaining.isUrgent && isPending && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 animate-pulse" />
      )}

      <CardContent className={cn('p-5', compact && 'p-4')}>
        {/* Header Row */}
        <div className="flex items-start justify-between gap-4 mb-4">
          {/* Destination & Score */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h3 className="text-xl font-bold text-gray-900 truncate">
                {request.destination}
              </h3>
              {/* Match Score */}
              <div className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-xs font-semibold">
                <Target className="h-3 w-3" />
                <span>{Math.round(request.matchScore)}%</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Globe className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{request.country} • {request.region}</span>
            </div>
          </div>

          {/* Time Status */}
          <div className="flex-shrink-0 text-right">
            {isPending ? (
              <Badge 
                variant={timeRemaining.isUrgent ? 'destructive' : 'outline'}
                className={cn(
                  'gap-1',
                  timeRemaining.isUrgent && 'animate-pulse'
                )}
              >
                <Clock className="h-3 w-3" />
                {timeRemaining.text}
              </Badge>
            ) : (
              <MiniStatusBadge status={request.status} />
            )}
            <p className="mt-1 text-xs text-gray-400">
              {formatRelativeTime(request.receivedAt)}
            </p>
          </div>
        </div>

        {/* Progress Tracker (optional) */}
        {showProgress && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <StatusProgressTracker
              workflow="request"
              currentStatus={request.status}
              compact
              showLabels
            />
          </div>
        )}

        {/* Info Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-gray-50 rounded-xl mb-4">
          {/* Dates */}
          <div className="space-y-1">
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Dates
            </p>
            <p className="text-sm font-medium text-gray-900">
              {formatDateRange(request.dates.start, request.dates.end)}
            </p>
            <p className="text-xs text-gray-400">
              {getFlexibilityLabel(request.dates.flexibility)}
            </p>
          </div>

          {/* Budget */}
          <div className="space-y-1">
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <DollarSign className="h-3 w-3" /> Budget
            </p>
            <p className="text-sm font-medium text-gray-900">
              {formatCurrency(request.budget.min, request.budget.currency)} - {formatCurrency(request.budget.max, request.budget.currency)}
            </p>
          </div>

          {/* Travelers */}
          <div className="space-y-1">
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <Users className="h-3 w-3" /> Travelers
            </p>
            <p className="text-sm font-medium text-gray-900">
              {request.travelers.adults} adult{request.travelers.adults !== 1 ? 's' : ''}
              {request.travelers.children > 0 && `, ${request.travelers.children} child`}
              {request.travelers.children > 1 && 'ren'}
            </p>
          </div>

          {/* Style */}
          <div className="space-y-1">
            <p className="text-xs text-gray-500 flex items-center gap-1">
              {styleConfig.icon} Style
            </p>
            <p className="text-sm font-medium text-gray-900">
              {styleConfig.label}
            </p>
          </div>
        </div>

        {/* Description */}
        {request.description && (
          <p className={cn(
            'text-sm text-gray-600 mb-4',
            !isExpanded && 'line-clamp-2'
          )}>
            {request.description}
          </p>
        )}

        {/* Interests */}
        {request.interests.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {request.interests.slice(0, isExpanded ? undefined : 4).map((interest) => (
              <Badge key={interest} variant="secondary" className="text-xs">
                {interest}
              </Badge>
            ))}
            {!isExpanded && request.interests.length > 4 && (
              <Badge variant="outline" className="text-xs cursor-pointer" onClick={() => setIsExpanded(true)}>
                +{request.interests.length - 4} more
              </Badge>
            )}
          </div>
        )}

        {/* Requirements Warning */}
        {request.requirements.length > 0 && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-100 rounded-lg">
            <p className="text-xs font-medium text-amber-800 flex items-center gap-1 mb-1">
              <AlertCircle className="h-3 w-3" />
              Special Requirements
            </p>
            <p className="text-xs text-amber-700">
              {request.requirements.join(' • ')}
            </p>
          </div>
        )}

        {/* Decline Reason Input */}
        {showDeclineReason && isPending && (
          <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg animate-in slide-in-from-top-2">
            <p className="text-sm font-medium text-red-800 mb-2">Why are you declining?</p>
            <textarea
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="e.g., Dates conflict with existing booking..."
              className="w-full text-sm p-2 border border-red-200 rounded-md bg-white focus:ring-2 focus:ring-red-300 focus:border-red-300"
              rows={2}
            />
            <div className="flex gap-2 mt-2">
              <Button
                size="sm"
                variant="destructive"
                onClick={handleDecline}
                disabled={isActioning === 'decline'}
              >
                {isActioning === 'decline' ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : null}
                Confirm Decline
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowDeclineReason(false);
                  setDeclineReason('');
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between gap-3 pt-4 border-t border-gray-100">
          {/* Client Info */}
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-sm font-medium">
              {request.client.firstName[0]}
            </div>
            <span className="text-sm text-gray-600">{request.client.firstName}</span>
          </div>

          {/* Quick Actions */}
          <QuickActions 
            actions={quickActions} 
            size="sm"
            showLabels={!compact}
          />
        </div>

        {/* Expand/Collapse toggle */}
        {(request.description.length > 100 || request.interests.length > 4) && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-3 text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            {isExpanded ? 'Show less' : 'Show more'}
            <ChevronRight className={cn('h-3 w-3 transition-transform', isExpanded && 'rotate-90')} />
          </button>
        )}
      </CardContent>
    </Card>
  );
}
