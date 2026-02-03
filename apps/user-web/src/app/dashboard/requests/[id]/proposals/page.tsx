'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Star, Clock, CheckCircle, Calendar, MessageSquare, Loader2, Lock, Eye, ExternalLink, Shield, Award, Zap, Users, MapPin, ThumbsUp, TrendingUp, BadgeCheck, Quote, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useUserSession } from '@/lib/user/session';
import { fetchRequest, fetchRequestProposals, createBookingFromProposal, type TravelRequest, type Proposal } from '@/lib/data/api';
import { startConversation } from '@/lib/data/messages';
import { PriceBudgetComparison, SavingsHighlight } from '@/components/trust/PriceBudgetComparison';
import { ItineraryTemplateCompact } from '@/components/trust/ItineraryTemplate';
import { cn } from '@/lib/utils';
import { useRequestUpdates, type RequestUpdateEvent } from '@/lib/realtime';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// =============================================================================
// Badge Configuration
// =============================================================================

const BADGE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bgColor: string; description: string }> = {
  'VERIFIED': { label: 'Verified', icon: BadgeCheck, color: 'text-emerald-600', bgColor: 'bg-emerald-50', description: 'Identity verified' },
  'TOP_RATED': { label: 'Top Rated', icon: Star, color: 'text-amber-500', bgColor: 'bg-amber-50', description: '4.8+ stars' },
  'FAST_RESPONDER': { label: 'Fast', icon: Zap, color: 'text-purple-600', bgColor: 'bg-purple-50', description: 'Responds quickly' },
  'EXPERT_PLANNER': { label: 'Expert', icon: Award, color: 'text-blue-600', bgColor: 'bg-blue-50', description: '50+ trips' },
  'PLATFORM_TRUSTED': { label: 'Trusted', icon: Shield, color: 'text-indigo-600', bgColor: 'bg-indigo-50', description: 'Zero violations' },
};

