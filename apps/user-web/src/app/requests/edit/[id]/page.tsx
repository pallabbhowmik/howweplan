'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  MapPin,
  Calendar,
  Users,
  Wallet,
  ArrowLeft,
  Loader2,
  Plus,
  Minus,
  Save,
  AlertCircle,
  FileText,
  Plane,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useUserSession } from '@/lib/user/session';
import { fetchRequest, updateTravelRequest, type TravelRequest } from '@/lib/data/api';

const popularDestinations = [
  { name: 'Goa', emoji: '🏖️' },
  { name: 'Manali', emoji: '🏔️' },
  { name: 'Jaipur', emoji: '🏰' },
  { name: 'Kerala', emoji: '🌴' },
  { name: 'Ladakh', emoji: '🏔️' },
  { name: 'Udaipur', emoji: '🌊' },
];

export default function EditRequestPage() {
  const params = useParams();
  const router = useRouter();
  const requestId = params.id as string;
  const { user, loading: userLoading } = useUserSession();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [request, setRequest] = useState<TravelRequest | null>(null);
  
  const [formData, setFormData] = useState({
    destination: '',
    startDate: '',
    endDate: '',
    adults: 2,
    children: 0,
    infants: 0,
    budgetMin: '',
    budgetMax: '',
    specialRequests: '',
  });

  useEffect(() => {
    const loadRequest = async () => {
      try {
        const data = await fetchRequest(requestId);
        if (data) {
          setRequest(data);
          
          // Safely extract destination
          let destination = '';
          if (typeof data.destination === 'string') {
            destination = data.destination;
          } else if (data.destination) {
            destination = data.destination.label || data.destination.city || '';
          }
          
          // Safely extract dates - handle undefined properly
          const startDate = data.departureDate ? String(data.departureDate).split('T')[0] : '';
          const endDate = data.returnDate ? String(data.returnDate).split('T')[0] : '';
          
          setFormData({
            destination,
            startDate,
            endDate,
            adults: data.travelers?.adults || 2,
            children: data.travelers?.children || 0,
            infants: data.travelers?.infants || 0,
            budgetMin: data.budgetMin?.toString() || '',
            budgetMax: data.budgetMax?.toString() || '',
            specialRequests: data.notes || data.description || '',
          });
        } else {
          setError('Request not found');
        }
      } catch (err) {
        console.error('Error loading request:', err);
        setError('Failed to load request');
      } finally {
        setLoading(false);
      }
    };

    loadRequest();
  }, [requestId]);

  const adjustTravelers = (type: 'adults' | 'children' | 'infants', delta: number) => {
    const currentValue = formData[type];
    const newValue = Math.max(type === 'adults' ? 1 : 0, currentValue + delta);
    const maxValue = type === 'adults' ? 10 : 6;
    setFormData(prev => ({ ...prev, [type]: Math.min(newValue, maxValue) }));
  };

  const getTripDuration = () => {
    if (!formData.startDate || !formData.endDate) return null;
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return days > 0 ? days : null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.userId || !request) {
      setError('Unable to save changes');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await updateTravelRequest(requestId, {
        destination: formData.destination,
        startDate: formData.startDate,
        endDate: formData.endDate,
        travelersCount: formData.adults + formData.children + formData.infants,
        budgetMin: formData.budgetMin ? parseInt(formData.budgetMin) : null,
        budgetMax: formData.budgetMax ? parseInt(formData.budgetMax) : null,
        specialRequests: formData.specialRequests,
        preferences: {
          ...request.preferences,
          adults: formData.adults,
          children: formData.children,
          infants: formData.infants,
        },
      });

      router.push(`/dashboard/requests/${requestId}?updated=success`);
    } catch (err) {
      console.error('Failed to update request:', err);
      setError('Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const totalTravelers = formData.adults + formData.children + formData.infants;
  const tripDuration = getTripDuration();

  if (userLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur-xl opacity-30 animate-pulse" />
            <Loader2 className="relative h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          </div>
          <p className="text-slate-500 font-medium">Loading your request...</p>
        </div>
      </div>
    );
  }

  if (error && !request) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="bg-gradient-to-br from-red-100 to-orange-100 rounded-full p-8 mb-6">
          <AlertCircle className="h-16 w-16 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Something went wrong</h2>
        <p className="text-muted-foreground mb-6">{error}</p>
        <Link href="/dashboard/requests">
          <Button className="bg-gradient-to-r from-blue-600 to-purple-600">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Requests
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <Link href={`/dashboard/requests/${requestId}`} className="inline-flex items-center text-sm text-slate-500 hover:text-slate-900 group mb-4">
          <ArrowLeft className="h-4 w-4 mr-1 group-hover:-translate-x-1 transition-transform" />
          Back to Request
        </Link>
        
        {/* Hero Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl p-8 text-white shadow-2xl">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtOS45NCAwLTE4IDguMDYtMTggMThzOC4wNiAxOCAxOCAxOCAxOC04LjA2IDE4LTE4LTguMDYtMTgtMTgtMTh6bTAgMzJjLTcuNzMyIDAtMTQtNi4yNjgtMTQtMTRzNi4yNjgtMTQgMTQtMTQgMTQgNi4yNjggMTQgMTQtNi4yNjggMTQtMTQgMTR6IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9Ii4wNSIvPjwvZz48L3N2Zz4=')] opacity-30" />
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          
          <div className="relative flex items-center gap-4">
            <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
              <Plane className="h-10 w-10" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Edit Travel Request</h1>
              <p className="text-blue-100 mt-1">Update your trip details below</p>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Destination */}
        <Card className="border-0 shadow-lg overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50/50 border-b">
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <MapPin className="h-5 w-5 text-blue-600" />
              </div>
              Destination
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <Input
              value={formData.destination}
              onChange={(e) => setFormData(prev => ({ ...prev, destination: e.target.value }))}
              placeholder="Where do you want to go?"
              className="text-lg h-12 border-slate-200 focus:border-blue-500"
            />
            <div className="mt-4">
              <p className="text-sm text-slate-500 mb-3">Quick picks:</p>
              <div className="flex flex-wrap gap-2">
                {popularDestinations.map((dest) => (
                  <button
                    key={dest.name}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, destination: dest.name }))}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      formData.destination === dest.name
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {dest.emoji} {dest.name}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dates */}
        <Card className="border-0 shadow-lg overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-purple-50/50 border-b">
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Calendar className="h-5 w-5 text-purple-600" />
              </div>
              Travel Dates
              {tripDuration && (
                <span className="ml-auto text-sm font-normal text-purple-600 bg-purple-100 px-3 py-1 rounded-full">
                  {tripDuration} days
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <Label className="text-slate-600 mb-2 block">Start Date</Label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                  className="h-12"
                />
              </div>
              <div>
                <Label className="text-slate-600 mb-2 block">End Date</Label>
                <Input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                  className="h-12"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Travelers */}
        <Card className="border-0 shadow-lg overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-green-50/50 border-b">
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              Travelers
              <span className="ml-auto text-sm font-normal text-green-600 bg-green-100 px-3 py-1 rounded-full">
                {totalTravelers} total
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-6">
              {/* Adults */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div>
                  <p className="font-semibold text-slate-900">Adults</p>
                  <p className="text-sm text-slate-500">Age 13+</p>
                </div>
                <div className="flex items-center gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => adjustTravelers('adults', -1)}
                    disabled={formData.adults <= 1}
                    className="h-10 w-10 rounded-full"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-8 text-center text-xl font-bold text-slate-900">{formData.adults}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => adjustTravelers('adults', 1)}
                    disabled={formData.adults >= 10}
                    className="h-10 w-10 rounded-full"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Children */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div>
                  <p className="font-semibold text-slate-900">Children</p>
                  <p className="text-sm text-slate-500">Age 2-12</p>
                </div>
                <div className="flex items-center gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => adjustTravelers('children', -1)}
                    disabled={formData.children <= 0}
                    className="h-10 w-10 rounded-full"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-8 text-center text-xl font-bold text-slate-900">{formData.children}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => adjustTravelers('children', 1)}
                    disabled={formData.children >= 6}
                    className="h-10 w-10 rounded-full"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Infants */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div>
                  <p className="font-semibold text-slate-900">Infants</p>
                  <p className="text-sm text-slate-500">Under 2</p>
                </div>
                <div className="flex items-center gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => adjustTravelers('infants', -1)}
                    disabled={formData.infants <= 0}
                    className="h-10 w-10 rounded-full"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-8 text-center text-xl font-bold text-slate-900">{formData.infants}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => adjustTravelers('infants', 1)}
                    disabled={formData.infants >= 6}
                    className="h-10 w-10 rounded-full"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Budget */}
        <Card className="border-0 shadow-lg overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-emerald-50/50 border-b">
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <Wallet className="h-5 w-5 text-emerald-600" />
              </div>
              Budget Range
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <Label className="text-slate-600 mb-2 block">Minimum Budget</Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">₹</span>
                  <Input
                    type="number"
                    value={formData.budgetMin}
                    onChange={(e) => setFormData(prev => ({ ...prev, budgetMin: e.target.value }))}
                    placeholder="25,000"
                    className="h-12 pl-8"
                  />
                </div>
              </div>
              <div>
                <Label className="text-slate-600 mb-2 block">Maximum Budget</Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">₹</span>
                  <Input
                    type="number"
                    value={formData.budgetMax}
                    onChange={(e) => setFormData(prev => ({ ...prev, budgetMax: e.target.value }))}
                    placeholder="50,000"
                    className="h-12 pl-8"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Special Requirements */}
        <Card className="border-0 shadow-lg overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-amber-50/50 border-b">
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 bg-amber-100 rounded-lg">
                <FileText className="h-5 w-5 text-amber-600" />
              </div>
              Special Requirements
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <Textarea
              value={formData.specialRequests}
              onChange={(e) => setFormData(prev => ({ ...prev, specialRequests: e.target.value }))}
              placeholder="Any dietary requirements, accessibility needs, preferred activities, or special requests..."
              rows={5}
              className="resize-none"
            />
          </CardContent>
        </Card>

        {/* Submit Buttons */}
        <div className="flex gap-4 pt-4">
          <Link href={`/dashboard/requests/${requestId}`} className="flex-1">
            <Button type="button" variant="outline" className="w-full h-14 text-lg font-semibold">
              Cancel
            </Button>
          </Link>
          <Button 
            type="submit" 
            className="flex-1 h-14 text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg"
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Saving Changes...
              </>
            ) : (
              <>
                <Save className="h-5 w-5 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
