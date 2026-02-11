'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
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
  Share2,
  Info,
  AlertCircle,
  CreditCard,
  Plane,
  Hotel,
  Camera,
  Utensils,
  Sparkles,
  BadgeCheck,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useUserSession } from '@/lib/user/session';
import { fetchRequest, fetchRequestProposals, createFullBooking, createCheckout, type TravelRequest, type Proposal } from '@/lib/data/api';
import { WishlistButton } from '@/components/trust/WishlistButton';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

interface ItineraryOverview {
  title?: string;
  numberOfDays?: number;
  numberOfNights?: number;
  destinations?: string[];
  travelersCount?: number;
  tripType?: string;
  summary?: string;
  startDate?: string;
  endDate?: string;
}

interface ItineraryPricing {
  totalPrice?: number;
  currency?: string;
  pricePerPerson?: number;
  depositAmount?: number;
  inclusions?: string[];
  exclusions?: string[];
  paymentTerms?: string;
}

interface ItineraryItem {
  id?: string;
  dayNumber: number;
  type: string;
  title: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  cost?: number;
  confirmed?: boolean;
}

interface DayPlan {
  dayNumber: number;
  title: string;
  description?: string;
  activities: string[];
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function formatCurrency(amount: number, currency = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getActivityIcon(type: string) {
  const icons: Record<string, React.ReactNode> = {
    flight: <Plane className="h-4 w-4" />,
    hotel: <Hotel className="h-4 w-4" />,
    sightseeing: <Camera className="h-4 w-4" />,
    meal: <Utensils className="h-4 w-4" />,
    activity: <Sparkles className="h-4 w-4" />,
    transfer: <Plane className="h-4 w-4" />,
  };
  return icons[type?.toLowerCase()] || <Sparkles className="h-4 w-4" />;
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
  const [activeTab, setActiveTab] = useState('overview');

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
        console.log('Loaded proposal data:', JSON.stringify(foundProposal, null, 2));
        setProposal(foundProposal || null);
      } catch (error) {
        console.error('Error loading proposal:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [requestId, proposalId]);

  // Extract data safely from backend structure with proper types
  const overview: ItineraryOverview = (proposal?.overview as ItineraryOverview) || {};
  const pricing: ItineraryPricing = (proposal?.pricing as ItineraryPricing) || {};
  const items: ItineraryItem[] = (proposal?.items as ItineraryItem[]) || [];
  const dayPlans: DayPlan[] = (proposal?.dayPlans as DayPlan[]) || [];
  
  // Calculate values - prices are stored as whole currency (not cents)
  const totalPrice = pricing.totalPrice || proposal?.totalPrice || 0;
  const numberOfDays = overview.numberOfDays || proposal?.itinerary?.length || 0;
  const numberOfNights = overview.numberOfNights ?? (numberOfDays > 0 ? numberOfDays - 1 : 0);
  const pricePerDay = numberOfDays > 0 ? Math.round(totalPrice / numberOfDays) : 0;
  const pricePerPerson = pricing.pricePerPerson || 0;
  const depositAmount = pricing.depositAmount || Math.round(totalPrice * 0.2);
  const currency = pricing.currency || 'INR';
  const destinations = overview.destinations || [];
  const travelersCount = overview.travelersCount || 2;
  const tripType = overview.tripType || 'Leisure';
  
  // Budget comparison
  const budgetMin = request?.budgetMin || 0;
  const budgetMax = request?.budgetMax || totalPrice;
  const budgetProgress = budgetMax > 0 ? Math.min((totalPrice / budgetMax) * 100, 100) : 0;
  const isUnderBudget = totalPrice <= budgetMax;
  const savingsAmount = budgetMax - totalPrice;

  // Group items by day
  const itemsByDay: Record<number, typeof items> = {};
  items.forEach((item) => {
    const day = item.dayNumber || 1;
    if (!itemsByDay[day]) itemsByDay[day] = [];
    itemsByDay[day].push(item);
  });

  // Check if we have day plans to display
  const hasDayPlans = dayPlans.length > 0;

  // Highlights for overview (prefer items, fallback to dayPlans)
  const highlightItems = items.length > 0
    ? items.map((item) => ({
        title: item.title,
        dayNumber: item.dayNumber,
        type: item.type,
      }))
    : dayPlans.flatMap((plan) => {
        if (plan.activities && plan.activities.length > 0) {
          return plan.activities.map((activity) => ({
            title: activity,
            dayNumber: plan.dayNumber,
            type: 'activity',
          }));
        }
        return [{
          title: plan.title || `Day ${plan.dayNumber}`,
          dayNumber: plan.dayNumber,
          type: 'activity',
        }];
      });

  const handleBookNow = async () => {
    if (!user || !request || !proposal) {
      setBookingError('Please login to book this trip');
      return;
    }

    setBookingInProgress(true);
    setBookingError(null);

    try {
      const destination = request.destination || {};
      const destinationCity = destination.city || destination.label || 'Unknown City';
      const destinationCountry = destination.country || 'Unknown Country';
      const defaultDate = new Date().toISOString().split('T')[0] as string;
      const tripStartDate = overview.startDate || request.departureDate || defaultDate;
      const tripEndDate = overview.endDate || request.returnDate || tripStartDate;

      // Convert to cents for API (price stored as whole currency)
      const basePriceCents = Math.round(totalPrice * 100);

      const bookingResult = await createFullBooking({
        userId: user.userId,
        agentId: proposal.agentId,
        itineraryId: proposal.id,
        tripStartDate,
        tripEndDate,
        destinationCity,
        destinationCountry,
        travelerCount: travelersCount,
        basePriceCents,
      }) as any;

      const bookingData = bookingResult?.data || bookingResult;
      const bookingId = bookingData?.id || bookingData?.bookingId;

      if (!bookingId) {
        throw new Error('Failed to create booking - no booking ID returned');
      }

      const checkoutResult = await createCheckout({
        bookingId,
        successUrl: `${window.location.origin}/dashboard/bookings/${bookingId}/success`,
        cancelUrl: `${window.location.origin}/dashboard/requests/${requestId}/proposals/${proposalId}?cancelled=true`,
      }) as any;

      const checkoutData = checkoutResult?.data || checkoutResult;
      const checkoutUrl = checkoutData?.url || checkoutData?.checkoutUrl;

      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      } else {
        router.push(`/dashboard/bookings/${bookingId}`);
      }
    } catch (error: any) {
      console.error('Booking error:', error);
      setBookingError(error.message || 'Failed to create booking. Please try again.');
    } finally {
      setBookingInProgress(false);
    }
  };

  if (userLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your proposal...</p>
        </div>
      </div>
    );
  }

  if (!request || !proposal) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <AlertCircle className="h-16 w-16 text-gray-300 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Proposal Not Found</h2>
        <p className="text-muted-foreground mb-6">The proposal you&apos;re looking for doesn&apos;t exist or has been removed.</p>
        <Link href={`/dashboard/requests/${requestId}/proposals`}>
          <Button>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Proposals
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-32">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 text-white">
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative max-w-6xl mx-auto px-4 py-8">
          {/* Back Button */}
          <Link 
            href={`/dashboard/requests/${requestId}/proposals`} 
            className="inline-flex items-center text-white/80 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to All Proposals
          </Link>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left: Trip Info */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex flex-wrap gap-2 mb-3">
                <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm">
                  {tripType}
                </Badge>
                {proposal.agent?.tier === 'star' && (
                  <Badge className="bg-amber-400/90 text-amber-900 border-none">
                    <Star className="h-3 w-3 mr-1 fill-current" />
                    Star Agent
                  </Badge>
                )}
              </div>
              
              <h1 className="text-4xl lg:text-5xl font-bold tracking-tight">
                {overview.title || proposal.title || 'Your Dream Trip'}
              </h1>
              
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-white/90 text-lg">
                <span className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  {destinations.length > 0 ? destinations.join(' → ') : (request.destination?.label || 'Multiple Destinations')}
                </span>
                <span className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  {numberOfDays} Days, {numberOfNights} Nights
                </span>
                <span className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {travelersCount} Travelers
                </span>
              </div>

              {overview.summary && (
                <p className="text-white/80 text-lg max-w-2xl mt-4">
                  {overview.summary}
                </p>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 mt-6">
                <WishlistButton
                  itemType="proposal"
                  itemId={proposal.id}
                  itemName={overview.title || 'Trip'}
                  variant="heart"
                />
                <Button variant="secondary" size="sm" className="gap-2">
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>
                <Button variant="secondary" size="sm" className="gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Contact Agent
                </Button>
              </div>
            </div>

            {/* Right: Price Card */}
            <div className="lg:col-span-1">
              <Card className="shadow-2xl border-0 overflow-hidden">
                <div className="bg-gradient-to-br from-emerald-500 to-green-600 p-6 text-white">
                  <p className="text-sm font-medium opacity-90 mb-1">Total Package Price</p>
                  <p className="text-5xl font-bold tracking-tight">
                    {formatCurrency(totalPrice, currency)}
                  </p>
                  <p className="text-sm opacity-90 mt-1">
                    {formatCurrency(pricePerDay, currency)}/day • {formatCurrency(Math.round(totalPrice / travelersCount), currency)}/person
                  </p>
                </div>
                
                <CardContent className="p-6 space-y-4">
                  {/* Budget Comparison */}
                  {budgetMax > 0 && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Budget Usage</span>
                        <span className={isUnderBudget ? 'text-green-600 font-medium' : 'text-amber-600 font-medium'}>
                          {Math.round(budgetProgress)}% of max budget
                        </span>
                      </div>
                      <Progress value={budgetProgress} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{formatCurrency(budgetMin, currency)}</span>
                        <span>{formatCurrency(budgetMax, currency)}</span>
                      </div>
                      {isUnderBudget && savingsAmount > 0 && (
                        <div className="flex items-center gap-2 text-green-600 text-sm bg-green-50 rounded-lg p-2">
                          <TrendingUp className="h-4 w-4" />
                          <span className="font-medium">{formatCurrency(savingsAmount, currency)} under budget!</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Price Breakdown */}
                  <div className="border-t pt-4 space-y-2">
                    {pricePerPerson > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Per Person</span>
                        <span className="font-medium">{formatCurrency(pricePerPerson, currency)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Deposit Required</span>
                      <span className="font-medium">{formatCurrency(depositAmount, currency)}</span>
                    </div>
                  </div>

                  {bookingError && (
                    <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg p-3">
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                      {bookingError}
                    </div>
                  )}

                  <Button 
                    onClick={handleBookNow} 
                    className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                    disabled={bookingInProgress}
                  >
                    {bookingInProgress ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-5 w-5 mr-2" />
                        Book This Trip
                      </>
                    )}
                  </Button>
                  
                  <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-2">
                    <Shield className="h-3 w-3" />
                    Secure payment • Free cancellation available
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Agent Card */}
      <div className="max-w-6xl mx-auto px-4 -mt-4 relative z-10">
        <Card className="shadow-lg border-0">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold shadow-lg">
                {proposal.agent?.fullName?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || 'AG'}
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h3 className="font-bold text-xl">{proposal.agent?.fullName || 'Travel Expert'}</h3>
                  {proposal.agent?.isVerified && (
                    <BadgeCheck className="h-5 w-5 text-blue-500" />
                  )}
                  {proposal.agent?.tier === 'star' && (
                    <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                      <Star className="h-3 w-3 mr-1 fill-amber-500 text-amber-500" />
                      Star Agent
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  {proposal.agent?.rating && proposal.agent.rating > 0 && (
                    <span className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium text-foreground">{proposal.agent.rating.toFixed(1)}</span>
                      {proposal.agent.totalReviews && (
                        <span>({proposal.agent.totalReviews} reviews)</span>
                      )}
                    </span>
                  )}
                  {proposal.agent?.yearsOfExperience && proposal.agent.yearsOfExperience > 0 && (
                    <span className="flex items-center gap-1">
                      <Award className="h-4 w-4 text-blue-500" />
                      {proposal.agent.yearsOfExperience} years experience
                    </span>
                  )}
                  {proposal.agent?.completedBookings && proposal.agent.completedBookings > 0 && (
                    <span className="flex items-center gap-1">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      {proposal.agent.completedBookings} trips completed
                    </span>
                  )}
                </div>
                {proposal.agent?.businessName && (
                  <p className="text-sm text-muted-foreground mt-1">{proposal.agent.businessName}</p>
                )}
              </div>
              <Button variant="outline" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                Message Agent
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 mt-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex h-auto p-1 bg-slate-100 rounded-xl">
            <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm py-2.5">
              Overview
            </TabsTrigger>
            <TabsTrigger value="itinerary" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm py-2.5">
              Day-by-Day
            </TabsTrigger>
            <TabsTrigger value="inclusions" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm py-2.5">
              Inclusions
            </TabsTrigger>
            <TabsTrigger value="reviews" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm py-2.5">
              Reviews
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100">
                <CardContent className="p-4">
                  <Calendar className="h-8 w-8 text-blue-600 mb-2" />
                  <p className="text-sm text-blue-600 font-medium">Duration</p>
                  <p className="text-2xl font-bold text-blue-900">{numberOfDays}D / {numberOfNights}N</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-100">
                <CardContent className="p-4">
                  <CreditCard className="h-8 w-8 text-green-600 mb-2" />
                  <p className="text-sm text-green-600 font-medium">Total Price</p>
                  <p className="text-2xl font-bold text-green-900">{formatCurrency(totalPrice, currency)}</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-100">
                <CardContent className="p-4">
                  <Users className="h-8 w-8 text-purple-600 mb-2" />
                  <p className="text-sm text-purple-600 font-medium">Travelers</p>
                  <p className="text-2xl font-bold text-purple-900">{travelersCount} person(s)</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-100">
                <CardContent className="p-4">
                  <MapPin className="h-8 w-8 text-amber-600 mb-2" />
                  <p className="text-sm text-amber-600 font-medium">Destinations</p>
                  <p className="text-2xl font-bold text-amber-900">{destinations.length || 1} place(s)</p>
                </CardContent>
              </Card>
            </div>

            {/* Trip Summary */}
            {overview.summary && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Info className="h-5 w-5 text-blue-600" />
                    Trip Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">{overview.summary}</p>
                </CardContent>
              </Card>
            )}

            {/* Travel Dates */}
            {(overview.startDate || overview.endDate) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    Travel Dates
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex-1 min-w-[200px]">
                      <p className="text-sm text-muted-foreground mb-1">Departure</p>
                      <p className="text-lg font-semibold">{formatDate(overview.startDate || '')}</p>
                    </div>
                    <div className="hidden sm:block text-2xl text-muted-foreground">→</div>
                    <div className="flex-1 min-w-[200px]">
                      <p className="text-sm text-muted-foreground mb-1">Return</p>
                      <p className="text-lg font-semibold">{formatDate(overview.endDate || '')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Itinerary Highlights */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-amber-500" />
                  Itinerary Highlights
                </CardTitle>
              </CardHeader>
              <CardContent>
                {highlightItems.length > 0 ? (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {highlightItems.slice(0, 6).map((item, index) => (
                      <div key={`${item.dayNumber}-${index}`} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                          {getActivityIcon(item.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{item.title}</p>
                          <p className="text-xs text-muted-foreground">Day {item.dayNumber}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-4">
                    Detailed itinerary highlights will be shared after booking confirmation.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Itinerary Tab */}
          <TabsContent value="itinerary" className="space-y-6">
            {hasDayPlans ? (
              // Render day plans (simplified structure)
              dayPlans
                .sort((a, b) => a.dayNumber - b.dayNumber)
                .map((dayPlan) => {
                  // Calculate the actual date for this day
                  const startDate = overview.startDate ? new Date(overview.startDate) : null;
                  const dayDate = startDate 
                    ? new Date(startDate.getTime() + (dayPlan.dayNumber - 1) * 24 * 60 * 60 * 1000)
                    : null;
                  const dateStr = dayDate 
                    ? dayDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                    : '';
                  
                  return (
                    <Card key={dayPlan.dayNumber} className="overflow-hidden">
                      <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
                        <CardTitle className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                            {dayPlan.dayNumber}
                          </div>
                          <div>
                            <p className="text-lg font-bold">Day {dayPlan.dayNumber} — {dayPlan.title}</p>
                            {dateStr && (
                              <p className="text-sm text-muted-foreground font-normal">
                                {dateStr}
                              </p>
                            )}
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4">
                        {dayPlan.description && (
                          <p className="text-muted-foreground mb-4">{dayPlan.description}</p>
                        )}
                        {dayPlan.activities && dayPlan.activities.length > 0 ? (
                          <div className="space-y-3">
                            {dayPlan.activities.map((activity, idx) => (
                              <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0 font-medium">
                                  {idx + 1}
                                </div>
                                <p className="flex-1 pt-1">{activity}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-muted-foreground italic text-center py-2">
                            No activities planned for this day yet.
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
            ) : Object.keys(itemsByDay).length > 0 ? (
              // Fallback to items-based rendering
              Object.entries(itemsByDay).map(([dayNum, dayItems]) => (
                <Card key={dayNum} className="overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
                    <CardTitle className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                        {dayNum}
                      </div>
                      <div>
                        <p className="text-lg font-bold">Day {dayNum}</p>
                        <p className="text-sm text-muted-foreground font-normal">
                          {dayItems.length} activities planned
                        </p>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y">
                      {dayItems.map((item, index) => (
                        <div key={item.id || index} className="p-4 hover:bg-slate-50 transition-colors">
                          <div className="flex items-start gap-4">
                            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                              {getActivityIcon(item.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold">{item.title}</h4>
                                {item.confirmed && (
                                  <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                                    Confirmed
                                  </Badge>
                                )}
                              </div>
                              {item.description && (
                                <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                              )}
                              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                                {item.startTime && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {item.startTime}
                                    {item.endTime && ` - ${item.endTime}`}
                                  </span>
                                )}
                                {item.location && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {item.location}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="py-16 text-center">
                  <Calendar className="h-16 w-16 mx-auto mb-4 text-slate-200" />
                  <h3 className="text-xl font-semibold mb-2">Day-by-Day Itinerary</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Your detailed daily itinerary with activities, timings, and locations will be shared after you confirm your booking.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Inclusions Tab */}
          <TabsContent value="inclusions" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="border-green-200">
                <CardHeader className="bg-green-50 border-b border-green-100">
                  <CardTitle className="flex items-center gap-2 text-green-700">
                    <CheckCircle className="h-5 w-5" />
                    What&apos;s Included
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {(pricing.inclusions || proposal.inclusions || []).length > 0 ? (
                    <ul className="space-y-3">
                      {(pricing.inclusions || proposal.inclusions || []).map((item, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">
                      Inclusion details will be shared after booking.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card className="border-red-200">
                <CardHeader className="bg-red-50 border-b border-red-100">
                  <CardTitle className="flex items-center gap-2 text-red-700">
                    <XCircle className="h-5 w-5" />
                    Not Included
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {(pricing.exclusions || proposal.exclusions || []).length > 0 ? (
                    <ul className="space-y-3">
                      {(pricing.exclusions || proposal.exclusions || []).map((item, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <XCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">
                      All standard items are included in this package.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {pricing.paymentTerms && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-blue-600" />
                    Payment Terms
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{pricing.paymentTerms}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews" className="space-y-6">
            <Card>
              <CardContent className="py-16 text-center">
                <div className="h-20 w-20 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
                  <Star className="h-10 w-10 text-amber-500" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Agent Reviews</h3>
                {proposal.agent?.rating && proposal.agent.rating > 0 ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star 
                          key={star}
                          className={`h-8 w-8 ${
                            star <= Math.round(proposal.agent?.rating || 0)
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'fill-gray-200 text-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-3xl font-bold">{proposal.agent.rating.toFixed(1)}</p>
                    <p className="text-muted-foreground">
                      Based on {proposal.agent.totalReviews || 0} reviews
                    </p>
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    This agent is new to our platform. Be among the first to book!
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Sticky Bottom Bar (Mobile) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t shadow-lg p-4 lg:hidden z-50">
        <div className="flex items-center justify-between max-w-xl mx-auto gap-4">
          <div>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(totalPrice, currency)}
            </p>
            <p className="text-sm text-muted-foreground">
              {numberOfDays} Days • {travelersCount} travelers
            </p>
          </div>
          <Button 
            onClick={handleBookNow} 
            size="lg" 
            className="px-8 bg-gradient-to-r from-blue-600 to-indigo-600"
            disabled={bookingInProgress}
          >
            {bookingInProgress ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Book Now'}
          </Button>
        </div>
      </div>
    </div>
  );
}
