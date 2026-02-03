'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  IndianRupee,
  Plus,
  Trash2,
  Save,
  Loader2,
  AlertCircle,
  FileText,
  RefreshCw,
  GripVertical,
  Clock,
} from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Input,
  Textarea,
  Badge,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Label,
  Separator,
} from '@/components/ui';
import { cn } from '@/lib/utils';
import { useAgentSession } from '@/lib/agent/session';
import {
  getAgentItineraryById,
  updateItinerary,
  updateProposal,
  type AgentItinerary,
  type UpdateItineraryInput,
  type UpdateProposalInput,
} from '@/lib/data/agent';

// ============================================================================
// TYPES
// ============================================================================

interface DayPlan {
  dayNumber: number;
  title: string;
  description: string;
  activities: string[];
}

interface FormState {
  title: string;
  summary: string;
  startDate: string;
  endDate: string;
  destinations: string[];
  tripType: string;
  travelersCount: number;
  totalPrice: number;
  pricePerPerson: number;
  depositAmount: number;
  currency: string;
  inclusions: string[];
  exclusions: string[];
  termsAndConditions: string;
  cancellationPolicy: string;
  internalNotes: string;
  days: DayPlan[];
  changeReason: string;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Calculate number of days between two dates (inclusive)
 */
function calculateNumberOfDays(startDate: string, endDate: string): number {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);
}

/**
 * Generate empty day plans for a given number of days
 */
