'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Users,
  ArrowLeft,
  Calendar,
  MapPin,
  DollarSign,
  Image as ImageIcon,
  Sparkles,
  ChevronRight,
  Globe,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { GroupTripsProvider, useGroupTrips } from '@/lib/group-trips';
import { cn } from '@/lib/utils';

const coverImages = [
  { url: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800', label: 'Travel' },
  { url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800', label: 'Beach' },
  { url: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800', label: 'Adventure' },
  { url: 'https://images.unsplash.com/photo-1530521954074-e64f6810b32d?w=800', label: 'City' },
  { url: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800', label: 'Road Trip' },
  { url: 'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=800', label: 'Europe' },
  { url: 'https://images.unsplash.com/photo-1500259571355-332da5cb07aa?w=800', label: 'Friends' },
  { url: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800', label: 'Mountains' },
];

const currencies = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
];

function CreateGroupTripForm() {
  const router = useRouter();
  const { createTrip } = useGroupTrips();
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const defaultCoverImage = coverImages[0]?.url ?? 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800';
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    coverImage: defaultCoverImage,
    destination: '',
    startDate: '',
    endDate: '',
    isFlexible: true,
    budgetTotal: '',
    budgetCurrency: 'USD',
    maxMembers: '10',
  });
  
  const updateField = <K extends keyof typeof formData>(field: K, value: typeof formData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      setError('Please enter a trip name');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const trip = await createTrip({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        coverImage: formData.coverImage,
        destination: formData.destination.trim() || undefined,
        startDate: formData.startDate || undefined,
        endDate: formData.endDate || undefined,
        isFlexible: formData.isFlexible,
        budgetTotal: formData.budgetTotal ? parseFloat(formData.budgetTotal) : undefined,
        budgetCurrency: formData.budgetCurrency,
        maxMembers: parseInt(formData.maxMembers) || 10,
      });
      
      router.push(`/group-trip/${trip.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create trip');
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (step === 1 && !formData.name.trim()) {
      setError('Please enter a trip name');
      return;
    }
    setError(null);
    setStep(prev => Math.min(prev + 1, 3));
  };
  
  const prevStep = () => {
    setError(null);
    setStep(prev => Math.max(prev - 1, 1));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/group-trip">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Create Group Trip</h1>
              <p className="text-sm text-slate-500">Step {step} of 3</p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-6">
          <div className="flex items-center gap-2 py-3">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex-1">
                <div className={cn(
                  "h-2 rounded-full transition-colors",
                  s <= step ? "bg-indigo-600" : "bg-slate-200"
                )} />
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between pb-4 text-sm">
            <span className={step >= 1 ? "text-indigo-600 font-medium" : "text-slate-400"}>Basic Info</span>
            <span className={step >= 2 ? "text-indigo-600 font-medium" : "text-slate-400"}>Dates & Budget</span>
            <span className={step >= 3 ? "text-indigo-600 font-medium" : "text-slate-400"}>Review</span>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="max-w-3xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-indigo-600" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="name">Trip Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Summer Beach Trip 2025"
                    value={formData.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Tell your friends what this trip is about..."
                    value={formData.description}
                    onChange={(e) => updateField('description', e.target.value)}
                    className="mt-2"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="destination">Destination (optional)</Label>
                  <div className="relative mt-2">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="destination"
                      placeholder="e.g., Bali, Indonesia"
                      value={formData.destination}
                      onChange={(e) => updateField('destination', e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    You can let your group vote on destinations later
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-indigo-600" />
                  Cover Image
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-3">
                  {coverImages.map((img) => (
                    <button
                      key={img.url}
                      type="button"
                      onClick={() => updateField('coverImage', img.url)}
                      className={cn(
                        "relative aspect-video rounded-lg overflow-hidden border-2 transition-all",
                        formData.coverImage === img.url
                          ? "border-indigo-600 ring-2 ring-indigo-600/20"
                          : "border-transparent hover:border-slate-300"
                      )}
                    >
                      <img
                        src={img.url}
                        alt={img.label}
                        className="w-full h-full object-cover"
                      />
                      {formData.coverImage === img.url && (
                        <div className="absolute inset-0 bg-indigo-600/20 flex items-center justify-center">
                          <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center">
                            <Check className="h-4 w-4 text-white" />
                          </div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 2: Dates & Budget */}
        {step === 2 && (
          <div className="space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-indigo-600" />
                  Travel Dates
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={formData.isFlexible}
                      onChange={() => updateField('isFlexible', true)}
                      className="w-4 h-4 text-indigo-600"
                    />
                    <span className="text-slate-700">Flexible dates</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={!formData.isFlexible}
                      onChange={() => updateField('isFlexible', false)}
                      className="w-4 h-4 text-indigo-600"
                    />
                    <span className="text-slate-700">Fixed dates</span>
                  </label>
                </div>

                {!formData.isFlexible && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="startDate">Start Date</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => updateField('startDate', e.target.value)}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="endDate">End Date</Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={formData.endDate}
                        onChange={(e) => updateField('endDate', e.target.value)}
                        className="mt-2"
                      />
                    </div>
                  </div>
                )}

                {formData.isFlexible && (
                  <div className="p-4 bg-indigo-50 rounded-lg">
                    <p className="text-sm text-indigo-700">
                      You can set specific dates later or let your group vote on the best time to travel.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-indigo-600" />
                  Budget
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="budgetTotal">Total Budget (optional)</Label>
                  <div className="flex gap-2 mt-2">
                    <select
                      value={formData.budgetCurrency}
                      onChange={(e) => updateField('budgetCurrency', e.target.value)}
                      className="px-3 py-2 border rounded-lg bg-white"
                    >
                      {currencies.map(c => (
                        <option key={c.code} value={c.code}>
                          {c.code} ({c.symbol})
                        </option>
                      ))}
                    </select>
                    <Input
                      id="budgetTotal"
                      type="number"
                      placeholder="e.g., 5000"
                      value={formData.budgetTotal}
                      onChange={(e) => updateField('budgetTotal', e.target.value)}
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    This will be split among all members
                  </p>
                </div>

                <div>
                  <Label htmlFor="maxMembers">Maximum Members</Label>
                  <Input
                    id="maxMembers"
                    type="number"
                    min="2"
                    max="50"
                    value={formData.maxMembers}
                    onChange={(e) => updateField('maxMembers', e.target.value)}
                    className="mt-2 w-32"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <div className="space-y-6">
            <Card className="border-0 shadow-lg overflow-hidden">
              <div className="relative h-48">
                <img
                  src={formData.coverImage}
                  alt="Cover"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-4 left-4 text-white">
                  <h2 className="text-2xl font-bold">{formData.name || 'Untitled Trip'}</h2>
                  {formData.destination && (
                    <div className="flex items-center gap-1 mt-1 text-white/80">
                      <MapPin className="h-4 w-4" />
                      {formData.destination}
                    </div>
                  )}
                </div>
              </div>
              <CardContent className="p-6">
                {formData.description && (
                  <p className="text-slate-600 mb-6">{formData.description}</p>
                )}

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-slate-500 mb-2">Dates</h4>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-indigo-600" />
                      {formData.isFlexible ? (
                        <span className="text-slate-800">Flexible</span>
                      ) : formData.startDate && formData.endDate ? (
                        <span className="text-slate-800">
                          {new Date(formData.startDate).toLocaleDateString()} - {new Date(formData.endDate).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-slate-400">Not set</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-slate-500 mb-2">Budget</h4>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-indigo-600" />
                      {formData.budgetTotal ? (
                        <span className="text-slate-800">
                          {currencies.find(c => c.code === formData.budgetCurrency)?.symbol}
                          {parseFloat(formData.budgetTotal).toLocaleString()} total
                        </span>
                      ) : (
                        <span className="text-slate-400">Not set</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-slate-500 mb-2">Max Members</h4>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-indigo-600" />
                      <span className="text-slate-800">{formData.maxMembers} people</span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-slate-500 mb-2">Status</h4>
                    <Badge className="bg-indigo-100 text-indigo-700 border-0">
                      Planning Phase
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-r from-indigo-500 to-purple-600">
              <CardContent className="p-6 text-center text-white">
                <Globe className="h-12 w-12 mx-auto mb-4 opacity-80" />
                <h3 className="text-xl font-bold mb-2">Ready to Start Planning!</h3>
                <p className="text-white/80 mb-4">
                  Once created, you'll get an invite code to share with your friends.
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-8">
          {step > 1 ? (
            <Button variant="outline" onClick={prevStep}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
          ) : (
            <div />
          )}
          
          {step < 3 ? (
            <Button onClick={nextStep} className="bg-indigo-600 hover:bg-indigo-700">
              Continue
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button 
              onClick={handleSubmit} 
              disabled={loading}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
            >
              {loading ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Creating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Create Group Trip
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CreateGroupTripPage() {
  return (
    <GroupTripsProvider>
      <CreateGroupTripForm />
    </GroupTripsProvider>
  );
}