function getResponseTimeLabel(minutes: number): { label: string; color: string } {
  if (minutes <= 30) return { label: '< 30 min', color: 'text-emerald-600' };
  if (minutes <= 60) return { label: '< 1 hour', color: 'text-blue-600' };
  if (minutes <= 180) return { label: '< 3 hours', color: 'text-amber-600' };
  return { label: 'Varies', color: 'text-slate-500' };
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

export default function ProposalsPage() {
  const params = useParams();
  const router = useRouter();
  const requestId = params.id as string;
  const { user, loading: userLoading } = useUserSession();
  const [request, setRequest] = useState<TravelRequest | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingInProgress, setBookingInProgress] = useState<string | null>(null);
  const [messagingInProgress, setMessagingInProgress] = useState<string | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState<string | null>(null);
  const [updatedProposalId, setUpdatedProposalId] = useState<string | null>(null);

  // Reload proposals from API
  const reloadProposals = useCallback(async () => {
    try {
      const proposalsData = await fetchRequestProposals(requestId);
      setProposals(proposalsData);
    } catch (error) {
      console.error('Error reloading proposals:', error);
    }
  }, [requestId]);

  // Real-time updates for proposals
  const { lastEvent } = useRequestUpdates({
    requestId,
    userId: user?.userId,
    enabled: !userLoading && !!requestId,
    onUpdate: useCallback((event: RequestUpdateEvent) => {
      console.log('[Proposals] Real-time event received:', event.type, event.data);
      
      if (event.type === 'NEW_PROPOSAL' || event.type === 'PROPOSAL_UPDATED') {
        // Highlight the updated proposal and reload
        if (event.data.itineraryId) {
          setUpdatedProposalId(event.data.itineraryId);
          // Clear highlight after 3 seconds
          setTimeout(() => setUpdatedProposalId(null), 3000);
        }
        // Reload proposals to get fresh data
        reloadProposals();
      }
    }, [reloadProposals]),
  });

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

  const handleSelectProposal = async (proposalId: string) => {
    setShowConfirmModal(proposalId);
  };

  const confirmBooking = async (proposalId: string) => {
    setBookingInProgress(proposalId);
    setBookingError(null);
    setShowConfirmModal(null);
    
    try {
      const booking = await createBookingFromProposal(proposalId, requestId);
      // Redirect to the new booking page
      router.push(`/dashboard/bookings/${booking.id}`);
    } catch (error) {
      console.error('Booking error:', error);
      setBookingError(error instanceof Error ? error.message : 'Failed to create booking. Please try again.');
      setBookingInProgress(null);
    }
  };

  const handleMessageAgent = async (agentUserId: string | undefined) => {
    console.log('[MessageAgent] Button clicked, agentUserId:', agentUserId, 'user:', user?.userId);
    
    if (!user?.userId) {
      alert('Please log in to message agents');
      return;
    }
    
    if (!agentUserId) {
      alert('Unable to message this agent - contact information unavailable');
      return;
    }
    
    setMessagingInProgress(agentUserId);
    try {
      console.log('[MessageAgent] Starting conversation with agent:', agentUserId);
      const { conversationId } = await startConversation(user.userId, agentUserId);
      console.log('[MessageAgent] Conversation created:', conversationId);
      router.push(`/dashboard/messages?conversation=${conversationId}`);
    } catch (error) {
      console.error('[MessageAgent] Failed to start conversation:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      // Show user-friendly error
      alert(`Failed to start conversation: ${errorMessage}`);
      // Still try to redirect to messages with agent filter
      router.push(`/dashboard/messages?agent=${agentUserId}`);
    } finally {
      setMessagingInProgress(null);
    }
  };

  // Get agent badges based on their stats
  const getAgentBadges = (agent: any): string[] => {
    const badges: string[] = [];
    if (agent?.isVerified) badges.push('VERIFIED');
    if (agent?.rating && agent.rating >= 4.8) badges.push('TOP_RATED');
    if (agent?.responseTimeMinutes && agent.responseTimeMinutes <= 30) badges.push('FAST_RESPONDER');
    if (agent?.completedBookings && agent.completedBookings >= 50) badges.push('EXPERT_PLANNER');
    if (agent?.totalReviews && agent.totalReviews >= 10 && agent.rating >= 4.5) badges.push('PLATFORM_TRUSTED');
    return badges;
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link href={`/dashboard/requests/${requestId}`} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Request Details
      </Link>

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">Compare Agent Proposals</h1>
        <p className="text-blue-100">
          {proposals.length} travel advisor{proposals.length !== 1 ? 's' : ''} responded to your request for{' '}
          <span className="font-semibold text-white">
            {request.destination?.label || request.destination?.city || request.title}
          </span>
        </p>
        <div className="mt-4 flex items-center gap-2 text-sm text-blue-100">
          <Shield className="h-4 w-4" />
          <span>All agents are verified. Compare profiles, ratings & reviews to find your perfect match.</span>
        </div>
      </div>

      {/* Error Message */}
      {bookingError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-800">Booking Error</p>
            <p className="text-sm text-red-600">{bookingError}</p>
          </div>
          <button onClick={() => setBookingError(null)} className="ml-auto text-red-500 hover:text-red-700">
            ×
          </button>
        </div>
      )}

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
          {proposals.map((proposal) => {
            const agentBadges = getAgentBadges(proposal.agent);
            const responseTime = proposal.agent?.responseTimeMinutes 
              ? getResponseTimeLabel(proposal.agent.responseTimeMinutes) 
              : null;
            
            return (
            <Card key={proposal.id} className={cn(
              "hover:shadow-lg transition-all duration-300 overflow-hidden border-2 hover:border-blue-200",
              updatedProposalId === proposal.id && "ring-2 ring-amber-400 ring-offset-2 animate-pulse border-amber-300"
            )}>
              {/* Updated Badge */}
              {updatedProposalId === proposal.id && (
                <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2 text-amber-800 text-sm">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span className="font-medium">This proposal was just updated!</span>
                </div>
              )}
              {/* Agent Profile Header */}
              <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50/50 border-b pb-4">
                <div className="flex items-start gap-4">
                  {/* Avatar with verification badge */}
                  <div className="relative">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 text-white flex items-center justify-center text-xl font-bold shadow-lg">
                      {proposal.agent ? getInitials(proposal.agent.fullName) : '??'}
                    </div>
                    {proposal.agent?.isVerified && (
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center shadow-md">
                        <BadgeCheck className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Agent Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-lg text-slate-900">{proposal.agent?.fullName || 'Travel Advisor'}</h3>
                      {proposal.agent?.tier && (
                        <Badge variant="outline" className={cn(
                          'text-xs',
                          proposal.agent.tier === 'star' ? 'text-amber-600 border-amber-300 bg-amber-50' : 'text-slate-600'
                        )}>
                          {proposal.agent.tier === 'star' && <Star className="h-3 w-3 mr-1 fill-amber-400" />}
                          {proposal.agent.tier === 'star' ? 'Star Agent' : 'Verified Agent'}
                        </Badge>
                      )}
                    </div>
                    
                    {proposal.agent?.businessName && (
                      <p className="text-sm text-muted-foreground">{proposal.agent.businessName}</p>
                    )}

                    {/* Rating & Stats Row */}
                    <div className="flex items-center gap-4 mt-2 flex-wrap">
                      {proposal.agent?.rating && (
                        <div className="flex items-center gap-1">
                          <div className="flex">
                            {[1,2,3,4,5].map(i => (
                              <Star key={i} className={cn('h-4 w-4', i <= Math.round(proposal.agent?.rating || 0) ? 'fill-amber-400 text-amber-400' : 'text-slate-200')} />
                            ))}
                          </div>
                          <span className="font-semibold text-sm">{proposal.agent.rating.toFixed(1)}</span>
                          <span className="text-xs text-muted-foreground">({proposal.agent.totalReviews || 0} reviews)</span>
                        </div>
                      )}
                      {responseTime && (
                        <div className="flex items-center gap-1 text-sm">
                          <Clock className="h-4 w-4 text-slate-400" />
                          <span className={responseTime.color}>{responseTime.label}</span>
                        </div>
                      )}
                      {proposal.agent?.completedBookings && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Users className="h-4 w-4" />
                          <span>{proposal.agent.completedBookings} trips</span>
                        </div>
                      )}
                    </div>

                    {/* Badges Row */}
                    {agentBadges.length > 0 && (
                      <TooltipProvider>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {agentBadges.map((badgeKey) => {
                            const badge = BADGE_CONFIG[badgeKey];
                            if (!badge) return null;
                            const Icon = badge.icon;
                            return (
                              <Tooltip key={badgeKey}>
                                <TooltipTrigger asChild>
                                  <div className={cn(
                                    'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium cursor-help',
                                    badge.bgColor, badge.color
                                  )}>
                                    <Icon className="h-3 w-3" />
                                    {badge.label}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent><p>{badge.description}</p></TooltipContent>
                              </Tooltip>
                            );
                          })}
                        </div>
                      </TooltipProvider>
                    )}
                  </div>

                  {/* Price Tag */}
                  <div className="text-right bg-white rounded-xl p-3 shadow-sm border">
                    <p className="text-2xl font-bold text-slate-900">₹{(proposal.pricing?.totalPrice || proposal.totalPrice || 0).toLocaleString('en-IN')}</p>
                    <p className="text-xs text-muted-foreground">Total Price</p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                  {/* Specializations & Destinations */}
                  <div className="lg:w-56 shrink-0 space-y-4">
                    {proposal.agent?.specializations && proposal.agent.specializations.length > 0 && (
                      <div>
                        <h5 className="text-xs font-semibold text-slate-500 uppercase mb-2">Specializes In</h5>
                        <div className="flex flex-wrap gap-1">
                          {proposal.agent.specializations.slice(0, 4).map((spec) => (
                            <Badge key={spec} variant="secondary" className="text-xs">{spec}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {proposal.agent?.destinations && proposal.agent.destinations.length > 0 && (
                      <div>
                        <h5 className="text-xs font-semibold text-slate-500 uppercase mb-2">Expert Destinations</h5>
                        <div className="flex flex-wrap gap-1">
                          {proposal.agent.destinations.slice(0, 3).map((dest) => (
                            <Badge key={dest} variant="outline" className="text-xs">
                              <MapPin className="h-3 w-3 mr-1" />{dest}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Highlighted Review Snippet */}
                    {proposal.agent?.highlightedReview && (
                      <div className="bg-slate-50 rounded-lg p-3 border">
                        <div className="flex items-start gap-2">
                          <Quote className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs text-slate-600 italic line-clamp-3">
                              "{proposal.agent.highlightedReview.content}"
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex">
                                {[1,2,3,4,5].map(i => (
                                  <Star key={i} className={cn('h-3 w-3', i <= (proposal.agent?.highlightedReview?.rating || 5) ? 'fill-amber-400 text-amber-400' : 'text-slate-200')} />
                                ))}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {proposal.agent.highlightedReview.travelerName || 'Traveler'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Proposal Details */}
                  <div className="flex-1 space-y-4">
                    <div>
                      <h4 className="font-semibold text-lg">{proposal.overview?.title || proposal.title}</h4>
                      {(proposal.overview?.summary || proposal.description) && (
                        <p className="text-muted-foreground text-sm mt-1 line-clamp-2">{proposal.overview?.summary || proposal.description}</p>
                      )}
                    </div>

                    {/* Price & Budget Comparison */}
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <span className="font-semibold text-lg">₹{(proposal.pricing?.totalPrice || proposal.totalPrice || 0).toLocaleString('en-IN')}</span>
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
                          price={proposal.pricing?.totalPrice || proposal.totalPrice || 0}
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
                    <Link href={`/dashboard/requests/${requestId}/proposals/${proposal.id}`}>
                      <Button className="w-full">
                        <Eye className="h-4 w-4 mr-2" />
                        View Itinerary
                      </Button>
                    </Link>
                    <Button 
                      onClick={() => handleSelectProposal(proposal.id)} 
                      variant="default" 
                      className="bg-green-600 hover:bg-green-700"
                      disabled={bookingInProgress === proposal.id}
                    >
                      {bookingInProgress === proposal.id ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        'Select & Book'
                      )}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        const targetId = proposal.agent?.userId || proposal.agentId;
                        console.log('[MessageAgent] Click - agent:', proposal.agent, 'agentId:', proposal.agentId, 'targetId:', targetId);
                        handleMessageAgent(targetId);
                      }} 
                      disabled={messagingInProgress === (proposal.agent?.userId || proposal.agentId)}
                      title="Send a message to this agent"
                    >
                      {messagingInProgress === (proposal.agent?.userId || proposal.agentId) ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <MessageSquare className="h-4 w-4 mr-2" />
                      )}
                      Message Agent
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            );
          })}
        </div>
      )}

      {/* Booking Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowConfirmModal(null)}>
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold">Confirm Your Selection</h3>
            </div>
            
            {(() => {
              const selectedProposal = proposals.find(p => p.id === showConfirmModal);
              return selectedProposal ? (
                <div className="bg-slate-50 rounded-lg p-4 mb-4">
                  <p className="font-medium">{selectedProposal.agent?.fullName || 'Travel Agent'}</p>
                  <p className="text-sm text-muted-foreground">{selectedProposal.overview?.title || selectedProposal.title}</p>
                  <p className="text-lg font-bold text-green-600 mt-2">
                    ₹{(selectedProposal.pricing?.totalPrice || selectedProposal.totalPrice || 0).toLocaleString('en-IN')}
                  </p>
                </div>
              ) : null;
            })()}
            
            <p className="text-sm text-muted-foreground mb-6">
              By proceeding, you agree to create a booking with this agent. You&apos;ll be able to review details and complete payment on the next screen.
            </p>
            
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowConfirmModal(null)}>
                Cancel
              </Button>
              <Button 
                className="flex-1 bg-green-600 hover:bg-green-700" 
                onClick={() => confirmBooking(showConfirmModal)}
              >
                Confirm Booking
              </Button>
            </div>
          </div>
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
