'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  Clock,
  DollarSign,
  FileText,
  Edit,
  Send,
  Copy,
  Trash2,
  CheckCircle,
  AlertCircle,
  Star,
  ChevronRight,
  Plus,
  MoreVertical,
  Download,
  Share2,
  Eye,
  MessageSquare,
} from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Skeleton,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui';
import { cn } from '@/lib/utils';
import { getAgentItineraryById, type AgentItinerary } from '@/lib/data/agent';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function formatCurrency(amount: number, currency = 'INR'): string {
  // Amount is stored as whole currency units (not cents/paise)
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
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(timeStr?: string): string {
  if (!timeStr) return '';
  return timeStr;
}

function getStatusConfig(status: string): {
  label: string;
  variant: 'success' | 'warning' | 'info' | 'default' | 'destructive';
  icon: React.ReactNode;
} {
  const configs: Record<string, { label: string; variant: 'success' | 'warning' | 'info' | 'default' | 'destructive'; icon: React.ReactNode }> = {
    draft: { label: 'Draft', variant: 'default', icon: <FileText className="h-4 w-4" /> },
    submitted: { label: 'Submitted', variant: 'info', icon: <Send className="h-4 w-4" /> },
    sent: { label: 'Sent to Client', variant: 'info', icon: <Send className="h-4 w-4" /> },
    under_review: { label: 'Under Review', variant: 'warning', icon: <Eye className="h-4 w-4" /> },
    approved: { label: 'Approved', variant: 'success', icon: <CheckCircle className="h-4 w-4" /> },
    revision_requested: { label: 'Revision Requested', variant: 'warning', icon: <AlertCircle className="h-4 w-4" /> },
    completed: { label: 'Completed', variant: 'success', icon: <CheckCircle className="h-4 w-4" /> },
    rejected: { label: 'Rejected', variant: 'destructive', icon: <AlertCircle className="h-4 w-4" /> },
    cancelled: { label: 'Cancelled', variant: 'destructive', icon: <AlertCircle className="h-4 w-4" /> },
    archived: { label: 'Archived', variant: 'default', icon: <FileText className="h-4 w-4" /> },
  };
  return configs[status?.toLowerCase()] || { label: status || 'Unknown', variant: 'default', icon: null };
}

function getItemTypeIcon(type: string): React.ReactNode {
  const icons: Record<string, string> = {
    flight: '✈️',
    hotel: '🏨',
    activity: '🎯',
    transfer: '🚗',
    meal: '🍽️',
    sightseeing: '📸',
    rest: '☕',
    other: '📌',
  };
  return icons[type?.toLowerCase()] || '📌';
}

// ============================================================================
// LOADING SKELETON
// ============================================================================

function ItineraryDetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-6 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Content Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </CardContent>
          </Card>
        </div>
        <div>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-24" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ItineraryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const itineraryId = params.itineraryId as string;

  const [itinerary, setItinerary] = useState<AgentItinerary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    async function fetchItinerary() {
      if (!itineraryId) return;

      try {
        setLoading(true);
        setError(null);
        const data = await getAgentItineraryById(itineraryId);
        if (!data) {
          setError('Itinerary not found');
        } else {
          setItinerary(data);
        }
      } catch (err) {
        console.error('Error fetching itinerary:', err);
        setError(err instanceof Error ? err.message : 'Failed to load itinerary');
      } finally {
        setLoading(false);
      }
    }

    fetchItinerary();
  }, [itineraryId]);

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <ItineraryDetailSkeleton />
      </div>
    );
  }

  if (error || !itinerary) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {error || 'Itinerary not found'}
            </h2>
            <p className="text-gray-500 mb-6">
              The itinerary you're looking for doesn't exist or you don't have permission to view it.
            </p>
            <Button onClick={() => router.push('/itineraries')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Itineraries
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const overview = itinerary.overview || {
    title: '',
    summary: '',
    startDate: '',
    endDate: '',
    numberOfDays: 0,
    numberOfNights: 0,
    destinations: [] as string[],
    travelersCount: 1,
    tripType: 'LEISURE',
  };
  const pricing = itinerary.pricing || {
    currency: 'INR',
    totalPrice: 0,
    pricePerPerson: undefined as number | undefined,
    depositAmount: undefined as number | undefined,
    inclusions: [] as string[],
    exclusions: [] as string[],
    paymentTerms: undefined as string | undefined,
  };
  const items = itinerary.items || [];
  const dayPlans = itinerary.dayPlans || [];
  const statusConfig = getStatusConfig(itinerary.status);

  // Group items by day (used as fallback if no dayPlans)
  const itemsByDay: Record<number, typeof items> = {};
  items.forEach((item) => {
    const day = item.dayNumber || 1;
    if (!itemsByDay[day]) itemsByDay[day] = [];
    itemsByDay[day].push(item);
  });

  // Determine if we have day plans to display
  const hasDayPlans = dayPlans.length > 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push('/itineraries')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-gray-900">
                {overview.title || 'Untitled Itinerary'}
              </h1>
              <Badge variant={statusConfig.variant} className="gap-1">
                {statusConfig.icon}
                {statusConfig.label}
              </Badge>
            </div>
            <p className="text-gray-500">
              {(overview.destinations || []).join(' → ') || 'No destinations set'} •{' '}
              {overview.numberOfDays || 0} days, {overview.numberOfNights || 0} nights
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          {/* Allow editing for draft, submitted, and under_review proposals */}
          {['draft', 'submitted', 'under_review'].includes(itinerary.status?.toLowerCase() || '') && (
            <>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => router.push(`/itineraries/${itineraryId}/edit`)}
              >
                <Edit className="h-4 w-4 mr-2" />
                {itinerary.status?.toLowerCase() === 'draft' ? 'Edit' : 'Update Proposal'}
              </Button>
              {itinerary.status?.toLowerCase() === 'draft' && (
                <Button size="sm">
                  <Send className="h-4 w-4 mr-2" />
                  Submit
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Duration</p>
                <p className="font-semibold">
                  {overview.numberOfDays || 0}D / {overview.numberOfNights || 0}N
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Price</p>
                <p className="font-semibold">
                  {formatCurrency(pricing.totalPrice || 0, pricing.currency)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Travelers</p>
                <p className="font-semibold">{overview.travelersCount || 1} person(s)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <FileText className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Days Planned</p>
                <p className="font-semibold">
                  {hasDayPlans ? `${dayPlans.length} days` : `${items.length} items`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="itinerary">Day-by-Day</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
          <TabsTrigger value="terms">Terms</TabsTrigger>
        </TabsList>

        <div className="mt-6">
          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {/* Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Trip Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 whitespace-pre-wrap">
                      {overview.summary || 'No summary provided.'}
                    </p>
                  </CardContent>
                </Card>

                {/* Quick Itinerary View */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg">Itinerary Highlights</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveTab('itinerary')}
                    >
                      View Full
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {items.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                        <p>No itinerary items added yet.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {items.slice(0, 5).map((item, idx) => (
                          <div
                            key={item.id || idx}
                            className="flex items-start gap-3 p-3 rounded-lg bg-gray-50"
                          >
                            <span className="text-2xl">{getItemTypeIcon(item.type)}</span>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900">{item.title}</p>
                              <p className="text-sm text-gray-500">
                                Day {item.dayNumber}
                                {item.startTime && ` • ${item.startTime}`}
                                {item.location && ` • ${item.location}`}
                              </p>
                            </div>
                          </div>
                        ))}
                        {items.length > 5 && (
                          <p className="text-sm text-gray-500 text-center pt-2">
                            +{items.length - 5} more items
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Trip Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Trip Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Travel Dates</p>
                        <p className="font-medium">
                          {formatDate(overview.startDate)} - {formatDate(overview.endDate)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <MapPin className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Destinations</p>
                        <p className="font-medium">
                          {(overview.destinations || []).join(', ') || 'Not specified'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Users className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Trip Type</p>
                        <p className="font-medium capitalize">
                          {overview.tripType?.toLowerCase() || 'Leisure'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Price Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Price Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Total Price</span>
                      <span className="font-semibold">
                        {formatCurrency(pricing.totalPrice || 0, pricing.currency)}
                      </span>
                    </div>
                    {pricing.pricePerPerson && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Per Person</span>
                        <span>
                          {formatCurrency(pricing.pricePerPerson, pricing.currency)}
                        </span>
                      </div>
                    )}
                    {pricing.depositAmount && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Deposit Required</span>
                        <span>
                          {formatCurrency(pricing.depositAmount, pricing.currency)}
                        </span>
                      </div>
                    )}
                    <div className="pt-3 border-t">
                      <div className="flex justify-between text-emerald-600">
                        <span>Your Commission (10%)</span>
                        <span className="font-semibold">
                          {formatCurrency(Math.round((pricing.totalPrice || 0) * 0.1), pricing.currency)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Timestamps */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Activity</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Created</span>
                      <span>{formatDate(itinerary.createdAt)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Last Updated</span>
                      <span>{formatDate(itinerary.updatedAt)}</span>
                    </div>
                    {itinerary.submittedAt && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Submitted</span>
                        <span>{formatDate(itinerary.submittedAt)}</span>
                      </div>
                    )}
                    {itinerary.approvedAt && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Approved</span>
                        <span>{formatDate(itinerary.approvedAt)}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Day-by-Day Tab */}
          <TabsContent value="itinerary" className="space-y-6">
            {!hasDayPlans && Object.keys(itemsByDay).length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No itinerary items yet
                  </h3>
                  <p className="text-gray-500 mb-4">
                    Start building your day-by-day itinerary.
                  </p>
                  {['draft', 'submitted', 'under_review'].includes(itinerary.status?.toLowerCase() || '') && (
                    <Button onClick={() => router.push(`/itineraries/${itineraryId}/edit`)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Day-by-Day Details
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : hasDayPlans ? (
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
                    <Card key={dayPlan.dayNumber}>
                      <CardHeader className="bg-gray-50 border-b">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Calendar className="h-5 w-5 text-indigo-600" />
                          <span>Day {dayPlan.dayNumber}</span>
                          {dateStr && (
                            <span className="text-sm font-normal text-gray-500">
                              ({dateStr})
                            </span>
                          )}
                          <span className="mx-2">—</span>
                          <span className="font-normal">{dayPlan.title}</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4">
                        {dayPlan.description && (
                          <p className="text-gray-600 mb-4">{dayPlan.description}</p>
                        )}
                        {dayPlan.activities && dayPlan.activities.length > 0 ? (
                          <div className="space-y-2">
                            <h4 className="font-medium text-gray-700 flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              Activities
                            </h4>
                            <ul className="space-y-2 ml-6">
                              {dayPlan.activities.map((activity, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <span className="text-indigo-600 font-medium">{idx + 1}.</span>
                                  <span>{activity}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : (
                          <p className="text-gray-500 italic">No activities planned for this day.</p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
            ) : (
              // Fallback to items-based rendering
              Object.entries(itemsByDay)
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([day, dayItems]) => (
                  <Card key={day}>
                    <CardHeader className="bg-gray-50 border-b">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-indigo-600" />
                        Day {day}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="divide-y">
                        {dayItems.map((item, idx) => (
                          <div
                            key={item.id || idx}
                            className="p-4 flex items-start gap-4 hover:bg-gray-50 transition-colors"
                          >
                            <div className="text-3xl">{getItemTypeIcon(item.type)}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between">
                                <div>
                                  <h4 className="font-medium text-gray-900">{item.title}</h4>
                                  <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                                    {item.startTime && (
                                      <span className="flex items-center gap-1">
                                        <Clock className="h-4 w-4" />
                                        {item.startTime}
                                        {item.endTime && ` - ${item.endTime}`}
                                      </span>
                                    )}
                                    {item.location && (
                                      <span className="flex items-center gap-1">
                                        <MapPin className="h-4 w-4" />
                                        {item.location}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {item.confirmed && (
                                  <Badge variant="success" className="gap-1">
                                    <CheckCircle className="h-3 w-3" />
                                    Confirmed
                                  </Badge>
                                )}
                              </div>
                              {item.description && (
                                <p className="text-gray-600 mt-2">{item.description}</p>
                              )}
                              {item.notes && (
                                <p className="text-sm text-amber-600 mt-2 bg-amber-50 p-2 rounded">
                                  📝 {item.notes}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))
            )}
          </TabsContent>

          {/* Pricing Tab */}
          <TabsContent value="pricing" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Inclusions</CardTitle>
                </CardHeader>
                <CardContent>
                  {(pricing.inclusions || []).length === 0 ? (
                    <p className="text-gray-500">No inclusions specified.</p>
                  ) : (
                    <ul className="space-y-2">
                      {(pricing.inclusions || []).map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Exclusions</CardTitle>
                </CardHeader>
                <CardContent>
                  {(pricing.exclusions || []).length === 0 ? (
                    <p className="text-gray-500">No exclusions specified.</p>
                  ) : (
                    <ul className="space-y-2">
                      {(pricing.exclusions || []).map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>

            {pricing.paymentTerms && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Payment Terms</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 whitespace-pre-wrap">{pricing.paymentTerms}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Terms Tab */}
          <TabsContent value="terms" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Terms & Conditions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 whitespace-pre-wrap">
                  {itinerary.termsAndConditions || 'No terms and conditions specified.'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Cancellation Policy</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 whitespace-pre-wrap">
                  {itinerary.cancellationPolicy || 'No cancellation policy specified.'}
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
