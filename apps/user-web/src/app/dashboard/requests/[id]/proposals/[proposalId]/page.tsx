'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  Star,
  Clock,
  CheckCircle,
  XCircle,
  Calendar,
  MessageSquare,
  Loader2,
  Shield,
  Award,
  MapPin,
  Users,
  Phone,
  Mail,
  Globe,
  Heart,
  Share2,
  Bookmark,
  ChevronDown,
  ChevronUp,
  Info,
  AlertCircle,
  CreditCard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUserSession } from '@/lib/user/session';
import { fetchRequest, fetchRequestProposals, type TravelRequest, type Proposal } from '@/lib/data/api';
import { bookingsApi } from '@/lib/api/client';
import { PriceBudgetComparison } from '@/components/trust/PriceBudgetComparison';
import { ItineraryTemplateEnhanced, type ItineraryDay, type ItineraryItem, type TimeOfDay, type ItemCategory } from '@/components/trust/ItineraryTemplateEnhanced';
import { ResponseTimeIndicator } from '@/components/trust/ResponseTimeIndicator';
import { WishlistButton } from '@/components/trust/WishlistButton';

// =============================================================================
// HELPER: Transform proposal itinerary to enhanced format
// =============================================================================

function transformItinerary(proposal: Proposal): ItineraryDay[] {
  if (!proposal.itinerary || proposal.itinerary.length === 0) {
    return [];
  }

  return proposal.itinerary.map((day, index) => {
    // Parse activities from the day data
    const items: ItineraryItem[] = [];
    
    // Parse activities from the activities array
    const activities = day.activities || [];
    activities.forEach((activity: string, actIndex: number) => {
      const timeSlots: TimeOfDay[] = ['morning', 'afternoon', 'evening'];
      const categories: ItemCategory[] = [
        'activity', 'sightseeing', 'cultural', 'adventure', 'leisure'
      ];
      
      items.push({
        id: `${index}-act-${actIndex}`,
        timeOfDay: timeSlots[actIndex % timeSlots.length] || 'morning',
        category: categories[actIndex % categories.length] || 'activity',
        title: activity,
        description: `Exciting activity planned for your journey`,
        locationArea: day.title || `Day ${index + 1}`,
        durationMinutes: 120,
        starRating: null,
        included: true,
      });
    });

    // If no activities were parsed, add placeholder items based on description
    if (items.length === 0) {
      items.push(
        {
          id: `${index}-morning`,
          timeOfDay: 'morning',
          category: 'sightseeing',
          title: 'Morning Exploration',
          description: day.description || 'Discover local attractions and hidden gems',
          locationArea: day.title || `Day ${index + 1}`,
          durationMinutes: 180,
          starRating: null,
          included: true,
        },
        {
          id: `${index}-afternoon`,
          timeOfDay: 'afternoon',
          category: 'activity',
          title: 'Afternoon Adventure',
          description: 'Engaging activities planned for the afternoon',
          locationArea: day.title || `Day ${index + 1}`,
          durationMinutes: 180,
          starRating: null,
          included: true,
        }
      );
    }

    return {
      dayNumber: index + 1,
      title: day.title || `Day ${index + 1}`,
      subtitle: day.description?.substring(0, 60),
      description: day.description,
      items,
    };
  });
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function ProposalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const requestId = params.id as string;
  const proposalId = params.proposalId as string;
  
  const { user, loading: userLoading } = useUserSession();
  const [request, setRequest] = useState<TravelRequest | null>(null);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingInProgress, setBookingInProgress] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('itinerary');
  const [showAllInclusions, setShowAllInclusions] = useState(false);
  const [showAllExclusions, setShowAllExclusions] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [requestData, proposalsData] = await Promise.all([
          fetchRequest(requestId),
          fetchRequestProposals(requestId),
        ]);
        setRequest(requestData);
        
        const foundProposal = proposalsData.find(p => p.id === proposalId);
        setProposal(foundProposal || null);
      } catch (error) {
        console.error('Error loading proposal:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [requestId, proposalId]);

  // Transform itinerary data
  const enhancedDays = useMemo(() => {
    if (!proposal) return [];
    return transformItinerary(proposal);
  }, [proposal]);

  // Check if price is within budget
  const isWithinBudget = useMemo(() => {
    if (!request || !proposal) return true;
    if (request.budgetMin == null || request.budgetMax == null) return true;
    return proposal.totalPrice >= request.budgetMin && proposal.totalPrice <= request.budgetMax;
  }, [request, proposal]);

  if (userLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!request || !proposal) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">Proposal Not Found</h2>
        <p className="text-muted-foreground mb-4">The proposal you&apos;re looking for doesn&apos;t exist.</p>
        <Link href={`/dashboard/requests/${requestId}/proposals`}>
          <Button>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Proposals
          </Button>
        </Link>
      </div>
    );
  }

  const handleBookNow = async () => {
    if (!user || !request || !proposal) {
      setBookingError('Please login to book this trip');
      return;
    }

    setBookingInProgress(true);
    setBookingError(null);

    try {
      // Get destination info from request
      const destination = request.destination || {};
      const destinationCity = destination.city || destination.label || 'Unknown City';
      const destinationCountry = destination.country || 'Unknown Country';

      // Calculate dates
      const tripStartDate = request.departureDate || new Date().toISOString().split('T')[0];
      const tripEndDate = request.returnDate || tripStartDate;

      // Get traveler count from travelers field
      let travelerCount = 1;
      if (request.travelers) {
        if (typeof request.travelers === 'number') {
          travelerCount = request.travelers;
        } else if (typeof request.travelers === 'object') {
          const t = request.travelers as any;
          travelerCount = (t.adults || 0) + (t.children || 0) + (t.infants || 0) || 1;
        }
      }

      // Convert price to cents (API expects cents)
      const basePriceCents = Math.round(proposal.totalPrice * 100);

      // Create booking
      const bookingResult = await bookingsApi.createBooking({
        userId: user.id,
        agentId: proposal.agentId,
        itineraryId: proposal.id, // Using proposal ID as itinerary ID
        tripStartDate,
        tripEndDate,
        destinationCity,
        destinationCountry,
        travelerCount,
        basePriceCents,
      });

      const bookingData = bookingResult?.data || bookingResult;
      const bookingId = bookingData?.id || bookingData?.bookingId;

      if (!bookingId) {
        throw new Error('Failed to create booking - no booking ID returned');
      }

      // Create checkout session
      const checkoutResult = await bookingsApi.createCheckout({
        bookingId,
        successUrl: `${window.location.origin}/dashboard/bookings/${bookingId}/success`,
        cancelUrl: `${window.location.origin}/dashboard/requests/${requestId}/proposals/${proposalId}?cancelled=true`,
      });

      const checkoutData = checkoutResult?.data || checkoutResult;
      const checkoutUrl = checkoutData?.url || checkoutData?.checkoutUrl;

      if (checkoutUrl) {
        // Redirect to payment page
        window.location.href = checkoutUrl;
      } else {
        // If no checkout URL, redirect to booking details
        router.push(`/dashboard/bookings/${bookingId}`);
      }
    } catch (error: any) {
      console.error('Booking error:', error);
      setBookingError(error.message || 'Failed to create booking. Please try again.');
    } finally {
      setBookingInProgress(false);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Back Button */}
      <Link 
        href={`/dashboard/requests/${requestId}/proposals`} 
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to All Proposals
      </Link>


      {/* Header Section */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                {request.destination?.label || request.destination?.city || request.title}
              </h1>
              <p className="text-muted-foreground">
                {proposal.itinerary?.length || 0} Days / {(proposal.itinerary?.length || 1) - 1} Nights
              </p>
            </div>
            <div className="flex items-center gap-2">
              <WishlistButton
                itemType="proposal"
                itemId={proposal.id}
                itemName={`${request.destination?.label || 'Trip'} by ${proposal.agent?.fullName || 'Agent'}`}
                variant="heart"
              />
              <Button variant="outline" size="icon">
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Agent Card */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold">
                  {proposal.agent?.fullName?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || 'AG'}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-lg">{proposal.agent?.fullName || 'Travel Agent'}</h3>
                    {proposal.agent?.yearsOfExperience && proposal.agent.yearsOfExperience >= 5 && (
                      <Badge variant="secondary" className="gap-1">
                        <Shield className="h-3 w-3" />
                        Experienced
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                    {proposal.agent?.rating && (
                      <span className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        {proposal.agent.rating.toFixed(1)}
                      </span>
                    )}
                    {proposal.agent?.yearsOfExperience && (
                      <span>{proposal.agent.yearsOfExperience} years experience</span>
                    )}
                    {proposal.agent?.businessName && (
                      <span>{proposal.agent.businessName}</span>
                    )}
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Message
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Price Card */}
        <Card className="lg:row-span-1">
          <CardContent className="p-6">
            <div className="text-center mb-4">
              <p className="text-sm text-muted-foreground mb-1">Total Price</p>
              <p className="text-4xl font-bold text-green-600">
                ₹{proposal.totalPrice.toLocaleString('en-IN')}
              </p>
              <p className="text-sm text-muted-foreground">
                ₹{Math.round(proposal.totalPrice / (proposal.itinerary?.length || 1)).toLocaleString('en-IN')} per day
              </p>
            </div>

            {/* Budget Comparison */}
            {request.budgetMin != null && request.budgetMax != null && (
              <div className="mb-4">
                <PriceBudgetComparison
                  price={proposal.totalPrice}
                  budget={{
                    min: request.budgetMin,
                    max: request.budgetMax,
                    currency: request.budgetCurrency || 'INR',
                  }}
                  variant="default"
                  showProgressBar={true}
                />
              </div>
            )}

            {proposal.validUntil && (
              <div className="flex items-center justify-center gap-2 text-sm text-amber-600 bg-amber-50 rounded-lg p-2 mb-4">
                <Clock className="h-4 w-4" />
                Valid until {new Date(proposal.validUntil).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </div>
            )}

            {bookingError && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg p-2 mb-4">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {bookingError}
              </div>
            )}

            <Button 
              onClick={handleBookNow} 
              className="w-full" 
              size="lg"
              disabled={bookingInProgress}
            >
              {bookingInProgress ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Book This Trip
                </>
              )}
            </Button>
            
            <p className="text-xs text-center text-muted-foreground mt-3">
              Secure payment • Free cancellation available
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Section */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
          <TabsTrigger value="itinerary">Itinerary</TabsTrigger>
          <TabsTrigger value="inclusions">What&apos;s Included</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
        </TabsList>

        {/* Itinerary Tab */}
        <TabsContent value="itinerary" className="space-y-4">
          {enhancedDays.length > 0 ? (
            <ItineraryTemplateEnhanced
              title={`${request.destination?.label || 'Your Trip'} Itinerary`}
              subtitle={`Curated by ${proposal.agent?.fullName || 'our expert agent'}`}
              heroImage="https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200"
              totalDays={enhancedDays.length}
              days={enhancedDays}
              highlights={proposal.inclusions?.slice(0, 5)}
              includedItems={proposal.inclusions}
              excludedItems={proposal.exclusions}
              isRevealed={false}
              variant="default"
              onSave={() => console.log('Save itinerary')}
              onShare={() => console.log('Share itinerary')}
            />
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">Itinerary Preview</h3>
                <p className="text-muted-foreground">
                  Detailed day-by-day itinerary will be shared after booking.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Inclusions Tab */}
        <TabsContent value="inclusions" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Included */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="h-5 w-5" />
                  What&apos;s Included
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {(showAllInclusions 
                    ? proposal.inclusions 
                    : proposal.inclusions?.slice(0, 6)
                  )?.map((item, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                      <span className="text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
                {proposal.inclusions && proposal.inclusions.length > 6 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-3 w-full"
                    onClick={() => setShowAllInclusions(!showAllInclusions)}
                  >
                    {showAllInclusions ? (
                      <>Show Less <ChevronUp className="h-4 w-4 ml-1" /></>
                    ) : (
                      <>Show All ({proposal.inclusions.length}) <ChevronDown className="h-4 w-4 ml-1" /></>
                    )}
                  </Button>
                )}
                {(!proposal.inclusions || proposal.inclusions.length === 0) && (
                  <p className="text-muted-foreground text-sm">Details will be shared after booking</p>
                )}
              </CardContent>
            </Card>

            {/* Excluded */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-700">
                  <XCircle className="h-5 w-5" />
                  Not Included
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {(showAllExclusions 
                    ? proposal.exclusions 
                    : proposal.exclusions?.slice(0, 6)
                  )?.map((item, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                      <span className="text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
                {proposal.exclusions && proposal.exclusions.length > 6 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-3 w-full"
                    onClick={() => setShowAllExclusions(!showAllExclusions)}
                  >
                    {showAllExclusions ? (
                      <>Show Less <ChevronUp className="h-4 w-4 ml-1" /></>
                    ) : (
                      <>Show All ({proposal.exclusions.length}) <ChevronDown className="h-4 w-4 ml-1" /></>
                    )}
                  </Button>
                )}
                {(!proposal.exclusions || proposal.exclusions.length === 0) && (
                  <p className="text-muted-foreground text-sm">All standard items included</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Trip Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Duration</p>
                    <p className="font-medium">{proposal.itinerary?.length || 0} Days</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Users className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Travelers</p>
                    <p className="font-medium">{request.travelers?.adults || 2} Adults, {request.travelers?.children || 0} Children</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <MapPin className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Destination</p>
                    <p className="font-medium">{request.destination?.label || request.destination?.city || 'To be confirmed'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Award className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Agent Specialization</p>
                    <p className="font-medium capitalize">
                      {proposal.agent?.specializations?.[0] || 'Custom Travel'}
                    </p>
                  </div>
                </div>
              </div>

              {proposal.description && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-blue-900 mb-1">About This Proposal</p>
                      <p className="text-sm text-blue-800">{proposal.description}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reviews Tab */}
        <TabsContent value="reviews" className="space-y-6">
          <Card>
            <CardContent className="py-12 text-center">
              <Star className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Agent Reviews</h3>
              <p className="text-muted-foreground mb-4">
                {proposal.agent?.yearsOfExperience 
                  ? `${proposal.agent.yearsOfExperience} years of experience`
                  : 'New agent on the platform'
                }
              </p>
              {proposal.agent?.rating && (
                <div className="flex items-center justify-center gap-2">
                  <Star className="h-6 w-6 fill-yellow-400 text-yellow-400" />
                  <span className="text-2xl font-bold">{proposal.agent.rating.toFixed(1)}</span>
                  <span className="text-muted-foreground">/ 5.0</span>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 lg:hidden z-50">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div>
            <p className="text-2xl font-bold text-green-600">
              ₹{proposal.totalPrice.toLocaleString('en-IN')}
            </p>
            <p className="text-sm text-muted-foreground">
              {proposal.itinerary?.length || 0} Days
            </p>
          </div>
          <Button onClick={handleBookNow} size="lg">
            Book This Trip
          </Button>
        </div>
      </div>
    </div>
  );
}