function generateDayPlans(numberOfDays: number, existingDays: DayPlan[] = []): DayPlan[] {
  const days: DayPlan[] = [];
  for (let i = 1; i <= numberOfDays; i++) {
    const existing = existingDays.find(d => d.dayNumber === i);
    if (existing) {
      days.push(existing);
    } else {
      days.push({
        dayNumber: i,
        title: `Day ${i}`,
        description: '',
        activities: [''],
      });
    }
  }
  return days;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function EditItineraryPage() {
  const params = useParams();
  const router = useRouter();
  const itineraryId = params.itineraryId as string;
  const { agent } = useAgentSession();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [itinerary, setItinerary] = useState<AgentItinerary | null>(null);

  const [form, setForm] = useState<FormState>({
    title: '',
    summary: '',
    startDate: '',
    endDate: '',
    destinations: [],
    tripType: 'LEISURE',
    travelersCount: 1,
    totalPrice: 0,
    pricePerPerson: 0,
    depositAmount: 0,
    currency: 'INR',  // Fixed to INR only
    inclusions: [],
    exclusions: [],
    termsAndConditions: '',
    cancellationPolicy: '',
    internalNotes: '',
    days: [],
    changeReason: '',
  });

  // Load existing itinerary
  useEffect(() => {
    async function loadItinerary() {
      if (!itineraryId) return;

      try {
        setLoading(true);
        const data = await getAgentItineraryById(itineraryId);
        
        if (!data) {
          setError('Itinerary not found');
          return;
        }

        setItinerary(data);

        // Populate form with existing data
        const overview = data.overview || {} as AgentItinerary['overview'];
        const pricing = data.pricing || {} as NonNullable<AgentItinerary['pricing']>;
        
        // Convert ISO dates to YYYY-MM-DD format for input fields
        const formatDateForInput = (isoDate: string | undefined): string => {
          if (!isoDate) return '';
          try {
            return new Date(isoDate).toISOString().split('T')[0];
          } catch {
            return isoDate.split('T')[0] || '';
          }
        };
        
        setForm({
          title: overview.title || '',
          summary: overview.summary || '',
          startDate: formatDateForInput(overview.startDate),
          endDate: formatDateForInput(overview.endDate),
          destinations: overview.destinations || [],
          tripType: overview.tripType || 'LEISURE',
          travelersCount: overview.travelersCount || 1,
          totalPrice: pricing.totalPrice || 0,
          pricePerPerson: pricing.pricePerPerson || 0,
          depositAmount: pricing.depositAmount || 0,
          currency: pricing.currency || 'INR',
          inclusions: pricing.inclusions || [],
          exclusions: pricing.exclusions || [],
          termsAndConditions: data.termsAndConditions || '',
          cancellationPolicy: data.cancellationPolicy || '',
          internalNotes: data.internalNotes || '',
          // Prefer dayPlans if available, otherwise convert items to day plans
          days: data.dayPlans && data.dayPlans.length > 0
            ? data.dayPlans.map(dp => ({
                dayNumber: dp.dayNumber,
                title: dp.title || `Day ${dp.dayNumber}`,
                description: dp.description || '',
                activities: dp.activities || [],
              }))
            : (data.items || []).reduce((acc: DayPlan[], item) => {
                const dayNum = item.dayNumber || 1;
                const existingDay = acc.find(d => d.dayNumber === dayNum);
                if (existingDay) {
                  existingDay.activities.push(item.title);
                } else {
                  acc.push({
                    dayNumber: dayNum,
                    title: `Day ${dayNum}`,
                    description: '',
                    activities: [item.title],
                  });
                }
                return acc;
              }, []),
          changeReason: '',
        });
      } catch (err) {
        console.error('Error loading itinerary:', err);
        setError(err instanceof Error ? err.message : 'Failed to load itinerary');
      } finally {
        setLoading(false);
      }
    }

    loadItinerary();
  }, [itineraryId]);

  // Auto-generate days when dates exist but days array is empty
  useEffect(() => {
    if (!loading && form.startDate && form.endDate && form.days.length === 0) {
      const numDays = calculateNumberOfDays(form.startDate, form.endDate);
      if (numDays > 0) {
        setForm(prev => ({
          ...prev,
          days: generateDayPlans(numDays, [])
        }));
      }
    }
  }, [loading, form.startDate, form.endDate, form.days.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itinerary) return;

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      // Calculate number of days and nights
      const startDate = form.startDate ? new Date(form.startDate) : new Date();
      const endDate = form.endDate ? new Date(form.endDate) : new Date();
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      const numberOfDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);
      const numberOfNights = Math.max(0, numberOfDays - 1);

      // Convert dates to ISO format (backend expects datetime format)
      const startDateISO = form.startDate ? new Date(form.startDate + 'T00:00:00Z').toISOString() : undefined;
      const endDateISO = form.endDate ? new Date(form.endDate + 'T23:59:59Z').toISOString() : undefined;

      // Build update input
      const updateInput = {
        overview: {
          title: form.title || undefined,
          summary: form.summary || undefined,
          startDate: startDateISO,
          endDate: endDateISO,
          numberOfDays,
          numberOfNights,
          destinations: form.destinations.length > 0 ? form.destinations : undefined,
          travelersCount: form.travelersCount,
          tripType: form.tripType || undefined,
        },
        pricing: {
          totalPrice: form.totalPrice,
          pricePerPerson: form.pricePerPerson > 0 ? form.pricePerPerson : undefined,
          depositAmount: form.depositAmount > 0 ? form.depositAmount : undefined,
          currency: form.currency,
          inclusions: form.inclusions.length > 0 ? form.inclusions : undefined,
          exclusions: form.exclusions.length > 0 ? form.exclusions : undefined,
        },
        // Convert day plans for API
        dayPlans: form.days.map(day => ({
          dayNumber: day.dayNumber,
          title: day.title,
          description: day.description || undefined,
          activities: day.activities.filter(a => a.trim()),
        })),
        termsAndConditions: form.termsAndConditions || undefined,
        cancellationPolicy: form.cancellationPolicy || undefined,
        internalNotes: form.internalNotes || undefined,
        changeReason: form.changeReason,
      };

      // Use updateProposal for submitted/under_review proposals, updateItinerary for drafts
      const isDraft = itinerary.status?.toLowerCase() === 'draft';
      
      if (isDraft) {
        await updateItinerary(itineraryId, updateInput);
      } else {
        // For submitted proposals, require a change reason
        if (!form.changeReason.trim()) {
          setError('Please provide a reason for the update. This will be shared with the traveler.');
          setSaving(false);
          return;
        }
        await updateProposal(itineraryId, updateInput);
      }

      setSuccess(true);
      
      // Redirect back to itinerary detail after a short delay
      setTimeout(() => {
        router.push(`/itineraries/${itineraryId}`);
      }, 1500);
    } catch (err) {
      console.error('Error updating itinerary:', err);
      setError(err instanceof Error ? err.message : 'Failed to update itinerary');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error && !itinerary) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">{error}</h2>
            <Button onClick={() => router.push('/itineraries')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Itineraries
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isSubmitted = ['submitted', 'under_review'].includes(itinerary?.status?.toLowerCase() || '');
  const commissionRate = agent?.commissionRate ?? 0.1;
  const commissionAmount = Math.max(0, Math.round(form.totalPrice * commissionRate));
  const payoutAmount = Math.max(0, form.totalPrice - commissionAmount);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.push(`/itineraries/${itineraryId}`)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isSubmitted ? 'Update Proposal' : 'Edit Itinerary'}
          </h1>
          <p className="text-gray-500">
            {isSubmitted 
              ? 'Make changes to your submitted proposal. The traveler will be notified of the update.'
              : 'Modify your draft itinerary before submitting.'
            }
          </p>
        </div>
      </div>

      {/* Warning for submitted proposals */}
      {isSubmitted && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <RefreshCw className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">Updating a Submitted Proposal</p>
            <p className="text-sm text-amber-700 mt-1">
              This proposal has already been sent to the traveler. Any changes you make will:
            </p>
            <ul className="text-sm text-amber-700 mt-2 list-disc list-inside space-y-1">
              <li>Notify the traveler via email</li>
              <li>Update the proposal version number</li>
              <li>Show a "Updated" indicator on their dashboard</li>
            </ul>
          </div>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-start gap-3">
          <FileText className="h-5 w-5 text-emerald-600 shrink-0" />
          <div>
            <p className="font-medium text-emerald-800">Changes Saved Successfully!</p>
            <p className="text-sm text-emerald-700">
              {isSubmitted 
                ? 'The traveler has been notified about the updated proposal.'
                : 'Your itinerary has been updated.'
              }
            </p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && itinerary && (
        <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 flex items-start gap-3 shadow-sm">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-800">Error</p>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Change Reason (for submitted proposals) */}
        {isSubmitted && (
          <Card className="border-2 border-amber-200 bg-amber-50/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-amber-800">
                <div className="h-8 w-8 rounded-lg bg-amber-500 flex items-center justify-center">
                  <RefreshCw className="h-5 w-5 text-white" />
                </div>
                Reason for Update
              </CardTitle>
              <CardDescription className="text-amber-700">
                Explain what you've changed. This will be shown to the traveler.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={form.changeReason}
                onChange={(e) => setForm({ ...form, changeReason: e.target.value })}
                placeholder="e.g., Updated pricing based on current hotel rates, Added a day trip option, Changed flight times..."
                className="min-h-[100px] bg-white"
                required={isSubmitted}
              />
            </CardContent>
          </Card>
        )}

        {/* Overview Section */}
        <Card className="border-2 border-blue-100">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
                <FileText className="h-5 w-5 text-white" />
              </div>
              Trip Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g., Magical Kerala Backwaters Adventure"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="summary">Summary</Label>
              <Textarea
                id="summary"
                value={form.summary}
                onChange={(e) => setForm({ ...form, summary: e.target.value })}
                placeholder="Describe the highlights of this trip..."
                className="min-h-[100px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={form.startDate}
                  onChange={(e) => {
                    const newStartDate = e.target.value;
                    const numDays = calculateNumberOfDays(newStartDate, form.endDate);
                    setForm({ 
                      ...form, 
                      startDate: newStartDate,
                      days: numDays > 0 ? generateDayPlans(numDays, form.days) : form.days
                    });
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={form.endDate}
                  onChange={(e) => {
                    const newEndDate = e.target.value;
                    const numDays = calculateNumberOfDays(form.startDate, newEndDate);
                    setForm({ 
                      ...form, 
                      endDate: newEndDate,
                      days: numDays > 0 ? generateDayPlans(numDays, form.days) : form.days
                    });
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="destinations">Destinations (comma-separated)</Label>
              <Input
                id="destinations"
                value={form.destinations.join(', ')}
                onChange={(e) => setForm({ 
                  ...form, 
                  destinations: e.target.value.split(',').map(d => d.trim()).filter(d => d.length > 0)
                })}
                placeholder="e.g., Mumbai, Goa, Kerala"
              />
            </div>
          </CardContent>
        </Card>

        {/* Day-by-Day Itinerary */}
        <Card className="border-2 border-indigo-100">
          <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-white" />
              </div>
              Day-by-Day Itinerary
              {form.startDate && form.endDate && (
                <Badge className="ml-2 bg-indigo-600">
                  {calculateNumberOfDays(form.startDate, form.endDate)} days
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {form.startDate && form.endDate 
                ? `Plan activities for each of the ${calculateNumberOfDays(form.startDate, form.endDate)} days of your trip`
                : 'Set the start and end dates above to configure day-by-day details'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            {!form.startDate || !form.endDate ? (
              <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <Calendar className="h-8 w-8 text-gray-400" />
                </div>
                <p className="font-semibold text-gray-700">Set Travel Dates First</p>
                <p className="text-sm text-gray-500 mt-1 max-w-xs mx-auto">
                  Enter start and end dates above to configure the day-by-day itinerary
                </p>
              </div>
            ) : form.days.length === 0 ? (
              <div className="text-center py-12 bg-indigo-50 rounded-xl border-2 border-dashed border-indigo-200">
                <div className="h-16 w-16 rounded-full bg-indigo-100 flex items-center justify-center mx-auto mb-4 animate-pulse">
                  <Calendar className="h-8 w-8 text-indigo-500" />
                </div>
                <p className="font-semibold text-indigo-700">Generating Days...</p>
                <p className="text-sm text-indigo-500 mt-1">Setting up your itinerary</p>
              </div>
            ) : (
              <div className="space-y-4">
                {form.days.map((day, dayIndex) => {
                  const dayDate = form.startDate 
                    ? new Date(new Date(form.startDate).getTime() + (day.dayNumber - 1) * 24 * 60 * 60 * 1000)
                    : null;
                  const dateStr = dayDate 
                    ? dayDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                    : '';
                  
                  return (
                    <div 
                      key={dayIndex} 
                      className="relative border-2 rounded-xl p-5 space-y-4 bg-white hover:border-indigo-200 hover:shadow-md transition-all duration-200"
                    >
                      {/* Day Header */}
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-md">
                            {day.dayNumber}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-900">Day {day.dayNumber}</span>
                              {dateStr && (
                                <Badge variant="outline" className="text-xs font-normal">
                                  {dateStr}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Day Title */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">Day Title</Label>
                        <Input
                          value={day.title}
                          onChange={(e) => {
                            const newDays = [...form.days];
                            newDays[dayIndex].title = e.target.value;
                            setForm({ ...form, days: newDays });
                          }}
                          placeholder={`e.g., Arrival & City Tour`}
                          className="font-medium"
                        />
                      </div>

                      {/* Day Description */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">Description</Label>
                        <Textarea
                          value={day.description}
                          onChange={(e) => {
                            const newDays = [...form.days];
                            newDays[dayIndex].description = e.target.value;
                            setForm({ ...form, days: newDays });
                          }}
                          placeholder="Describe what happens on this day... (optional)"
                          className="min-h-[70px] resize-none"
                        />
                      </div>

                      {/* Activities */}
                      <div className="space-y-3">
                        <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                          <Clock className="h-4 w-4 text-indigo-500" />
                          Activities & Highlights
                        </Label>
                        <div className="space-y-2 pl-1">
                          {day.activities.map((activity, actIndex) => (
                            <div key={actIndex} className="flex gap-2 items-center group">
                              <div className="h-6 w-6 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-medium text-indigo-600 shrink-0">
                                {actIndex + 1}
                              </div>
                              <Input
                                value={activity}
                                onChange={(e) => {
                                  const newDays = [...form.days];
                                  newDays[dayIndex].activities[actIndex] = e.target.value;
                                  setForm({ ...form, days: newDays });
                                }}
                                placeholder={`Activity ${actIndex + 1} - e.g., Visit Taj Mahal at sunrise`}
                                className="flex-1"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 hover:text-red-500"
                                onClick={() => {
                                  const newDays = [...form.days];
                                  newDays[dayIndex].activities = day.activities.filter((_, i) => i !== actIndex);
                                  if (newDays[dayIndex].activities.length === 0) {
                                    newDays[dayIndex].activities = [''];
                                  }
                                  setForm({ ...form, days: newDays });
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-indigo-600 border-indigo-200 hover:bg-indigo-50 hover:border-indigo-300"
                          onClick={() => {
                            const newDays = [...form.days];
                            newDays[dayIndex].activities.push('');
                            setForm({ ...form, days: newDays });
                          }}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Activity
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pricing Section */}
        <Card className="border-2 border-emerald-100">
          <CardHeader className="bg-gradient-to-r from-emerald-50 to-green-50 border-b">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-emerald-600 flex items-center justify-center">
                <IndianRupee className="h-5 w-5 text-white" />
              </div>
              Pricing (INR)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            {/* Number of Travelers */}
            <div className="space-y-2">
              <Label htmlFor="travelersCount" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Number of Travelers
              </Label>
              <Input
                id="travelersCount"
                type="number"
                min="1"
                value={form.travelersCount}
                onChange={(e) => {
                  const travelers = Math.max(1, Number(e.target.value));
                  // Auto-calculate total if pricePerPerson exists
                  const newTotal = form.pricePerPerson > 0 ? form.pricePerPerson * travelers : form.totalPrice;
                  setForm({ 
                    ...form, 
                    travelersCount: travelers,
                    totalPrice: newTotal
                  });
                }}
                placeholder="1"
              />
              <p className="text-xs text-gray-500">Changing this will auto-calculate total price based on per-person price</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pricePerPerson">Price Per Person (₹)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                  <Input
                    id="pricePerPerson"
                    type="number"
                    value={form.pricePerPerson}
                    onChange={(e) => {
                      const perPerson = Number(e.target.value);
                      // Auto-calculate total based on travelers
                      const newTotal = perPerson * form.travelersCount;
                      setForm({ 
                        ...form, 
                        pricePerPerson: perPerson,
                        totalPrice: newTotal
                      });
                    }}
                    className="pl-8"
                    placeholder="0"
                  />
                </div>
                <p className="text-xs text-gray-500">Auto-calculates total price</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="totalPrice">Total Price (₹)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                  <Input
                    id="totalPrice"
                    type="number"
                    value={form.totalPrice}
                    onChange={(e) => {
                      const total = Number(e.target.value);
                      // Auto-calculate per-person based on travelers
                      const newPerPerson = form.travelersCount > 0 ? Math.round(total / form.travelersCount) : 0;
                      setForm({ 
                        ...form, 
                        totalPrice: total,
                        pricePerPerson: newPerPerson
                      });
                    }}
                    className="pl-8"
                    placeholder="0"
                  />
                </div>
                <p className="text-xs text-gray-500">= ₹{form.pricePerPerson.toLocaleString('en-IN')} × {form.travelersCount} travelers</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="depositAmount">Deposit Amount (₹)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                <Input
                  id="depositAmount"
                  type="number"
                  value={form.depositAmount}
                  onChange={(e) => setForm({ ...form, depositAmount: Number(e.target.value) })}
                  className="pl-8"
                  placeholder="0"
                />
              </div>
            </div>

            <Separator className="my-4" />

            {/* Commission & Payout */}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-emerald-800">Platform commission ({Math.round(commissionRate * 100)}%)</span>
                <span className="font-semibold text-emerald-900">{formatCurrency(commissionAmount)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700 font-medium">Estimated payout</span>
                <span className="text-lg font-semibold text-emerald-700">{formatCurrency(payoutAmount)}</span>
              </div>
              <p className="text-xs text-emerald-700">
                Estimated earnings after platform commission for planning purposes.
              </p>
            </div>

            {/* Inclusions */}
            <div className="space-y-2">
              <Label htmlFor="inclusions">Inclusions</Label>
              <p className="text-sm text-gray-500">What's included in the price (one per line)</p>
              <Textarea
                id="inclusions"
                value={form.inclusions.join('\n')}
                onChange={(e) => setForm({ 
                  ...form, 
                  inclusions: e.target.value.split('\n').map(i => i.trim()).filter(i => i.length > 0)
                })}
                placeholder="e.g.,&#10;Accommodation (5 nights)&#10;All meals&#10;Airport transfers&#10;Guided tours"
                className="min-h-[120px]"
              />
            </div>

            {/* Exclusions */}
            <div className="space-y-2">
              <Label htmlFor="exclusions">Exclusions</Label>
              <p className="text-sm text-gray-500">What's NOT included in the price (one per line)</p>
              <Textarea
                id="exclusions"
                value={form.exclusions.join('\n')}
                onChange={(e) => setForm({ 
                  ...form, 
                  exclusions: e.target.value.split('\n').map(i => i.trim()).filter(i => i.length > 0)
                })}
                placeholder="e.g.,&#10;International flights&#10;Travel insurance&#10;Personal expenses&#10;Tips and gratuities"
                className="min-h-[120px]"
              />
            </div>
          </CardContent>
        </Card>

        {/* Terms and Conditions */}
        <Card className="border-2 border-slate-200">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-50 border-b">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-slate-600 flex items-center justify-center">
                <FileText className="h-5 w-5 text-white" />
              </div>
              Terms and Conditions
            </CardTitle>
            <CardDescription>
              Legal terms for this itinerary (visible to traveler)
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <Textarea
              value={form.termsAndConditions}
              onChange={(e) => setForm({ ...form, termsAndConditions: e.target.value })}
              placeholder="Enter the terms and conditions for this trip..."
              className="min-h-[150px]"
            />
          </CardContent>
        </Card>

        {/* Cancellation Policy */}
        <Card className="border-2 border-orange-100">
          <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 border-b">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-orange-500 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-white" />
              </div>
              Cancellation Policy
            </CardTitle>
            <CardDescription>
              Cancellation terms and refund policy (visible to traveler)
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <Textarea
              value={form.cancellationPolicy}
              onChange={(e) => setForm({ ...form, cancellationPolicy: e.target.value })}
              placeholder="e.g., Full refund if cancelled 30 days before departure, 50% refund if cancelled 14 days before..."
              className="min-h-[150px]"
            />
          </CardContent>
        </Card>

        {/* Internal Notes */}
        <Card className="border-2 border-gray-200 border-dashed">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-gray-600">
              <div className="h-8 w-8 rounded-lg bg-gray-400 flex items-center justify-center">
                <FileText className="h-5 w-5 text-white" />
              </div>
              Internal Notes
              <Badge variant="outline" className="text-xs">Private</Badge>
            </CardTitle>
            <CardDescription>
              Private notes (not visible to the traveler)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={form.internalNotes}
              onChange={(e) => setForm({ ...form, internalNotes: e.target.value })}
              placeholder="Add any internal notes about this itinerary..."
              className="min-h-[100px]"
            />
          </CardContent>
        </Card>

        {/* Submit Buttons */}
        <div className="flex items-center justify-end gap-4 pt-4 pb-8">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/itineraries/${itineraryId}`)}
            disabled={saving}
            className="px-6"
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={saving}
            className="px-8 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {isSubmitted ? 'Update & Notify Traveler' : 'Save Changes'}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
