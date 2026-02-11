'use client';

import { useState, useEffect, useMemo, useRef, Suspense } from 'react';
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
  Sparkles,
  Heart,
  Utensils,
  Star,
  MessageSquare,
  FileText,
  Briefcase,
  Plane,
  Home,
  Coffee,
  Camera,
  Mountain,
  Sun,
  ChevronRight,
  Copy,
  Eye,
  ImagePlus,
  X,
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
  changeItineraryStatus,
  type TravelRequestDetails,
  type CreateItineraryInput,
} from '@/lib/data/agent';
import { TemplatePicker, type ItineraryTemplate } from '@/components/templates';
import { recordTemplateUsage } from '@/lib/data/templates';
import { compressImages, type CompressedImage } from '@/lib/utils/image-compression';

// ============================================================================
// TYPES
// ============================================================================

interface DayPhoto {
  dataUrl: string;
  caption?: string;
  category: 'hotel' | 'location' | 'activity' | 'food' | 'transport' | 'view' | 'other';
}

interface DayPlan {
  dayNumber: number;
  title: string;
  description: string;
  activities: string[];
  photos: DayPhoto[];
}

const PHOTO_CATEGORIES = [
  { value: 'hotel', label: '🏨 Hotel' },
  { value: 'location', label: '📍 Location' },
  { value: 'activity', label: '🎯 Activity' },
  { value: 'food', label: '🍽️ Food' },
  { value: 'transport', label: '🚗 Transport' },
  { value: 'view', label: '🌄 View' },
  { value: 'other', label: '📷 Other' },
] as const;

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

function parsePreferences(prefs: any): { 
  dietaryRestrictions: string[]; 
  specialOccasions: string[]; 
  accommodationType: string;
  interests: string[];
} {
  if (!prefs) return { dietaryRestrictions: [], specialOccasions: [], accommodationType: '', interests: [] };
  if (typeof prefs === 'string') {
    try {
      prefs = JSON.parse(prefs);
    } catch {
      return { dietaryRestrictions: [], specialOccasions: [], accommodationType: '', interests: [] };
    }
  }
  return {
    dietaryRestrictions: Array.isArray(prefs.dietary_restrictions) ? prefs.dietary_restrictions : [],
    specialOccasions: Array.isArray(prefs.special_occasions) ? prefs.special_occasions : [],
    accommodationType: prefs.accommodation_type || '',
    interests: Array.isArray(prefs.interests) ? prefs.interests : [],
  };
}

