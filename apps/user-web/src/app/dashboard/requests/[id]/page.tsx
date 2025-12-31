'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, MapPin, Calendar, Users, Clock, MessageSquare, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useUserSession } from '@/lib/user/session';
import { fetchRequest, type TravelRequest } from '@/lib/data/api';

export default function RequestDetailPage() {
  const params = useParams();
  const requestId = params.id as string;
  const { loading: userLoading } = useUserSession();
  const [request, setRequest] = useState<TravelRequest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRequest = async () => {
      setLoading(true);
      try {
        const data = await fetchRequest(requestId);
        setRequest(data);
      } catch (error) {
        console.error('Error loading request:', error);
      } finally {
        setLoading(false);
      }
    };

    loadRequest();
  }, [requestId]);

  if (userLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <h2 className="text-2xl font-bold mb-2">Request Not Found</h2>
        <p className="text-muted-foreground mb-4">The request you&apos;re looking for doesn&apos;t exist.</p>
        <Link href="/dashboard/requests">
          <Button>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Requests
          </Button>
        </Link>
      </div>
    );
  }

  const hasProposals = request.state === 'PROPOSALS_RECEIVED' || (request.agentsResponded && request.agentsResponded > 0);
  const canEdit = request.state === 'DRAFT';
  const isActive = !['COMPLETED', 'CANCELLED', 'EXPIRED'].includes(request.state);

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link href="/dashboard/requests" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Requests
      </Link>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">{getDestinationLabel(request)}</h1>
            <StatusBadge status={request.state} />
          </div>
          <div className="flex flex-wrap gap-4 text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {formatDateRange(request.departureDate, request.returnDate)}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {getTravelersCount(request.travelers)} travelers
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Created {formatDate(request.createdAt)}
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          {canEdit && (
            <Button variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              Edit Request
            </Button>
          )}
          {hasProposals && (
            <Link href={`/dashboard/requests/${request.id}/proposals`}>
              <Button>
                <MessageSquare className="h-4 w-4 mr-2" />
                View Proposals ({request.agentsResponded || 0})
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Trip Details */}
          <Card>
            <CardHeader>
              <CardTitle>Trip Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Destination</p>
                    <p className="font-medium flex items-center gap-1">
                      <MapPin className="h-4 w-4 text-blue-600" />
                      {getDestinationLabel(request)}
                    </p>
                  </div>
                  {request.departureLocation && (
                    <div>
                      <p className="text-sm text-muted-foreground">Departing From</p>
                      <p className="font-medium">{request.departureLocation.city || 'Not specified'}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">Travel Dates</p>
                    <p className="font-medium">{formatDateRange(request.departureDate, request.returnDate)}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Travelers</p>
                    <p className="font-medium">{getTravelersLabel(request.travelers)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Budget</p>
                    <p className="font-medium flex items-center gap-1">
                      {formatBudget(request.budgetMin, request.budgetMax, request.budgetCurrency)}
                    </p>
                  </div>
                  {request.travelStyle && (
                    <div>
                      <p className="text-sm text-muted-foreground">Travel Style</p>
                      <p className="font-medium">{request.travelStyle}</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Description */}
          {(request.description || request.notes) && (
            <Card>
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">{request.description || request.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Preferences */}
          {request.preferences && Object.keys(request.preferences).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Preferences</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(request.preferences).map(([key, value]) => (
                    <Badge key={key} variant="secondary">
                      {typeof value === 'string' ? value : key}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Card */}
          <Card>
            <CardHeader>
              <CardTitle>Request Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <StatusBadge status={request.state} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Agents Responded</span>
                <span className="font-medium">{request.agentsResponded || 0}</span>
              </div>
              {request.expiresAt && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Expires</span>
                  <span className="font-medium">{formatDate(request.expiresAt)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions Card */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {hasProposals && (
                <Link href={`/dashboard/requests/${request.id}/proposals`} className="block">
                  <Button className="w-full">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    View Proposals
                  </Button>
                </Link>
              )}
              {canEdit && (
                <Button variant="outline" className="w-full">
                  <FileText className="h-4 w-4 mr-2" />
                  Edit Request
                </Button>
              )}
              {isActive && request.state !== 'DRAFT' && (
                <Button variant="outline" className="w-full text-red-600 hover:text-red-700">
                  Cancel Request
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Timeline Card */}
          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-600 mt-2" />
                  <div>
                    <p className="text-sm font-medium">Request Created</p>
                    <p className="text-xs text-muted-foreground">{formatDate(request.createdAt)}</p>
                  </div>
                </div>
                {request.state !== 'DRAFT' && (
                  <div className="flex gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-600 mt-2" />
                    <div>
                      <p className="text-sm font-medium">Request Submitted</p>
                      <p className="text-xs text-muted-foreground">{formatDate(request.updatedAt)}</p>
                    </div>
                  </div>
                )}
                {hasProposals && (
                  <div className="flex gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-600 mt-2" />
                    <div>
                      <p className="text-sm font-medium">Proposals Received</p>
                      <p className="text-xs text-muted-foreground">{request.agentsResponded} agent(s) responded</p>
                    </div>
                  </div>
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
// Helper Functions
// ============================================================================

function getDestinationLabel(request: TravelRequest): string {
  if (request.destination) {
    return request.destination.label || request.destination.city || request.title || 'Trip';
  }
  return request.title || 'Trip';
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

function getTravelersCount(travelers: { adults?: number; children?: number; infants?: number; total?: number }): number {
  if (travelers.total) return travelers.total;
  return (travelers.adults || 0) + (travelers.children || 0) + (travelers.infants || 0);
}

function getTravelersLabel(travelers: { adults?: number; children?: number; infants?: number; total?: number }): string {
  const parts = [];
  if (travelers.adults) parts.push(`${travelers.adults} adult${travelers.adults > 1 ? 's' : ''}`);
  if (travelers.children) parts.push(`${travelers.children} child${travelers.children > 1 ? 'ren' : ''}`);
  if (travelers.infants) parts.push(`${travelers.infants} infant${travelers.infants > 1 ? 's' : ''}`);
  return parts.length > 0 ? parts.join(', ') : `${getTravelersCount(travelers)} traveler(s)`;
}

function formatBudget(min: number | null, max: number | null, currency: string): string {
  void currency;
  if (min && max) {
    return `₹${min.toLocaleString('en-IN')} - ₹${max.toLocaleString('en-IN')}`;
  }
  if (max) return `Up to ₹${max.toLocaleString('en-IN')}`;
  if (min) return `From ₹${min.toLocaleString('en-IN')}`;
  return 'Flexible';
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { label: string; className: string }> = {
    DRAFT: { label: 'Draft', className: 'bg-slate-100 text-slate-700' },
    SUBMITTED: { label: 'Submitted', className: 'bg-blue-100 text-blue-700' },
    MATCHING: { label: 'Finding Agents', className: 'bg-blue-100 text-blue-700 animate-pulse' },
    PROPOSALS_RECEIVED: { label: 'Proposals Ready', className: 'bg-amber-100 text-amber-700' },
    BOOKED: { label: 'Booked', className: 'bg-green-100 text-green-700' },
    COMPLETED: { label: 'Completed', className: 'bg-green-100 text-green-700' },
    CANCELLED: { label: 'Cancelled', className: 'bg-red-100 text-red-700' },
    EXPIRED: { label: 'Expired', className: 'bg-slate-100 text-slate-700' },
  };

  const config = variants[status] || { label: status, className: 'bg-slate-100 text-slate-700' };
  return <Badge className={config.className}>{config.label}</Badge>;
}
