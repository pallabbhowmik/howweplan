'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  MapPin,
  Calendar,
  Users,
  Wallet,
  Palmtree,
  Mountain,
  Briefcase,
  Heart,
  Camera,
  Utensils,
  Check,
  ArrowLeft,
  ArrowRight,
  Plane,
  Globe,
  Sparkles,
  Star,
  Sun,
  Loader2,
  Plus,
  Minus,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useUserSession } from '@/lib/user/session';
import { createTravelRequest } from '@/lib/data/api';

const popularDestinations = [
  { name: 'Goa', emoji: '🏖️', type: 'Beach Paradise' },
  { name: 'Manali', emoji: '🏔️', type: 'Mountain Escape' },
  { name: 'Jaipur', emoji: '🏰', type: 'Royal Heritage' },
  { name: 'Kerala', emoji: '🌴', type: 'Backwaters' },
  { name: 'Ladakh', emoji: '🏔️', type: 'Adventure' },
  { name: 'Udaipur', emoji: '🌊', type: 'Lake City' },
];

const tripTypes = [
  { id: 'leisure', label: 'Leisure', icon: Palmtree, color: 'from-green-500 to-emerald-600', description: 'Relax and unwind' },
  { id: 'adventure', label: 'Adventure', icon: Mountain, color: 'from-orange-500 to-red-600', description: 'Thrilling experiences' },
  { id: 'business', label: 'Business', icon: Briefcase, color: 'from-blue-500 to-indigo-600', description: 'Work + explore' },
  { id: 'honeymoon', label: 'Honeymoon', icon: Heart, color: 'from-pink-500 to-rose-600', description: 'Romantic getaway' },
  { id: 'cultural', label: 'Cultural', icon: Camera, color: 'from-purple-500 to-violet-600', description: 'Heritage & history' },
  { id: 'culinary', label: 'Culinary', icon: Utensils, color: 'from-amber-500 to-yellow-600', description: 'Food exploration' },
];

