'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, Users, MapPin, Plane } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function NewRequestPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    destination: '',
    startDate: '',
    endDate: '',
    travelers: 2,
    budget: '',
    tripType: 'leisure',
    preferences: '',
    specialRequests: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // In real app, this would call the API
    console.log('Submitting request:', formData);
    router.push('/dashboard');
  };

  const updateForm = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <Link href="/dashboard" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  s <= step ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'
                }`}
              >
                {s}
              </div>
              {s < 3 && (
                <div className={`w-20 h-1 ${s < step ? 'bg-blue-600' : 'bg-slate-200'}`} />
              )}
            </div>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plane className="h-6 w-6 text-blue-600" />
              {step === 1 && 'Where do you want to go?'}
              {step === 2 && 'Tell us more about your trip'}
              {step === 3 && 'Review & Submit'}
            </CardTitle>
            <CardDescription>
              {step === 1 && 'Enter your destination and travel dates'}
              {step === 2 && 'Help us match you with the perfect agents'}
              {step === 3 && 'Review your request before submitting'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {step === 1 && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="destination">
                      <MapPin className="h-4 w-4 inline mr-2" />
                      Destination
                    </Label>
                    <Input
                      id="destination"
                      placeholder="e.g., Rajasthan, Kerala, Goa"
                      value={formData.destination}
                      onChange={(e) => updateForm('destination', e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="startDate">
                        <Calendar className="h-4 w-4 inline mr-2" />
                        Start Date
                      </Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => updateForm('startDate', e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endDate">End Date</Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={formData.endDate}
                        onChange={(e) => updateForm('endDate', e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="travelers">
                        <Users className="h-4 w-4 inline mr-2" />
                        Number of Travelers
                      </Label>
                      <Input
                        id="travelers"
                        type="number"
                        min="1"
                        max="20"
                        value={formData.travelers}
                        onChange={(e) => updateForm('travelers', parseInt(e.target.value))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="budget">
                        Budget (INR)
                      </Label>
                      <Input
                        id="budget"
                        type="number"
                        placeholder="e.g., 5000"
                        value={formData.budget}
                        onChange={(e) => updateForm('budget', e.target.value)}
                      />
                    </div>
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <div className="space-y-2">
                    <Label>Trip Type</Label>
                    <div className="grid grid-cols-3 gap-3">
                      {['leisure', 'adventure', 'business'].map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => updateForm('tripType', type)}
                          className={`p-4 border rounded-lg text-center capitalize transition-colors ${
                            formData.tripType === type
                              ? 'border-blue-600 bg-blue-50 text-blue-600'
                              : 'hover:border-slate-400'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="preferences">What experiences are you looking for?</Label>
                    <Textarea
                      id="preferences"
                      placeholder="e.g., Cultural tours, local cuisine, relaxing beaches, nightlife..."
                      value={formData.preferences}
                      onChange={(e) => updateForm('preferences', e.target.value)}
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="specialRequests">Special Requests (Optional)</Label>
                    <Textarea
                      id="specialRequests"
                      placeholder="e.g., Dietary restrictions, accessibility needs, must-see attractions..."
                      value={formData.specialRequests}
                      onChange={(e) => updateForm('specialRequests', e.target.value)}
                      rows={3}
                    />
                  </div>
                </>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <div className="bg-slate-50 rounded-lg p-6 space-y-4">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Destination</span>
                      <span className="font-medium">{formData.destination || 'Not specified'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Dates</span>
                      <span className="font-medium">
                        {formData.startDate && formData.endDate
                          ? `${formData.startDate} to ${formData.endDate}`
                          : 'Not specified'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Travelers</span>
                      <span className="font-medium">{formData.travelers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Budget</span>
                      <span className="font-medium">
                        {formData.budget ? `₹${Number(formData.budget).toLocaleString('en-IN')}` : 'Flexible'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Trip Type</span>
                      <span className="font-medium capitalize">{formData.tripType}</span>
                    </div>
                    {formData.preferences && (
                      <div className="pt-2 border-t">
                        <span className="text-muted-foreground block mb-1">Preferences</span>
                        <span className="text-sm">{formData.preferences}</span>
                      </div>
                    )}
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
                    <p className="font-medium text-blue-800 mb-2">What happens next?</p>
                    <ul className="text-blue-700 space-y-1 list-disc list-inside">
                      <li>Your request will be sent to matching travel agents</li>
                      <li>Agents will submit itinerary proposals within 24-48 hours</li>
                      <li>You&apos;ll compare options and select your favorite</li>
                      <li>Full details revealed after you confirm an agent</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between pt-4">
                {step > 1 ? (
                  <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>
                    Back
                  </Button>
                ) : (
                  <div />
                )}
                
                {step < 3 ? (
                  <Button type="button" onClick={() => setStep(step + 1)}>
                    Continue
                  </Button>
                ) : (
                  <Button type="submit">
                    Submit Request
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
