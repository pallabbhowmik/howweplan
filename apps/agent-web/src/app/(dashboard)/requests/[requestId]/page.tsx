'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Calendar, Globe, Target, Users } from 'lucide-react';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { useAgentSession } from '@/lib/agent/session';
import {
  acceptMatch,
  declineMatch,
  getAgentMatchForRequest,
  getTravelRequestDetails,
  type AgentMatchForRequest,
  type TravelRequestDetails,
} from '@/lib/data/agent';

function formatDateRange(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
  return `${startDate.toLocaleDateString('en-US', options)} - ${endDate.toLocaleDateString('en-US', options)}`;
}

function formatCurrency(amount: number, currency: string = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

function destinationLabel(destination: any): string {
  // Handle JSON string
  let dest = destination;
  if (typeof dest === 'string') {
    try {
      dest = JSON.parse(dest);
    } catch {
      return dest || 'Destination';
    }
  }
  
  const country = typeof dest?.country === 'string' ? dest.country : null;
  const regions = Array.isArray(dest?.regions) ? dest.regions.filter(Boolean) : [];
  if (country && regions.length > 0) return `${country} • ${regions.join(', ')}`;
  if (country) return country;
  if (regions.length > 0) return regions.join(', ');
  return 'Destination';
}

export default function RequestDetailsPage() {
  const params = useParams<{ requestId: string }>();
  const requestId = params.requestId;
  const { agent } = useAgentSession();

  const [req, setReq] = useState<TravelRequestDetails | null>(null);
  const [match, setMatch] = useState<AgentMatchForRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const canAcceptDecline = useMemo(() => {
    return match?.status === 'pending';
  }, [match?.status]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [r, m] = await Promise.all([
          getTravelRequestDetails(requestId),
          getAgentMatchForRequest(agent.agentId, requestId),
        ]);
        if (cancelled) return;
        setReq(r);
        setMatch(m);
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message ?? 'Failed to load request');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [agent.agentId, requestId]);

  const handleAccept = async () => {
    if (!match?.matchId) return;
    setBusy(true);
    try {
      await acceptMatch(match.matchId);
      setMatch({ ...match, status: 'accepted' });
    } catch (e: any) {
      setError(e?.message ?? 'Failed to accept');
    } finally {
      setBusy(false);
    }
  };

  const handleDecline = async () => {
    if (!match?.matchId) return;
    setBusy(true);
    try {
      await declineMatch(match.matchId, 'Declined from request details');
      setMatch({ ...match, status: 'declined' });
    } catch (e: any) {
      setError(e?.message ?? 'Failed to decline');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-gray-500">Loading request…</CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Link href="/requests">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-700 mb-4">{error}</p>
            <Link href="/requests">
              <Button variant="outline">Back to requests</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!req) {
    return (
      <div className="space-y-4">
        <Link href="/requests">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <Card>
          <CardHeader>
            <CardTitle>Request not found</CardTitle>
          </CardHeader>
          <CardContent className="text-gray-600">This request ID doesn’t exist.</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/requests">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{req.title}</h1>
            <p className="text-gray-500">Request {req.id}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {match?.status && <Badge variant={match.status === 'accepted' ? 'success' : match.status === 'pending' ? 'warning' : 'secondary'}>{match.status}</Badge>}
          {typeof match?.matchScore === 'number' && (
            <Badge className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-0 gap-1">
              <Target className="h-3 w-3" />
              {Math.round(match.matchScore)}%
            </Badge>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Request details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-start gap-3">
                <Globe className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Destination</p>
                  <p className="font-medium text-gray-900">{destinationLabel(req.destination)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Dates</p>
                  <p className="font-medium text-gray-900">{formatDateRange(req.departureDate, req.returnDate)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Travelers</p>
                  <p className="font-medium text-gray-900">
                    {Number(req.travelers?.adults ?? 0) + Number(req.travelers?.children ?? 0)} total
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div>
                  <p className="text-sm text-gray-500">Budget</p>
                  <p className="font-medium text-gray-900">
                    {req.budgetMin !== null && req.budgetMax !== null
                      ? `${formatCurrency(req.budgetMin, req.budgetCurrency ?? 'INR')} - ${formatCurrency(req.budgetMax, req.budgetCurrency ?? 'INR')}`
                      : '—'}
                  </p>
                </div>
              </div>
            </div>

            {req.description && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Description</p>
                <p className="text-gray-800 whitespace-pre-wrap">{req.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Client</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="font-medium text-gray-900">
                {req.client ? `${req.client.firstName} ${req.client.lastName}`.trim() : 'Client'}
              </p>
              <p className="text-sm text-gray-500">{req.client?.email ?? ''}</p>
            </div>

            {canAcceptDecline && (
              <div className="pt-2 space-y-2">
                <Button className="w-full" disabled={busy} onClick={handleAccept}>
                  Accept
                </Button>
                <Button className="w-full" variant="outline" disabled={busy} onClick={handleDecline}>
                  Decline
                </Button>
              </div>
            )}

            {!match && (
              <p className="text-sm text-gray-500">
                No match record found for this request for the selected agent.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