const budgetRanges = [
  { id: 'budget', label: 'Budget', range: '₹10K - ₹25K', min: 10000, max: 25000, color: 'bg-green-100 text-green-700 border-green-300' },
  { id: 'moderate', label: 'Moderate', range: '₹25K - ₹50K', min: 25000, max: 50000, color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { id: 'premium', label: 'Premium', range: '₹50K - ₹1L', min: 50000, max: 100000, color: 'bg-purple-100 text-purple-700 border-purple-300' },
  { id: 'luxury', label: 'Luxury', range: '₹1L+', min: 100000, max: 500000, color: 'bg-amber-100 text-amber-700 border-amber-300' },
];

const experienceOptions = [
  'Local cuisine & food tours',
  'Historical sites & museums',
  'Beach & water activities',
  'Hiking & trekking',
  'Nightlife & entertainment',
  'Spa & wellness',
  'Shopping experiences',
  'Wildlife & nature',
  'Photography spots',
  'Spiritual & meditation',
];

interface FormData {
  destination: string;
  startDate: string;
  endDate: string;
  adults: number;
  children: number;
  infants: number;
  budgetRange: string;
  customBudget: string;
  tripType: string;
  experiences: string[];
  preferences: string;
  specialRequests: string;
}

export default function NewRequestPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useUserSession();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    destination: '',
    startDate: '',
    endDate: '',
    adults: 2,
    children: 0,
    infants: 0,
    budgetRange: '',
    customBudget: '',
    tripType: '',
    experiences: [],
    preferences: '',
    specialRequests: '',
  });

  const updateForm = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleExperience = (exp: string) => {
    setFormData((prev) => ({
      ...prev,
      experiences: prev.experiences.includes(exp)
        ? prev.experiences.filter((e) => e !== exp)
        : [...prev.experiences, exp],
    }));
  };

  const adjustTravelers = (type: 'adults' | 'children' | 'infants', delta: number) => {
    const newValue = Math.max(type === 'adults' ? 1 : 0, formData[type] + delta);
    const maxValue = type === 'adults' ? 10 : 6;
    updateForm(type, Math.min(newValue, maxValue));
  };

  const totalTravelers = formData.adults + formData.children + formData.infants;

  const getTripDuration = () => {
    if (!formData.startDate || !formData.endDate) return null;
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return days > 0 ? days : null;
  };

  const canProceed = () => {
    if (step === 1) {
      return formData.destination && formData.startDate && formData.endDate && getTripDuration();
    }
    if (step === 2) {
      return formData.tripType && (formData.budgetRange || formData.customBudget);
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.userId) {
      alert('Please log in to submit a request');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Calculate budget value
      const selectedBudget = budgetRanges.find(b => b.id === formData.budgetRange);
      const budgetValue = formData.customBudget 
        ? parseInt(formData.customBudget) 
        : selectedBudget?.max || 50000;

      // Create the travel request in Supabase
      await createTravelRequest({
        userId: user.userId,
        destination: formData.destination,
        startDate: formData.startDate,
        endDate: formData.endDate,
        adults: formData.adults,
        children: formData.children,
        infants: formData.infants,
        budget: budgetValue,
        budgetRange: formData.budgetRange,
        tripType: formData.tripType,
        experiences: formData.experiences,
        preferences: formData.preferences,
        specialRequests: formData.specialRequests,
      });
      
      router.push('/dashboard?newRequest=success');
    } catch (error) {
      console.error('Failed to submit request:', error);
      alert('Failed to submit request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { num: 1, title: 'Trip Details', icon: MapPin },
    { num: 2, title: 'Preferences', icon: Star },
    { num: 3, title: 'Review', icon: Check },
  ];

  const tripDuration = getTripDuration();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtOS45NCAwLTE4IDguMDYtMTggMThzOC4wNiAxOCAxOCAxOCAxOC04LjA2IDE4LTE4LTguMDYtMTgtMTgtMTh6bTAgMzJjLTcuNzMyIDAtMTQtNi4yNjgtMTQtMTRzNi4yNjgtMTQgMTQtMTQgMTQgNi4yNjggMTQgMTQtNi4yNjggMTQtMTQgMTR6IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9Ii4wNSIvPjwvZz48L3N2Zz4=')] opacity-30" />
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        
        <div className="relative max-w-4xl mx-auto px-4 py-12">
          <Link href="/dashboard" className="inline-flex items-center text-blue-100 hover:text-white mb-6 group">
            <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            Back to Dashboard
          </Link>
          
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
              <Plane className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold">Plan Your Dream Trip</h1>
              <p className="text-blue-100 text-lg">Let our expert agents craft the perfect itinerary for you</p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="max-w-4xl mx-auto px-4 -mt-6 relative z-10">
        <div className="bg-white rounded-2xl shadow-xl p-6 border">
          <div className="flex items-center justify-between">
            {steps.map((s, i) => (
              <div key={s.num} className="flex items-center">
                <button
                  type="button"
                  onClick={() => s.num < step && setStep(s.num)}
                  disabled={s.num > step}
                  className={`flex items-center gap-3 ${s.num < step ? 'cursor-pointer' : s.num > step ? 'cursor-not-allowed opacity-50' : ''}`}
                >
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                      step === s.num
                        ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg scale-110'
                        : step > s.num
                        ? 'bg-green-500 text-white'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {step > s.num ? <Check className="h-5 w-5" /> : <s.icon className="h-5 w-5" />}
                  </div>
                  <div className="hidden sm:block">
                    <p className={`font-semibold ${step === s.num ? 'text-blue-600' : step > s.num ? 'text-green-600' : 'text-slate-400'}`}>
                      Step {s.num}
                    </p>
                    <p className="text-sm text-slate-500">{s.title}</p>
                  </div>
                </button>
                {i < steps.length - 1 && (
                  <div className={`hidden sm:block w-16 lg:w-24 h-1 mx-4 rounded-full ${step > s.num ? 'bg-green-500' : 'bg-slate-200'}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit}>
          {/* Step 1: Trip Details */}
          {step === 1 && (
            <div className="space-y-8 animate-in fade-in duration-500">
              {/* Destination */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <MapPin className="h-5 w-5 text-blue-600" />
                    </div>
                    Where do you want to go?
                  </CardTitle>
                  <CardDescription>Enter your dream destination or select from popular choices</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative">
                    <Input
                      placeholder="e.g., Goa, Kerala, Manali..."
                      value={formData.destination}
                      onChange={(e) => updateForm('destination', e.target.value)}
                      className="text-lg py-6 pl-12"
                    />
                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  </div>
                  
                  <div className="pt-2">
                    <p className="text-sm text-slate-500 mb-3">Popular destinations</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {popularDestinations.map((dest) => (
                        <button
                          key={dest.name}
                          type="button"
                          onClick={() => updateForm('destination', dest.name)}
                          className={`p-4 rounded-xl border-2 text-left transition-all hover:shadow-md ${
                            formData.destination === dest.name
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-slate-200 hover:border-blue-300'
                          }`}
                        >
                          <span className="text-2xl">{dest.emoji}</span>
                          <p className="font-semibold mt-1">{dest.name}</p>
                          <p className="text-xs text-slate-500">{dest.type}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Dates */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Calendar className="h-5 w-5 text-purple-600" />
                    </div>
                    When are you traveling?
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-slate-600">Start Date</Label>
                      <Input
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => updateForm('startDate', e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="py-6 text-lg"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-600">End Date</Label>
                      <Input
                        type="date"
                        value={formData.endDate}
                        onChange={(e) => updateForm('endDate', e.target.value)}
                        min={formData.startDate || new Date().toISOString().split('T')[0]}
                        className="py-6 text-lg"
                      />
                    </div>
                  </div>
                  {tripDuration && (
                    <div className="mt-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl flex items-center gap-3">
                      <Sun className="h-5 w-5 text-amber-500" />
                      <span className="font-medium text-slate-700">
                        {tripDuration} {tripDuration === 1 ? 'day' : 'days'} trip
                      </span>
                      {tripDuration >= 7 && (
                        <Badge className="bg-green-100 text-green-700 border-0">Great for exploration!</Badge>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Travelers */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Users className="h-5 w-5 text-green-600" />
                    </div>
                    Who&apos;s traveling?
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {[
                    { key: 'adults' as const, label: 'Adults', desc: '18+ years' },
                    { key: 'children' as const, label: 'Children', desc: '2-17 years' },
                    { key: 'infants' as const, label: 'Infants', desc: 'Under 2 years' },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between py-3 border-b last:border-0">
                      <div>
                        <p className="font-medium">{item.label}</p>
                        <p className="text-sm text-slate-500">{item.desc}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <button
                          type="button"
                          onClick={() => adjustTravelers(item.key, -1)}
                          disabled={formData[item.key] <= (item.key === 'adults' ? 1 : 0)}
                          className="w-10 h-10 rounded-full border-2 flex items-center justify-center hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-8 text-center text-xl font-semibold">{formData[item.key]}</span>
                        <button
                          type="button"
                          onClick={() => adjustTravelers(item.key, 1)}
                          className="w-10 h-10 rounded-full border-2 flex items-center justify-center hover:bg-slate-50 transition-colors"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="pt-2 flex items-center justify-between bg-slate-50 rounded-xl p-4">
                    <span className="text-slate-600">Total travelers</span>
                    <span className="text-2xl font-bold text-blue-600">{totalTravelers}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 2: Preferences */}
          {step === 2 && (
            <div className="space-y-8 animate-in fade-in duration-500">
              {/* Trip Type */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <Sparkles className="h-5 w-5 text-orange-600" />
                    </div>
                    What kind of trip is this?
                  </CardTitle>
                  <CardDescription>Select the type that best describes your trip</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {tripTypes.map((type) => (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => updateForm('tripType', type.id)}
                        className={`p-6 rounded-2xl border-2 text-left transition-all hover:shadow-lg group ${
                          formData.tripType === type.id
                            ? 'border-blue-500 bg-blue-50 shadow-md'
                            : 'border-slate-200 hover:border-blue-300'
                        }`}
                      >
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${type.color} flex items-center justify-center text-white mb-3 group-hover:scale-110 transition-transform`}>
                          <type.icon className="h-6 w-6" />
                        </div>
                        <p className="font-semibold text-slate-800">{type.label}</p>
                        <p className="text-sm text-slate-500">{type.description}</p>
                        {formData.tripType === type.id && (
                          <div className="mt-2 flex items-center text-blue-600 text-sm font-medium">
                            <Check className="h-4 w-4 mr-1" /> Selected
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Budget */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="p-2 bg-emerald-100 rounded-lg">
                      <Wallet className="h-5 w-5 text-emerald-600" />
                    </div>
                    What&apos;s your budget?
                  </CardTitle>
                  <CardDescription>Per person budget for the entire trip</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {budgetRanges.map((budget) => (
                      <button
                        key={budget.id}
                        type="button"
                        onClick={() => {
                          updateForm('budgetRange', budget.id);
                          updateForm('customBudget', '');
                        }}
                        className={`p-4 rounded-xl border-2 text-center transition-all hover:shadow-md ${
                          formData.budgetRange === budget.id
                            ? `${budget.color} border-current`
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <p className="font-semibold">{budget.label}</p>
                        <p className="text-sm opacity-80">{budget.range}</p>
                      </button>
                    ))}
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="h-px flex-1 bg-slate-200" />
                    <span className="text-sm text-slate-400">or enter custom amount</span>
                    <div className="h-px flex-1 bg-slate-200" />
                  </div>
                  
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">₹</span>
                    <Input
                      type="number"
                      placeholder="Enter your budget"
                      value={formData.customBudget}
                      onChange={(e) => {
                        updateForm('customBudget', e.target.value);
                        updateForm('budgetRange', '');
                      }}
                      className="pl-8 py-6 text-lg"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Experiences */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle>What experiences interest you?</CardTitle>
                  <CardDescription>Select all that apply - this helps agents create the perfect itinerary</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3">
                    {experienceOptions.map((exp) => (
                      <button
                        key={exp}
                        type="button"
                        onClick={() => toggleExperience(exp)}
                        className={`px-4 py-2 rounded-full border-2 transition-all ${
                          formData.experiences.includes(exp)
                            ? 'bg-blue-500 border-blue-500 text-white'
                            : 'border-slate-200 hover:border-blue-300 text-slate-600'
                        }`}
                      >
                        {formData.experiences.includes(exp) && <Check className="h-4 w-4 inline mr-1" />}
                        {exp}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Additional Preferences */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle>Anything else we should know?</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="preferences" className="text-slate-600">Specific preferences or must-haves</Label>
                    <Textarea
                      id="preferences"
                      placeholder="e.g., Prefer boutique hotels, need airport transfers, interested in cooking classes..."
                      value={formData.preferences}
                      onChange={(e) => updateForm('preferences', e.target.value)}
                      rows={3}
                      className="resize-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="specialRequests" className="text-slate-600">Special requests (Optional)</Label>
                    <Textarea
                      id="specialRequests"
                      placeholder="e.g., Dietary restrictions, accessibility needs, allergies..."
                      value={formData.specialRequests}
                      onChange={(e) => updateForm('specialRequests', e.target.value)}
                      rows={3}
                      className="resize-none"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <Card className="border-0 shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Globe className="h-6 w-6" />
                    {formData.destination}
                  </h2>
                  <p className="text-blue-100 mt-1">
                    {formData.startDate && formData.endDate && (
                      <>
                        {new Date(formData.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} 
                        {' - '}
                        {new Date(formData.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {tripDuration && ` • ${tripDuration} days`}
                      </>
                    )}
                  </p>
                </div>
                <CardContent className="p-6 space-y-6">
                  {/* Summary Grid */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <Users className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm text-slate-500">Travelers</p>
                          <p className="font-semibold">{totalTravelers} total</p>
                          <p className="text-sm text-slate-500">
                            {formData.adults} adults
                            {formData.children > 0 && `, ${formData.children} children`}
                            {formData.infants > 0 && `, ${formData.infants} infants`}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-emerald-100 rounded-lg">
                          <Wallet className="h-4 w-4 text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-sm text-slate-500">Budget</p>
                          <p className="font-semibold">
                            {formData.customBudget 
                              ? `₹${Number(formData.customBudget).toLocaleString('en-IN')}`
                              : budgetRanges.find(b => b.id === formData.budgetRange)?.range || 'Flexible'
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-orange-100 rounded-lg">
                          <Sparkles className="h-4 w-4 text-orange-600" />
                        </div>
                        <div>
                          <p className="text-sm text-slate-500">Trip Type</p>
                          <p className="font-semibold capitalize">{formData.tripType || 'Not specified'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Experiences */}
                  {formData.experiences.length > 0 && (
                    <div className="pt-4 border-t">
                      <p className="text-sm text-slate-500 mb-2">Interested in</p>
                      <div className="flex flex-wrap gap-2">
                        {formData.experiences.map((exp) => (
                          <Badge key={exp} variant="secondary" className="bg-blue-50 text-blue-700 border-0">
                            {exp}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Preferences */}
                  {formData.preferences && (
                    <div className="pt-4 border-t">
                      <p className="text-sm text-slate-500 mb-1">Preferences</p>
                      <p className="text-slate-700">{formData.preferences}</p>
                    </div>
                  )}

                  {/* Special Requests */}
                  {formData.specialRequests && (
                    <div className="pt-4 border-t">
                      <p className="text-sm text-slate-500 mb-1">Special Requests</p>
                      <p className="text-slate-700">{formData.specialRequests}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* What happens next */}
              <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-purple-50">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-white rounded-xl shadow-sm">
                      <Info className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800 mb-3">What happens next?</h3>
                      <ul className="space-y-2">
                        {[
                          'Your request will be sent to matching travel agents',
                          'Agents will submit itinerary proposals within 24-48 hours',
                          'You\'ll compare options and select your favorite',
                          'Full details revealed after you confirm an agent',
                        ].map((item, i) => (
                          <li key={i} className="flex items-center gap-2 text-slate-600">
                            <Check className="h-4 w-4 text-green-500 shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between items-center mt-8 p-6 bg-white rounded-2xl shadow-lg border">
            {step > 1 ? (
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setStep(step - 1)}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
            ) : (
              <Link href="/dashboard">
                <Button type="button" variant="ghost" className="gap-2">
                  <ArrowLeft className="h-4 w-4" /> Cancel
                </Button>
              </Link>
            )}

            {step < 3 ? (
              <Button
                type="button"
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
                className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={isSubmitting || userLoading}
                className="gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 px-8"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Submit Request
                  </>
                )}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
