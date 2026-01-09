'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Star, Clock, CheckCircle, Calendar, MessageSquare, Loader2, Lock, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useUserSession } from '@/lib/user/session';
import { fetchRequest, fetchRequestProposals, type TravelRequest, type Proposal } from '@/lib/data/api';
import { PriceBudgetComparison, SavingsHighlight } from '@/components/trust/PriceBudgetComparison';
import { ItineraryTemplateCompact } from '@/components/trust/ItineraryTemplate';

export default function ProposalsPage() {
  const params = useParams();
  const requestId = params.id as string;
  const { loading: userLoading } = useUserSession();
  const [request, setRequest] = useState<TravelRequest | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setSelectedProposal] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [requestData, proposalsData] = await Promise.all([
          fetchRequest(requestId),
          fetchRequestProposals(requestId),
        ]);
        setRequest(requestData);
        setProposals(proposalsData);
      } catch (error) {
        console.error('Error loading proposals:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
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

  const handleSelectProposal = (proposalId: string) => {
    setSelectedProposal(proposalId);
    // TODO: Implement booking flow
    alert('Booking flow coming soon! You selected proposal: ' + proposalId);
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link href={`/dashboard/requests/${requestId}`} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Request Details
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Compare Proposals</h1>
        <p className="text-muted-foreground">
          {proposals.length} travel agent{proposals.length !== 1 ? 's' : ''} responded to your request for{' '}
          <span className="font-medium text-foreground">
            {request.destination?.label || request.destination?.city || request.title}
          </span>
        </p>
      </div>

      {proposals.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No Proposals Yet</h3>
            <p className="text-muted-foreground mb-4">
              Travel agents are reviewing your request. Check back soon!
            </p>
            <Link href="/dashboard/requests">
              <Button variant="outline">Back to Requests</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {proposals.map((proposal) => (
            <Card key={proposal.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                  {/* Agent Info */}
                  <div className="flex items-start gap-4 lg:w-64 shrink-0">
                    <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-lg font-semibold">
                      {proposal.agent ? getInitials(proposal.agent.fullName) : '??'}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{proposal.agent?.fullName || 'Unknown Agent'}</h3>
                      {proposal.agent?.businessName && (
                        <p className="text-sm text-muted-foreground">{proposal.agent.businessName}</p>
                      )}
                      {proposal.agent?.rating && (
                        <div className="flex items-center gap-1 mt-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-medium">{proposal.agent.rating.toFixed(1)}</span>
                        </div>
                      )}
                      {proposal.agent?.specializations && proposal.agent.specializations.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {proposal.agent.specializations.slice(0, 2).map((spec) => (
                            <Badge key={spec} variant="secondary" className="text-xs">{spec}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Proposal Details */}
                  <div className="flex-1 space-y-4">
                    <div>
                      <h4 className="font-semibold text-lg">{proposal.title}</h4>
                      {proposal.description && (
                        <p className="text-muted-foreground text-sm mt-1 line-clamp-2">{proposal.description}</p>
                      )}
                    </div>

                    {/* Price & Budget Comparison */}
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <span className="font-semibold text-lg">₹{proposal.totalPrice.toLocaleString('en-IN')}</span>
                          <span className="text-muted-foreground">total</span>
                        </div>
                        {proposal.validUntil && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            Valid until {formatDate(proposal.validUntil)}
                          </div>
                        )}
                      </div>
                      
                      {/* Visual Budget Comparison */}
                      {request.budgetMin != null && request.budgetMax != null && (
                        <PriceBudgetComparison
                          price={proposal.totalPrice}
                          budget={{
                            min: request.budgetMin,
                            max: request.budgetMax,
                            currency: request.budgetCurrency || 'INR',
                          }}
                          variant="compact"
                          showProgressBar={true}
                        />
                      )}
                    </div>

                    {/* Inclusions Preview */}
                    {proposal.inclusions && proposal.inclusions.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {proposal.inclusions.slice(0, 4).map((item, index) => (
                          <div key={index} className="flex items-center gap-1 text-sm text-green-700">
                            <CheckCircle className="h-3 w-3" />
                            {item}
                          </div>
                        ))}
                        {proposal.inclusions.length > 4 && (
                          <span className="text-sm text-muted-foreground">+{proposal.inclusions.length - 4} more</span>
                        )}
                      </div>
                    )}

                    {/* Itinerary Preview - Enhanced with Template */}
                    {proposal.itinerary && proposal.itinerary.length > 0 && (
                      <ItineraryTemplateCompact
                        totalDays={proposal.itinerary.length}
                        highlights={proposal.itinerary.slice(0, 3).map((day) => day.title)}
                        itemCounts={{
                          accommodations: Math.ceil(proposal.itinerary.length / 2),
                          activities: proposal.itinerary.length * 2,
                          meals: proposal.itinerary.length,
                          transfers: Math.ceil(proposal.itinerary.length / 3) + 1,
                        }}
                      />
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 lg:w-40 shrink-0">
                    <Button onClick={() => handleSelectProposal(proposal.id)}>
                      Select This Option
                    </Button>
                    <Button variant="outline">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Message Agent
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
