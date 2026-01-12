'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  DollarSign,
  Clock,
  Plus,
  Trash2,
  Save,
  Send,
  Loader2,
  CheckCircle,
  AlertCircle,
  Info,
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
  getTravelRequestDetails,
  createItinerary,
  type TravelRequestDetails,
  type CreateItineraryInput,
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
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function parseDestination(dest: any): string[] {
  if (!dest) return [];
  if (typeof dest === 'string') {
    try {
      dest = JSON.parse(dest);
    } catch {
      return [dest];
    }
  }
  if (dest.regions && Array.isArray(dest.regions)) {
    return dest.regions;
  }
  if (dest.country) {
    return [dest.country];
  }
  return [];
}

function parseTravelers(travelers: any): { adults: number; children: number; infants: number } {
  if (!travelers) return { adults: 2, children: 0, infants: 0 };
  if (typeof travelers === 'string') {
    try {
      travelers = JSON.parse(travelers);
    } catch {
      return { adults: 2, children: 0, infants: 0 };
    }
  }
  return {
    adults: travelers.adults ?? 2,
    children: travelers.children ?? 0,
    infants: travelers.infants ?? 0,
  };
}

function formatCurrency(amount: number, currency: string = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

function calculateDays(startDate: string, endDate: string): number {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

// ============================================================================
// COMPONENTS
// ============================================================================

function RequestSummaryCard({ request }: { request: TravelRequestDetails }) {
  const destinations = parseDestination(request.destination);
  const travelers = parseTravelers(request.travelers);
  const totalTravelers = travelers.adults + travelers.children + travelers.infants;

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Info className="h-5 w-5 text-blue-600" />
          <CardTitle className="text-lg text-blue-900">Request Summary</CardTitle>
        </div>
        <CardDescription>Creating itinerary for this travel request</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-blue-600" />
            <span className="text-gray-600">Destination:</span>
            <span className="font-medium">{destinations.join(', ') || 'TBD'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-600" />
            <span className="text-gray-600">Dates:</span>
            <span className="font-medium">
              {request.departureDate && request.returnDate
                ? `${new Date(request.departureDate).toLocaleDateString()} - ${new Date(request.returnDate).toLocaleDateString()}`
                : 'Flexible'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-600" />
            <span className="text-gray-600">Travelers:</span>
            <span className="font-medium">
              {travelers.adults} adults{travelers.children > 0 && `, ${travelers.children} children`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-blue-600" />
            <span className="text-gray-600">Budget:</span>
            <span className="font-medium">
              {request.budgetMin && request.budgetMax
                ? `${formatCurrency(request.budgetMin)} - ${formatCurrency(request.budgetMax)}`
                : 'Not specified'}
            </span>
          </div>
        </div>
        {request.client && (
          <div className="pt-2 border-t border-blue-200">
            <span className="text-sm text-gray-600">Client: </span>
            <span className="text-sm font-medium">{request.client.firstName} {request.client.lastName}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DayPlanCard({
  day,
  onChange,
  onRemove,
  canRemove,
}: {
  day: DayPlan;
  onChange: (day: DayPlan) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const addActivity = () => {
    onChange({ ...day, activities: [...day.activities, ''] });
  };

  const updateActivity = (index: number, value: string) => {
    const newActivities = [...day.activities];
    newActivities[index] = value;
    onChange({ ...day, activities: newActivities });
  };

  const removeActivity = (index: number) => {
    onChange({ ...day, activities: day.activities.filter((_, i) => i !== index) });
  };

  return (
    <Card className="border-l-4 border-l-indigo-500">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Day {day.dayNumber}</CardTitle>
          {canRemove && (
            <Button variant="ghost" size="sm" onClick={onRemove} className="text-red-600 hover:text-red-700">
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor={`day-${day.dayNumber}-title`}>Day Title</Label>
          <Input
            id={`day-${day.dayNumber}-title`}
            placeholder="e.g., Arrival & City Exploration"
            value={day.title}
            onChange={(e) => onChange({ ...day, title: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor={`day-${day.dayNumber}-description`}>Description</Label>
          <Textarea
            id={`day-${day.dayNumber}-description`}
            placeholder="Describe the day's plan..."
            value={day.description}
            onChange={(e) => onChange({ ...day, description: e.target.value })}
            rows={2}
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>Activities</Label>
            <Button variant="ghost" size="sm" onClick={addActivity} className="text-indigo-600">
              <Plus className="h-4 w-4 mr-1" />
              Add Activity
            </Button>
          </div>
          <div className="space-y-2">
            {day.activities.map((activity, idx) => (
              <div key={idx} className="flex gap-2">
                <Input
                  placeholder={`Activity ${idx + 1}`}
                  value={activity}
                  onChange={(e) => updateActivity(idx, e.target.value)}
                />
                <Button variant="ghost" size="sm" onClick={() => removeActivity(idx)} className="text-gray-400">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

function NewItineraryPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestId = searchParams.get('requestId');
  const { agent } = useAgentSession();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [request, setRequest] = useState<TravelRequestDetails | null>(null);

  const [form, setForm] = useState<FormState>({
    title: '',
    summary: '',
    startDate: '',
    endDate: '',
    destinations: [],
    tripType: 'leisure',
    totalPrice: 0,
    pricePerPerson: 0,
    depositAmount: 0,
    currency: 'INR',
    inclusions: ['Accommodation', 'Breakfast', 'Airport transfers', 'Sightseeing'],
    exclusions: ['Flights', 'Travel insurance', 'Personal expenses'],
    termsAndConditions: '',
    cancellationPolicy: '',
    internalNotes: '',
    days: [{ dayNumber: 1, title: '', description: '', activities: [''] }],
  });

  // Load request details
  useEffect(() => {
    if (!requestId) {
      setLoading(false);
      return;
    }

    const loadRequest = async () => {
      try {
        const req = await getTravelRequestDetails(requestId);
        if (req) {
          setRequest(req);
          const destinations = parseDestination(req.destination);
          const travelers = parseTravelers(req.travelers);
          const totalTravelers = travelers.adults + travelers.children;
          const days = calculateDays(req.departureDate, req.returnDate);

          // Pre-fill form with request data
          setForm((prev) => ({
            ...prev,
            title: `${destinations.join(' & ')} Trip` || req.title || 'Untitled Trip',
            startDate: req.departureDate?.split('T')[0] || '',
            endDate: req.returnDate?.split('T')[0] || '',
            destinations,
            totalPrice: req.budgetMax || req.budgetMin || 0,
            pricePerPerson: Math.round((req.budgetMax || req.budgetMin || 0) / totalTravelers),
            depositAmount: Math.round((req.budgetMax || req.budgetMin || 0) * 0.2),
            currency: req.budgetCurrency || 'INR',
            days: Array.from({ length: Math.max(days, 1) }, (_, i) => ({
              dayNumber: i + 1,
              title: '',
              description: '',
              activities: [''],
            })),
          }));
        }
      } catch (err) {
        console.error('Failed to load request:', err);
      } finally {
        setLoading(false);
      }
    };

    loadRequest();
  }, [requestId]);

  // Calculate derived values
  const numberOfDays = useMemo(() => {
    return calculateDays(form.startDate, form.endDate);
  }, [form.startDate, form.endDate]);

  const numberOfNights = Math.max(0, numberOfDays - 1);

  // Update days when date changes
  useEffect(() => {
    if (numberOfDays > 0 && numberOfDays !== form.days.length) {
      if (numberOfDays > form.days.length) {
        // Add more days
        const newDays = [...form.days];
        for (let i = form.days.length; i < numberOfDays; i++) {
          newDays.push({ dayNumber: i + 1, title: '', description: '', activities: [''] });
        }
        setForm((prev) => ({ ...prev, days: newDays }));
      }
    }
  }, [numberOfDays, form.days.length]);

  const updateDay = (index: number, day: DayPlan) => {
    const newDays = [...form.days];
    newDays[index] = day;
    setForm((prev) => ({ ...prev, days: newDays }));
  };

  const removeDay = (index: number) => {
    const newDays = form.days.filter((_, i) => i !== index).map((d, i) => ({ ...d, dayNumber: i + 1 }));
    setForm((prev) => ({ ...prev, days: newDays }));
  };

  const addDay = () => {
    setForm((prev) => ({
      ...prev,
      days: [...prev.days, { dayNumber: prev.days.length + 1, title: '', description: '', activities: [''] }],
    }));
  };

  const handleSubmit = async (asDraft: boolean = true) => {
    if (!requestId || !request) {
      setError('No request selected');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const input: CreateItineraryInput = {
        requestId,
        travelerId: request.userId,
        overview: {
          title: form.title,
          summary: form.summary,
          startDate: form.startDate,
          endDate: form.endDate,
          numberOfDays,
          numberOfNights,
          destinations: form.destinations,
          travelersCount: parseTravelers(request.travelers).adults + parseTravelers(request.travelers).children,
          tripType: form.tripType,
        },
        pricing: {
          currency: form.currency,
          totalPrice: form.totalPrice,
          pricePerPerson: form.pricePerPerson,
          depositAmount: form.depositAmount,
          inclusions: form.inclusions.filter(Boolean),
          exclusions: form.exclusions.filter(Boolean),
        },
        termsAndConditions: form.termsAndConditions,
        cancellationPolicy: form.cancellationPolicy,
        internalNotes: form.internalNotes,
      };

      const result = await createItinerary(input);
      if (result) {
        setSuccess(true);
        setTimeout(() => {
          router.push('/itineraries');
        }, 1500);
      } else {
        setError('Failed to create itinerary');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to create itinerary');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!requestId) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-6 w-6 text-amber-600" />
              <div>
                <h2 className="font-semibold text-amber-900">No Request Selected</h2>
                <p className="text-sm text-amber-700">
                  Please select a travel request to create an itinerary for.
                </p>
              </div>
            </div>
            <div className="mt-4">
              <Link href="/requests">
                <Button variant="outline">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Go to Requests
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <div>
                <h2 className="font-semibold text-green-900">Itinerary Created!</h2>
                <p className="text-sm text-green-700">Redirecting to your itineraries...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/requests">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Create Itinerary</h1>
            <p className="text-sm text-gray-500">Build a personalized travel plan for your client</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleSubmit(true)} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Draft
          </Button>
          <Button onClick={() => handleSubmit(false)} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Save & Send
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Request Summary */}
      {request && <RequestSummaryCard request={request} />}

      {/* Itinerary Details Form */}
      <Card>
        <CardHeader>
          <CardTitle>Itinerary Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="title">Itinerary Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Magical Rajasthan Heritage Tour"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="summary">Summary</Label>
              <Textarea
                id="summary"
                placeholder="Brief overview of the trip..."
                value={form.summary}
                onChange={(e) => setForm({ ...form, summary: e.target.value })}
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="startDate">Start Date *</Label>
              <Input
                id="startDate"
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date *</Label>
              <Input
                id="endDate"
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              />
            </div>
            <div>
              <Label>Duration</Label>
              <div className="flex items-center gap-2 h-10 px-3 bg-gray-100 rounded-md">
                <Clock className="h-4 w-4 text-gray-500" />
                <span>{numberOfDays} days, {numberOfNights} nights</span>
              </div>
            </div>
            <div>
              <Label htmlFor="tripType">Trip Type</Label>
              <Select value={form.tripType} onValueChange={(v) => setForm({ ...form, tripType: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select trip type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="leisure">Leisure</SelectItem>
                  <SelectItem value="adventure">Adventure</SelectItem>
                  <SelectItem value="honeymoon">Honeymoon</SelectItem>
                  <SelectItem value="family">Family</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="pilgrimage">Pilgrimage</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pricing */}
      <Card>
        <CardHeader>
          <CardTitle>Pricing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="totalPrice">Total Price *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                <Input
                  id="totalPrice"
                  type="number"
                  className="pl-8"
                  value={form.totalPrice || ''}
                  onChange={(e) => setForm({ ...form, totalPrice: Number(e.target.value) })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="pricePerPerson">Price Per Person</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                <Input
                  id="pricePerPerson"
                  type="number"
                  className="pl-8"
                  value={form.pricePerPerson || ''}
                  onChange={(e) => setForm({ ...form, pricePerPerson: Number(e.target.value) })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="depositAmount">Deposit Required</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                <Input
                  id="depositAmount"
                  type="number"
                  className="pl-8"
                  value={form.depositAmount || ''}
                  onChange={(e) => setForm({ ...form, depositAmount: Number(e.target.value) })}
                />
              </div>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label>Inclusions</Label>
              <div className="space-y-2 mt-2">
                {form.inclusions.map((item, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input
                      value={item}
                      onChange={(e) => {
                        const newInclusions = [...form.inclusions];
                        newInclusions[idx] = e.target.value;
                        setForm({ ...form, inclusions: newInclusions });
                      }}
                      placeholder="e.g., Daily breakfast"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setForm({ ...form, inclusions: form.inclusions.filter((_, i) => i !== idx) })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setForm({ ...form, inclusions: [...form.inclusions, ''] })}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Inclusion
                </Button>
              </div>
            </div>
            <div>
              <Label>Exclusions</Label>
              <div className="space-y-2 mt-2">
                {form.exclusions.map((item, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input
                      value={item}
                      onChange={(e) => {
                        const newExclusions = [...form.exclusions];
                        newExclusions[idx] = e.target.value;
                        setForm({ ...form, exclusions: newExclusions });
                      }}
                      placeholder="e.g., International flights"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setForm({ ...form, exclusions: form.exclusions.filter((_, i) => i !== idx) })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setForm({ ...form, exclusions: [...form.exclusions, ''] })}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Exclusion
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Day-by-Day Plans */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Day-by-Day Itinerary</CardTitle>
            <Button variant="outline" size="sm" onClick={addDay}>
              <Plus className="h-4 w-4 mr-1" />
              Add Day
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {form.days.map((day, idx) => (
            <DayPlanCard
              key={idx}
              day={day}
              onChange={(d) => updateDay(idx, d)}
              onRemove={() => removeDay(idx)}
              canRemove={form.days.length > 1}
            />
          ))}
        </CardContent>
      </Card>

      {/* Terms & Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Terms & Additional Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="terms">Terms & Conditions</Label>
            <Textarea
              id="terms"
              placeholder="Enter your terms and conditions..."
              value={form.termsAndConditions}
              onChange={(e) => setForm({ ...form, termsAndConditions: e.target.value })}
              rows={3}
            />
          </div>
          <div>
            <Label htmlFor="cancellation">Cancellation Policy</Label>
            <Textarea
              id="cancellation"
              placeholder="Enter your cancellation policy..."
              value={form.cancellationPolicy}
              onChange={(e) => setForm({ ...form, cancellationPolicy: e.target.value })}
              rows={3}
            />
          </div>
          <div>
            <Label htmlFor="notes">Internal Notes (not visible to client)</Label>
            <Textarea
              id="notes"
              placeholder="Any internal notes for your reference..."
              value={form.internalNotes}
              onChange={(e) => setForm({ ...form, internalNotes: e.target.value })}
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Bottom Actions */}
      <div className="flex justify-end gap-2 pb-8">
        <Link href="/requests">
          <Button variant="outline">Cancel</Button>
        </Link>
        <Button variant="outline" onClick={() => handleSubmit(true)} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save Draft
        </Button>
        <Button onClick={() => handleSubmit(false)} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
          Save & Send to Client
        </Button>
      </div>
    </div>
  );
}

// Wrap with Suspense for useSearchParams
export default function NewItineraryPageWrapper() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <NewItineraryPageContent />
    </Suspense>
  );
}