function titleize(str: string): string {
  return str.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function ClientRequestPanel({ request, isExpanded, onToggle }: { 
  request: TravelRequestDetails; 
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const destinations = parseDestination(request.destination);
  const travelers = parseTravelers(request.travelers);
  const preferences = parsePreferences(request.preferences);
  const totalTravelers = travelers.adults + travelers.children + travelers.infants;
  const days = calculateDays(request.departureDate, request.returnDate);

  const getTravelStyleIcon = (style: string) => {
    switch (style?.toLowerCase()) {
      case 'luxury': return <Star className="h-4 w-4" />;
      case 'adventure': return <Mountain className="h-4 w-4" />;
      case 'budget': return <Briefcase className="h-4 w-4" />;
      case 'family': return <Heart className="h-4 w-4" />;
      default: return <Sun className="h-4 w-4" />;
    }
  };

  return (
    <Card className="border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-purple-50 shadow-lg overflow-hidden">
      {/* Gradient Header Bar */}
      <div className="h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
      
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl text-gray-900 flex items-center gap-2">
                Client Request Details
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  Reference
                </Badge>
              </CardTitle>
              <CardDescription className="text-gray-600">
                Use these details to create a personalized itinerary
              </CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onToggle} className="text-indigo-600">
            {isExpanded ? 'Collapse' : 'Expand'}
            <ChevronRight className={cn("h-4 w-4 ml-1 transition-transform", isExpanded && "rotate-90")} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Quick Stats Row - Always Visible */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-lg p-3 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 text-indigo-600 mb-1">
              <MapPin className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Destination</span>
            </div>
            <p className="font-semibold text-gray-900 truncate" title={destinations.join(', ')}>
              {destinations.length > 0 ? destinations.join(', ') : 'Not specified'}
            </p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 text-purple-600 mb-1">
              <Calendar className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Duration</span>
            </div>
            <p className="font-semibold text-gray-900">
              {days > 0 ? `${days} days, ${Math.max(0, days - 1)} nights` : 'Flexible'}
            </p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 text-pink-600 mb-1">
              <Users className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Travelers</span>
            </div>
            <p className="font-semibold text-gray-900">
              {travelers.adults} adult{travelers.adults !== 1 ? 's' : ''}
              {travelers.children > 0 && `, ${travelers.children} child${travelers.children !== 1 ? 'ren' : ''}`}
              {travelers.infants > 0 && `, ${travelers.infants} infant${travelers.infants !== 1 ? 's' : ''}`}
            </p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 text-green-600 mb-1">
              <DollarSign className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Budget</span>
            </div>
            <p className="font-semibold text-gray-900">
              {request.budgetMin && request.budgetMax
                ? `${formatCurrency(request.budgetMin)} - ${formatCurrency(request.budgetMax)}`
                : request.budgetMax 
                ? `Up to ${formatCurrency(request.budgetMax)}`
                : 'Not specified'}
            </p>
          </div>
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <>
            <Separator className="my-4" />
            
            {/* Travel Dates */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
              <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Travel Dates
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-blue-600 uppercase tracking-wide">Departure</p>
                  <p className="font-medium text-gray-900">
                    {request.departureDate 
                      ? new Date(request.departureDate).toLocaleDateString('en-US', { 
                          weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' 
                        })
                      : 'Flexible'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-blue-600 uppercase tracking-wide">Return</p>
                  <p className="font-medium text-gray-900">
                    {request.returnDate 
                      ? new Date(request.returnDate).toLocaleDateString('en-US', { 
                          weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' 
                        })
                      : 'Flexible'}
                  </p>
                </div>
              </div>
            </div>

            {/* Travel Style & Preferences */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {request.travelStyle && (
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-100">
                  <h4 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
                    {getTravelStyleIcon(request.travelStyle)}
                    Travel Style
                  </h4>
                  <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-sm px-3 py-1">
                    {titleize(request.travelStyle)}
                  </Badge>
                </div>
              )}

              {preferences.accommodationType && (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-4 border border-amber-100">
                  <h4 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
                    <Home className="h-4 w-4" />
                    Preferred Accommodation
                  </h4>
                  <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-sm px-3 py-1">
                    {titleize(preferences.accommodationType)}
                  </Badge>
                </div>
              )}
            </div>

            {/* Special Requirements */}
            {(preferences.dietaryRestrictions.length > 0 || preferences.specialOccasions.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {preferences.dietaryRestrictions.length > 0 && (
                  <div className="bg-gradient-to-r from-red-50 to-rose-50 rounded-lg p-4 border border-red-100">
                    <h4 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
                      <Utensils className="h-4 w-4" />
                      Dietary Requirements
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {preferences.dietaryRestrictions.map((item, i) => (
                        <Badge key={i} variant="outline" className="bg-white text-red-700 border-red-200">
                          {titleize(item)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {preferences.specialOccasions.length > 0 && (
                  <div className="bg-gradient-to-r from-pink-50 to-rose-50 rounded-lg p-4 border border-pink-100">
                    <h4 className="font-semibold text-pink-900 mb-2 flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      Special Occasions
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {preferences.specialOccasions.map((item, i) => (
                        <Badge key={i} variant="outline" className="bg-white text-pink-700 border-pink-200">
                          {titleize(item)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Client Notes */}
            {request.description && (
              <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-lg p-4 border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Client's Notes & Special Requests
                </h4>
                <p className="text-gray-700 whitespace-pre-wrap bg-white p-3 rounded-md border border-gray-100">
                  {request.description}
                </p>
              </div>
            )}

            {/* Client Info */}
            {request.client && (
              <div className="bg-white rounded-lg p-4 border border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-semibold">
                    {request.client.firstName?.[0]}{request.client.lastName?.[0]}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {request.client.firstName} {request.client.lastName}
                    </p>
                    <p className="text-sm text-gray-500">Client</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-gray-600">
                  Request #{request.id?.slice(-8)}
                </Badge>
              </div>
            )}
          </>
        )}

        {/* Quick Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <p className="text-sm text-gray-500 flex items-center gap-1">
            <Info className="h-4 w-4" />
            Keep this panel open for easy reference while creating the itinerary
          </p>
          <Button variant="ghost" size="sm" className="text-indigo-600" onClick={() => {
            navigator.clipboard.writeText(destinations.join(', '));
          }}>
            <Copy className="h-4 w-4 mr-1" />
            Copy Destinations
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

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

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    const remaining = 6 - (day.photos?.length || 0);
    if (remaining <= 0) return;
    setUploading(true);
    try {
      const compressed = await compressImages(
        Array.from(files).slice(0, remaining)
      );
      const newPhotos: DayPhoto[] = compressed.map((img) => ({
        dataUrl: img.dataUrl,
        caption: '',
        category: 'other' as const,
      }));
      onChange({ ...day, photos: [...(day.photos || []), ...newPhotos] });
    } catch (err) {
      console.error('Photo compression failed:', err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removePhoto = (index: number) => {
    onChange({ ...day, photos: day.photos.filter((_, i) => i !== index) });
  };

  const updatePhotoCaption = (index: number, caption: string) => {
    const photos = [...day.photos];
    photos[index] = { ...photos[index], caption };
    onChange({ ...day, photos });
  };

  const updatePhotoCategory = (index: number, category: DayPhoto['category']) => {
    const photos = [...day.photos];
    photos[index] = { ...photos[index], category };
    onChange({ ...day, photos });
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

        {/* Photo Upload Section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Photos
              <span className="text-xs text-gray-400 font-normal">({day.photos?.length || 0}/6)</span>
            </Label>
          </div>

          {/* Existing Photos Grid */}
          {day.photos && day.photos.length > 0 && (
            <div className="grid grid-cols-3 gap-3 mb-3">
              {day.photos.map((photo, photoIdx) => (
                <div key={photoIdx} className="relative group rounded-lg overflow-hidden border bg-gray-50">
                  <img src={photo.dataUrl} alt={photo.caption || ''} className="w-full h-28 object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(photoIdx)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                  <div className="p-1.5 space-y-1">
                    <input
                      type="text"
                      placeholder="Caption..."
                      value={photo.caption || ''}
                      onChange={(e) => updatePhotoCaption(photoIdx, e.target.value)}
                      className="w-full text-xs border rounded px-1.5 py-0.5"
                      maxLength={200}
                    />
                    <select
                      value={photo.category}
                      onChange={(e) => updatePhotoCategory(photoIdx, e.target.value as DayPhoto['category'])}
                      className="w-full text-xs border rounded px-1 py-0.5"
                    >
                      {PHOTO_CATEGORIES.map((cat) => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Upload Button */}
          {(day.photos?.length || 0) < 6 && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full border-dashed"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Compressing...
                  </>
                ) : (
                  <>
                    <ImagePlus className="h-4 w-4 mr-2" />
                    Add Photos ({6 - (day.photos?.length || 0)} remaining)
                  </>
                )}
              </Button>
              <p className="text-xs text-gray-400 mt-1">
                Max 6 photos per day. Auto-compressed to reduce size.
              </p>
            </>
          )}
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
  const [requestPanelExpanded, setRequestPanelExpanded] = useState(true);
  const [showTemplatePicker, setShowTemplatePicker] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<ItineraryTemplate | null>(null);

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
    days: [{ dayNumber: 1, title: '', description: '', activities: [''], photos: [] }],
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
          newDays.push({ dayNumber: i + 1, title: '', description: '', activities: [''], photos: [] });
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
      days: [...prev.days, { dayNumber: prev.days.length + 1, title: '', description: '', activities: [''], photos: [] }],
    }));
  };

  // Apply template to form
  const applyTemplate = async (template: ItineraryTemplate) => {
    setSelectedTemplate(template);
    const content = template.content as any;
    
    // Build days from template content
    const templateDays: DayPlan[] = [];
    if (content.days && Array.isArray(content.days)) {
      content.days.forEach((day: any, idx: number) => {
        // Extract activity names from ActivityContent[] or string[]
        let activityNames: string[] = [''];
        if (day.activities && Array.isArray(day.activities)) {
          activityNames = day.activities.map((act: any) => 
            typeof act === 'string' ? act : (act.name || act.description || '')
          ).filter(Boolean);
          if (activityNames.length === 0) activityNames = [''];
        }
        
        templateDays.push({
          dayNumber: idx + 1,
          title: day.title || '',
          description: day.notes || day.description || '', // Support both 'notes' and 'description'
          activities: activityNames,
          photos: [],
        });
      });
    }

    // Update form with template content
    setForm((prev) => ({
      ...prev,
      title: content.title || prev.title,
      summary: content.summary || content.notes || prev.summary,
      inclusions: content.inclusions?.length ? content.inclusions : prev.inclusions,
      exclusions: content.exclusions?.length ? content.exclusions : prev.exclusions,
      tripType: content.tripType || prev.tripType,
      days: templateDays.length ? templateDays : prev.days,
    }));

    // Record usage for smart suggestions
    try {
      await recordTemplateUsage(template.id);
    } catch (err) {
      console.error('Failed to record template usage:', err);
    }

    // Hide template picker after selection
    setShowTemplatePicker(false);
  };

  const handleSubmit = async (asDraft: boolean = true) => {
    if (!requestId || !request) {
      setError('No request selected');
      return;
    }

    if (!agent?.agentId) {
      setError('Agent session not available. Please refresh the page.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Map form tripType to backend enum values (uppercase)
      const tripTypeMap: Record<string, string> = {
        'leisure': 'OTHER',
        'adventure': 'ADVENTURE',
        'honeymoon': 'HONEYMOON',
        'family': 'FAMILY',
        'business': 'CITY_BREAK',
        'pilgrimage': 'CULTURAL',
      };

      const input: CreateItineraryInput = {
        requestId,
        agentId: agent?.agentId || '',
        travelerId: request.userId,
        overview: {
          title: form.title,
          summary: form.summary,
          startDate: new Date(form.startDate).toISOString(),
          endDate: new Date(form.endDate).toISOString(),
          numberOfDays,
          numberOfNights,
          destinations: form.destinations,
          travelersCount: parseTravelers(request.travelers).adults + parseTravelers(request.travelers).children,
          tripType: tripTypeMap[form.tripType] || 'OTHER',
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
        dayPlans: form.days.map((day) => ({
          dayNumber: day.dayNumber,
          title: day.title,
          description: day.description,
          activities: day.activities.filter(Boolean),
          photos: (day.photos || []).map((p) => ({
            dataUrl: p.dataUrl,
            caption: p.caption || undefined,
            category: p.category,
          })),
        })),
      };

      const result = await createItinerary(input);
      if (result) {
        // If not saving as draft, submit the itinerary to the client
        if (!asDraft && result.id) {
          try {
            await changeItineraryStatus(result.id, 'SUBMITTED');
          } catch (submitErr: any) {
            console.error('Failed to submit itinerary:', submitErr);
            setError(`Itinerary created but failed to send: ${submitErr?.message || 'Unknown error'}`);
            setSaving(false);
            return;
          }
        }
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
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header with Gradient Background */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/requests">
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Sparkles className="h-8 w-8" />
                Create Itinerary
              </h1>
              <p className="text-indigo-100 mt-1">Build a personalized travel plan for your client</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => handleSubmit(true)} 
              disabled={saving}
              className="bg-white/10 border-white/30 text-white hover:bg-white/20"
            >
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save Draft
            </Button>
            <Button 
              onClick={() => handleSubmit(false)} 
              disabled={saving}
              className="bg-white text-indigo-600 hover:bg-indigo-50"
            >
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Save & Send to Client
            </Button>
          </div>
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

      {/* Client Request Details - PROMINENT */}
      {request && (
        <ClientRequestPanel 
          request={request} 
          isExpanded={requestPanelExpanded}
          onToggle={() => setRequestPanelExpanded(!requestPanelExpanded)}
        />
      )}

      {/* Template Picker - Smart Suggestions */}
      {request && showTemplatePicker && (
        <TemplatePicker
          context={{
            destination: parseDestination(request.destination).join(', '),
            travelStyle: request.travelStyle || undefined,
            duration: calculateDays(request.departureDate, request.returnDate),
          }}
          onSelect={applyTemplate}
          onStartFromScratch={() => setShowTemplatePicker(false)}
        />
      )}

      {/* Template Applied Banner */}
      {selectedTemplate && !showTemplatePicker && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle className="h-5 w-5" />
                <span>Template applied: <strong>{selectedTemplate.name}</strong></span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowTemplatePicker(true)}
                className="text-green-700 hover:text-green-800"
              >
                Change Template
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Itinerary Details Form */}
      <Card className="shadow-md">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-slate-50 border-b">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-600" />
            Itinerary Details
          </CardTitle>
          <CardDescription>Basic information about the trip</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
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
      <Card className="shadow-md">
        <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            Pricing & Package
          </CardTitle>
          <CardDescription>Define the cost breakdown for this itinerary</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
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
      <Card className="shadow-md">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-purple-600" />
                Day-by-Day Itinerary
              </CardTitle>
              <CardDescription>Plan each day's activities and experiences</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={addDay} className="bg-white">
              <Plus className="h-4 w-4 mr-1" />
              Add Day
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
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
