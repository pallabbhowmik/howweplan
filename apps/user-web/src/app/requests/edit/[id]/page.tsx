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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useUserSession } from '@/lib/user/session';
import { fetchRequest, updateTravelRequest, type TravelRequest } from '@/lib/data/api';

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
          setFormData({
            destination: typeof data.destination === 'string' 
              ? data.destination 
              : data.destination?.label || data.destination?.city || '',
            startDate: data.departureDate ? data.departureDate.split('T')[0] : '',
            endDate: data.returnDate ? data.returnDate.split('T')[0] : '',
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

  if (userLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-500">Loading request...</p>
        </div>
      </div>
    );
  }

  if (error && !request) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="bg-red-100 rounded-full p-6 mb-4">
          <AlertCircle className="h-12 w-12 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Error</h2>
        <p className="text-muted-foreground mb-6">{error}</p>
        <Link href="/dashboard/requests">
          <Button>Back to Requests</Button>
        </Link>
      </div>
    );
  }

  const totalTravelers = formData.adults + formData.children + formData.infants;

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <Link href={`/dashboard/requests/${requestId}`} className="inline-flex items-center text-sm text-slate-500 hover:text-slate-900 group mb-4">
          <ArrowLeft className="h-4 w-4 mr-1 group-hover:-translate-x-1 transition-transform" />
          Back to Request
        </Link>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 text-transparent bg-clip-text">
          Edit Travel Request
        </h1>
        <p className="text-slate-500 mt-1">Update your trip details below</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Destination */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-600" />
              Destination
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              value={formData.destination}
              onChange={(e) => setFormData(prev => ({ ...prev, destination: e.target.value }))}
              placeholder="e.g., Goa, Manali, Kerala"
              className="text-lg"
            />
          </CardContent>
        </Card>

        {/* Dates */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-600" />
              Travel Dates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                />
              </div>
              <div>
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Travelers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-600" />
              Travelers ({totalTravelers})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Adults */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Adults</p>
                  <p className="text-sm text-slate-500">Age 13+</p>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => adjustTravelers('adults', -1)}
                    disabled={formData.adults <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-8 text-center font-semibold">{formData.adults}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => adjustTravelers('adults', 1)}
                    disabled={formData.adults >= 10}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Children */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Children</p>
                  <p className="text-sm text-slate-500">Age 2-12</p>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => adjustTravelers('children', -1)}
                    disabled={formData.children <= 0}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-8 text-center font-semibold">{formData.children}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => adjustTravelers('children', 1)}
                    disabled={formData.children >= 6}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Infants */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Infants</p>
                  <p className="text-sm text-slate-500">Under 2</p>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => adjustTravelers('infants', -1)}
                    disabled={formData.infants <= 0}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-8 text-center font-semibold">{formData.infants}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => adjustTravelers('infants', 1)}
                    disabled={formData.infants >= 6}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Budget */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-emerald-600" />
              Budget Range
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Minimum (₹)</Label>
                <Input
                  type="number"
                  value={formData.budgetMin}
                  onChange={(e) => setFormData(prev => ({ ...prev, budgetMin: e.target.value }))}
                  placeholder="e.g., 25000"
                />
              </div>
              <div>
                <Label>Maximum (₹)</Label>
                <Input
                  type="number"
                  value={formData.budgetMax}
                  onChange={(e) => setFormData(prev => ({ ...prev, budgetMax: e.target.value }))}
                  placeholder="e.g., 50000"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Special Requirements */}
        <Card>
          <CardHeader>
            <CardTitle>Special Requirements</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.specialRequests}
              onChange={(e) => setFormData(prev => ({ ...prev, specialRequests: e.target.value }))}
              placeholder="Any dietary requirements, accessibility needs, or special requests..."
              rows={4}
            />
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex gap-4">
          <Link href={`/dashboard/requests/${requestId}`} className="flex-1">
            <Button type="button" variant="outline" className="w-full">
              Cancel
            </Button>
          </Link>
          <Button 
            type="submit" 
            className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600"
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
