'use client';

import Link from 'next/link';
import { useState } from 'react';
import { FileText, Upload, Link as LinkIcon, Calendar, MapPin, DollarSign, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const mockItineraries = [
  {
    id: 'I001',
    requestId: 'R001',
    destination: 'Rajasthan, India',
    status: 'draft',
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    client: 'Rahul & Priya S.',
    days: 10,
    totalCost: 1100000,
  },
  {
    id: 'I002',
    requestId: 'R004',
    destination: 'Goa, India',
    status: 'submitted',
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    client: 'Vikram & Sneha G.',
    days: 10,
    totalCost: 850000,
  },
  {
    id: 'I003',
    requestId: 'R012',
    destination: 'Kerala, India',
    status: 'approved',
    createdAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
    client: 'Arjun K.',
    days: 7,
    totalCost: 950000,
  },
];

function ItineraryCard({ itinerary }: { itinerary: typeof mockItineraries[0] }) {
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(cents / 100);
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    return `${Math.floor(diffInHours / 24)} days ago`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="outline">Draft</Badge>;
      case 'submitted':
        return <Badge variant="warning">Awaiting Review</Badge>;
      case 'approved':
        return <Badge variant="success">Approved</Badge>;
      case 'needs_revision':
        return <Badge variant="destructive">Needs Revision</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-lg">{itinerary.destination}</h3>
              {getStatusBadge(itinerary.status)}
            </div>
            <p className="text-sm text-muted-foreground">
              Itinerary #{itinerary.id} · Request #{itinerary.requestId}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Created {formatTimeAgo(itinerary.createdAt)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
          <div>
            <p className="text-muted-foreground">Client</p>
            <p className="font-medium">{itinerary.client}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Duration</p>
            <p className="font-medium">{itinerary.days} days</p>
          </div>
          <div>
            <p className="text-muted-foreground">Total Cost</p>
            <p className="font-medium">{formatCurrency(itinerary.totalCost)}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Link href={`/dashboard/itineraries/${itinerary.id}`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full">
              <FileText className="h-4 w-4 mr-1" />
              View Details
            </Button>
          </Link>
          {itinerary.status === 'draft' && (
            <Button size="sm" className="flex-1">
              <CheckCircle className="h-4 w-4 mr-1" />
              Submit to Client
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ItinerariesPage() {
  const [uploadMethod, setUploadMethod] = useState<'pdf' | 'link' | 'manual' | null>(null);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-1">Itineraries</h1>
              <p className="text-muted-foreground">Create and manage trip itineraries</p>
            </div>
            <div className="flex gap-2">
              <Link href="/dashboard">
                <Button variant="outline">← Back</Button>
              </Link>
              <Button onClick={() => setUploadMethod('manual')}>
                <FileText className="h-4 w-4 mr-2" />
                Create New Itinerary
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div className="space-y-6">
          {/* Upload Options Modal/Section */}
          {uploadMethod && (
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle>Create New Itinerary</CardTitle>
                <CardDescription>Choose how you want to create your itinerary</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  <button
                    onClick={() => setUploadMethod('pdf')}
                    className={`p-6 border-2 rounded-lg hover:border-blue-500 transition-colors ${
                      uploadMethod === 'pdf' ? 'border-blue-500 bg-white' : 'bg-white'
                    }`}
                  >
                    <Upload className="h-8 w-8 mb-3 text-blue-600" />
                    <h3 className="font-semibold mb-2">Upload PDF</h3>
                    <p className="text-sm text-muted-foreground">
                      Upload a PDF document with your itinerary
                    </p>
                  </button>
                  <button
                    onClick={() => setUploadMethod('link')}
                    className={`p-6 border-2 rounded-lg hover:border-blue-500 transition-colors ${
                      uploadMethod === 'link' ? 'border-blue-500 bg-white' : 'bg-white'
                    }`}
                  >
                    <LinkIcon className="h-8 w-8 mb-3 text-blue-600" />
                    <h3 className="font-semibold mb-2">Share Link</h3>
                    <p className="text-sm text-muted-foreground">
                      Provide a link to your itinerary (Google Docs, etc.)
                    </p>
                  </button>
                  <button
                    onClick={() => setUploadMethod('manual')}
                    className={`p-6 border-2 rounded-lg hover:border-blue-500 transition-colors ${
                      uploadMethod === 'manual' ? 'border-blue-500 bg-white' : 'bg-white'
                    }`}
                  >
                    <FileText className="h-8 w-8 mb-3 text-blue-600" />
                    <h3 className="font-semibold mb-2">Manual Entry</h3>
                    <p className="text-sm text-muted-foreground">
                      Build your itinerary day-by-day in our editor
                    </p>
                  </button>
                </div>
                <div className="mt-4 text-center">
                  <Button variant="ghost" size="sm" onClick={() => setUploadMethod(null)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{mockItineraries.filter(i => i.status === 'draft').length}</div>
                <p className="text-sm text-muted-foreground">Drafts</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{mockItineraries.filter(i => i.status === 'submitted').length}</div>
                <p className="text-sm text-muted-foreground">Submitted</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{mockItineraries.filter(i => i.status === 'approved').length}</div>
                <p className="text-sm text-muted-foreground">Approved</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{mockItineraries.length}</div>
                <p className="text-sm text-muted-foreground">Total</p>
              </CardContent>
            </Card>
          </div>

          {/* Itineraries List */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Your Itineraries</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {mockItineraries.map((itinerary) => (
                <ItineraryCard key={itinerary.id} itinerary={itinerary} />
              ))}
            </div>
          </div>

          {/* Tips Card */}
          <Card className="bg-green-50 border-green-200">
            <CardHeader>
              <CardTitle className="text-green-900">💡 Pro Tips</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-green-800">
                <li>• Include detailed day-by-day activities for better client experience</li>
                <li>• Add accommodation and transportation details</li>
                <li>• Provide backup options for weather-dependent activities</li>
                <li>• Include emergency contacts and important local information</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
