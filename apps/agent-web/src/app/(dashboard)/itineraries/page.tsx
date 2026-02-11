'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Search,
  Plus,
  FileText,
  Link2,
  Upload,
  Calendar,
  DollarSign,
  Users,
  MapPin,
  Clock,
  MoreVertical,
  Edit,
  Copy,
  Trash2,
  Eye,
  CheckCircle,
  AlertCircle,
  Send,
  ChevronRight,
  Filter,
  Grid,
  List,
  Star,
  TrendingUp,
} from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Input,
  Tabs,
  TabsList,
  TabsTrigger,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Textarea,
  Progress,
  Skeleton,
} from '@/components/ui';
import { cn } from '@/lib/utils';
import { listAgentItineraries, type AgentItinerary } from '@/lib/data/agent';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Type for display itinerary (transformed from AgentItinerary)
type DisplayItinerary = {
  id: string;
  name: string;
  requestId: string;
  destination: string;
  client: { firstName: string; lastName: string };
  status: string;
  daysCount: number;
  totalPrice: number;
  commission: number;
  createdAt: string;
  updatedAt: string;
  itemsCount: number;
  coverImage: string;
  highlights: string[];
  viewCount: number;
  rating: number | null;
  revisionNote?: string;
};

const templates = [
  { id: 't1', name: 'Luxury Beach Resort', type: 'beach', usageCount: 24 },
  { id: 't2', name: 'Wildlife Safari', type: 'adventure', usageCount: 18 },
  { id: 't3', name: 'Heritage & Culture', type: 'heritage', usageCount: 32 },
  { id: 't4', name: 'Romantic Getaway', type: 'romance', usageCount: 15 },
];

/**
 * Transform API itinerary to display format.
 */
function transformItinerary(itinerary: AgentItinerary): DisplayItinerary {
  const overview = itinerary.overview ?? {};
  const pricing = itinerary.pricing ?? { totalPrice: 0 };
  const destinations = overview.destinations ?? [];
  
  return {
    id: itinerary.id,
    name: overview.title ?? 'Untitled Itinerary',
    requestId: itinerary.requestId,
    destination: destinations.join(', ') || 'Destination TBD',
    client: itinerary.client ?? { firstName: 'Client', lastName: '' },
    status: itinerary.status?.toLowerCase?.() ?? 'draft',
    daysCount: overview.numberOfDays ?? 0,
    totalPrice: pricing.totalPrice ?? 0,
    commission: Math.round((pricing.totalPrice ?? 0) * 0.1),
    createdAt: itinerary.createdAt,
    updatedAt: itinerary.updatedAt,
    itemsCount: itinerary.items?.length ?? 0,
    coverImage: '',
    highlights: destinations.slice(0, 3),
    viewCount: itinerary.viewCount ?? 0,
    rating: itinerary.rating ?? null,
    revisionNote: undefined,
  };
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
  }).format(cents / 100);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getStatusConfig(status: string): {
  label: string;
  variant: 'success' | 'warning' | 'info' | 'default' | 'destructive';
  icon: React.ReactNode;
} {
  const configs: Record<string, { label: string; variant: 'success' | 'warning' | 'info' | 'default' | 'destructive'; icon: React.ReactNode }> = {
    draft: { label: 'Draft', variant: 'default', icon: <FileText className="h-3 w-3" /> },
    submitted: { label: 'Submitted', variant: 'info', icon: <Send className="h-3 w-3" /> },
    sent: { label: 'Sent to Client', variant: 'info', icon: <Send className="h-3 w-3" /> },
    under_review: { label: 'Under Review', variant: 'warning', icon: <Eye className="h-3 w-3" /> },
    approved: { label: 'Approved', variant: 'success', icon: <CheckCircle className="h-3 w-3" /> },
    revision_requested: { label: 'Revision Requested', variant: 'warning', icon: <AlertCircle className="h-3 w-3" /> },
    completed: { label: 'Completed', variant: 'default', icon: <CheckCircle className="h-3 w-3" /> },
    rejected: { label: 'Rejected', variant: 'destructive', icon: <AlertCircle className="h-3 w-3" /> },
    cancelled: { label: 'Cancelled', variant: 'destructive', icon: <AlertCircle className="h-3 w-3" /> },
    archived: { label: 'Archived', variant: 'default', icon: <FileText className="h-3 w-3" /> },
  };
  return configs[status?.toLowerCase()] || { label: status || 'Unknown', variant: 'default', icon: null };
}

// ============================================================================
// COMPONENTS
// ============================================================================

function ItineraryCardSkeleton({ viewMode }: { viewMode: 'grid' | 'list' }) {
  if (viewMode === 'grid') {
    return (
      <Card className="overflow-hidden">
        <Skeleton className="h-40 w-full" />
        <CardContent className="p-4 space-y-3">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-16" />
          </div>
          <div className="flex justify-between">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-8 w-16" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ItineraryCard({ itinerary, viewMode }: { itinerary: DisplayItinerary; viewMode: 'grid' | 'list' }) {
  const statusConfig = getStatusConfig(itinerary.status);

  if (viewMode === 'grid') {
    return (
      <Card className="group overflow-hidden transition-all duration-200 hover:shadow-lg">
        {/* Cover Image Placeholder */}
        <div className="h-40 bg-gradient-to-br from-indigo-100 to-purple-100 relative">
          <div className="absolute inset-0 flex items-center justify-center">
            <MapPin className="h-12 w-12 text-indigo-300" />
          </div>
          <div className="absolute top-3 right-3">
            <Badge variant={statusConfig.variant} className="gap-1">
              {statusConfig.icon}
              {statusConfig.label}
            </Badge>
          </div>
          {itinerary.rating && (
            <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-full px-2 py-1">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <span className="text-sm font-medium">{itinerary.rating}</span>
            </div>
          )}
        </div>

        <CardContent className="p-4">
          <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-indigo-600 transition-colors">
            {itinerary.name}
          </h3>
          <p className="text-sm text-gray-500 mb-3">
            {itinerary.client.firstName} {itinerary.client.lastName}
          </p>

          <div className="flex flex-wrap gap-1 mb-3">
            {itinerary.highlights.slice(0, 2).map((h, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {h}
              </Badge>
            ))}
            {itinerary.highlights.length > 2 && (
              <Badge variant="secondary" className="text-xs">
                +{itinerary.highlights.length - 2}
              </Badge>
            )}
          </div>

          <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {itinerary.daysCount} days
            </span>
            <span className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              {itinerary.viewCount} views
            </span>
          </div>

          <div className="flex items-center justify-between pt-3 border-t">
            <div>
              <p className="text-lg font-semibold text-gray-900">{formatCurrency(itinerary.totalPrice)}</p>
              <p className="text-xs text-emerald-600">{formatCurrency(itinerary.commission)} commission</p>
            </div>
            <Button size="sm" asChild>
              <Link href={['draft', 'submitted', 'under_review'].includes(itinerary.status) ? `/itineraries/${itinerary.id}/edit` : `/itineraries/${itinerary.id}`}>
                {['draft', 'submitted', 'under_review'].includes(itinerary.status) ? 'Edit' : 'View'}
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // List view
  return (
    <Card className="group transition-all duration-200 hover:shadow-lg">
      <CardContent className="p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          {/* Image placeholder */}
          <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center flex-shrink-0">
            <MapPin className="h-8 w-8 text-indigo-300" />
          </div>

          {/* Main Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-1">
              <div>
                <Link href={`/itineraries/${itinerary.id}`} className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors hover:underline">
                  {itinerary.name}
                </Link>
                <p className="text-sm text-gray-500">
                  {itinerary.client.firstName} {itinerary.client.lastName} • {itinerary.destination}
                </p>
              </div>
              <Badge variant={statusConfig.variant} className="gap-1 ml-2">
                {statusConfig.icon}
                {statusConfig.label}
              </Badge>
            </div>

            {itinerary.status === 'revision_requested' && itinerary.revisionNote && (
              <div className="mt-2 p-2 bg-amber-50 border border-amber-100 rounded-lg text-sm text-amber-700">
                <strong>Revision note:</strong> {itinerary.revisionNote}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {itinerary.daysCount} days
              </span>
              <span className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                {itinerary.itemsCount} items
              </span>
              <span className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                {itinerary.viewCount} views
              </span>
              <span>Updated {formatDate(itinerary.updatedAt)}</span>
            </div>
          </div>

          {/* Financials & Actions */}
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-lg font-semibold text-gray-900">{formatCurrency(itinerary.totalPrice)}</p>
              <p className="text-sm text-emerald-600">{formatCurrency(itinerary.commission)} commission</p>
            </div>
            <div className="flex gap-2">
              {['draft', 'submitted', 'under_review'].includes(itinerary.status) && (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/itineraries/${itinerary.id}/edit`}>
                    <Edit className="h-4 w-4" />
                  </Link>
                </Button>
              )}
              <Button variant="outline" size="sm" title="Duplicate itinerary" onClick={() => {
                navigator.clipboard.writeText(JSON.stringify({
                  name: itinerary.name,
                  destination: itinerary.destination,
                  totalPrice: itinerary.totalPrice,
                }));
                window.location.href = `/itineraries/${itinerary.id}`;
              }}>
                <Copy className="h-4 w-4" />
              </Button>
              <Button size="sm" asChild>
                <Link href={`/itineraries/${itinerary.id}`}>
                  {['draft', 'submitted', 'under_review'].includes(itinerary.status) ? 'Edit' : 'View'}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CreateItineraryDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState(1);
  const [createMethod, setCreateMethod] = useState<'manual' | 'upload' | 'link' | null>(null);
  const [selectedRequest, setSelectedRequest] = useState('');

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Itinerary</DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="py-4">
            <p className="text-sm text-gray-600 mb-4">
              Choose how you want to create your itinerary:
            </p>
            <div className="grid gap-3">
              <button
                onClick={() => setCreateMethod('manual')}
                className={cn(
                  'flex items-center gap-4 p-4 rounded-lg border-2 transition-all text-left',
                  createMethod === 'manual'
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Build from Scratch</h4>
                  <p className="text-sm text-gray-500">Create a detailed itinerary step by step</p>
                </div>
              </button>

              <button
                onClick={() => setCreateMethod('upload')}
                className={cn(
                  'flex items-center gap-4 p-4 rounded-lg border-2 transition-all text-left',
                  createMethod === 'upload'
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                  <Upload className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Upload PDF</h4>
                  <p className="text-sm text-gray-500">Import from an existing document</p>
                </div>
              </button>

              <button
                onClick={() => setCreateMethod('link')}
                className={cn(
                  'flex items-center gap-4 p-4 rounded-lg border-2 transition-all text-left',
                  createMethod === 'link'
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                  <Link2 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Add Link</h4>
                  <p className="text-sm text-gray-500">Link to an external itinerary</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {step === 1 && (
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={() => setStep(2)} disabled={!createMethod}>
              Continue
            </Button>
          </DialogFooter>
        )}

        {step === 2 && createMethod === 'manual' && (
          <>
            <div className="py-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Itinerary Name</label>
                <Input placeholder="e.g., Luxury Kerala Honeymoon" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Associated Request</label>
                <Select value={selectedRequest} onValueChange={setSelectedRequest}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select a travel request" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="req-1">REQ-2024-078 - Kerala Trip</SelectItem>
                    <SelectItem value="req-2">REQ-2024-075 - Rajasthan Trip</SelectItem>
                    <SelectItem value="req-3">REQ-2024-072 - Ranthambore Safari</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Description</label>
                <Textarea placeholder="Brief overview of this itinerary..." className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Use a Template (Optional)</label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      className="p-3 text-left rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all"
                    >
                      <p className="font-medium text-sm text-gray-900">{template.name}</p>
                      <p className="text-xs text-gray-500">{template.usageCount} uses</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={onClose}>Create Itinerary</Button>
            </DialogFooter>
          </>
        )}

        {step === 2 && createMethod === 'upload' && (
          <>
            <div className="py-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-indigo-400 transition-colors cursor-pointer">
                <Upload className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-gray-600 mb-1">
                  Drag and drop your PDF here, or <span className="text-indigo-600 font-medium">browse</span>
                </p>
                <p className="text-xs text-gray-400">PDF up to 10MB</p>
              </div>
              <div className="mt-4">
                <label className="text-sm font-medium text-gray-700">Associated Request</label>
                <Select value={selectedRequest} onValueChange={setSelectedRequest}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select a travel request" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="req-1">REQ-2024-078 - Kerala Trip</SelectItem>
                    <SelectItem value="req-2">REQ-2024-075 - Rajasthan Trip</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={onClose}>Upload & Create</Button>
            </DialogFooter>
          </>
        )}

        {step === 2 && createMethod === 'link' && (
          <>
            <div className="py-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Itinerary Link</label>
                <Input placeholder="https://..." className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Title</label>
                <Input placeholder="Give this itinerary a name" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Associated Request</label>
                <Select value={selectedRequest} onValueChange={setSelectedRequest}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select a travel request" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="req-1">REQ-2024-078 - Kerala Trip</SelectItem>
                    <SelectItem value="req-2">REQ-2024-075 - Rajasthan Trip</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={onClose}>Add Link</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function ItinerariesPage() {
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const [itineraries, setItineraries] = useState<DisplayItinerary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadItineraries() {
      try {
        setIsLoading(true);
        setError(null);
        const data = await listAgentItineraries({ limit: 100 });
        const transformed = data.map(transformItinerary);
        setItineraries(transformed);
      } catch (err) {
        console.error('Failed to load itineraries:', err);
        setError('Failed to load itineraries. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }

    loadItineraries();
  }, []);

  const filteredItineraries = itineraries.filter((itinerary) => {
    // Tab filter
    if (activeTab === 'drafts' && itinerary.status !== 'draft') return false;
    if (activeTab === 'sent' && itinerary.status !== 'sent' && itinerary.status !== 'submitted') return false;
    if (activeTab === 'approved' && itinerary.status !== 'approved') return false;
    if (activeTab === 'needs_revision' && itinerary.status !== 'revision_requested' && itinerary.status !== 'rejected') return false;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        itinerary.name.toLowerCase().includes(query) ||
        itinerary.destination.toLowerCase().includes(query) ||
        itinerary.client.firstName.toLowerCase().includes(query) ||
        itinerary.client.lastName.toLowerCase().includes(query)
      );
    }

    return true;
  });

  const counts = {
    drafts: itineraries.filter((i) => i.status === 'draft').length,
    sent: itineraries.filter((i) => i.status === 'sent' || i.status === 'submitted').length,
    approved: itineraries.filter((i) => i.status === 'approved').length,
    needsRevision: itineraries.filter((i) => i.status === 'revision_requested' || i.status === 'rejected').length,
  };

  const totalValue = itineraries.reduce((sum, i) => sum + i.totalPrice, 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Itineraries</h1>
          <p className="mt-1 text-gray-500">
            Create and manage travel itineraries for your clients
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Itinerary
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-indigo-100 p-2">
              <FileText className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Itineraries</p>
              {isLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <p className="text-2xl font-bold text-gray-900">{itineraries.length}</p>
              )}
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-amber-100 p-2">
              <AlertCircle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Needs Revision</p>
              {isLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <p className="text-2xl font-bold text-gray-900">{counts.needsRevision}</p>
              )}
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-emerald-100 p-2">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Approved</p>
              {isLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <p className="text-2xl font-bold text-gray-900">{counts.approved}</p>
              )}
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-purple-100 p-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Value</p>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalValue)}</p>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="drafts">
                  Drafts
                  {counts.drafts > 0 && (
                    <Badge variant="secondary" className="ml-2">{counts.drafts}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="sent">Sent</TabsTrigger>
                <TabsTrigger value="needs_revision">
                  Needs Revision
                  {counts.needsRevision > 0 && (
                    <Badge variant="warning" className="ml-2">{counts.needsRevision}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="approved">Approved</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex gap-3">
              <div className="relative flex-1 lg:w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search itineraries..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex rounded-lg border border-gray-200 p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    'rounded-md p-2 transition-colors',
                    viewMode === 'grid' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700'
                  )}
                >
                  <Grid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={cn(
                    'rounded-md p-2 transition-colors',
                    viewMode === 'list' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700'
                  )}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Itineraries Grid/List */}
      {isLoading ? (
        <div className={cn(
          viewMode === 'grid' 
            ? 'grid gap-6 sm:grid-cols-2 lg:grid-cols-3' 
            : 'space-y-4'
        )}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <ItineraryCardSkeleton key={i} viewMode={viewMode} />
          ))}
        </div>
      ) : error ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">Error loading itineraries</h3>
            <p className="text-gray-500 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      ) : filteredItineraries.length > 0 ? (
        <div className={cn(
          viewMode === 'grid' 
            ? 'grid gap-6 sm:grid-cols-2 lg:grid-cols-3' 
            : 'space-y-4'
        )}>
          {filteredItineraries.map((itinerary) => (
            <ItineraryCard key={itinerary.id} itinerary={itinerary} viewMode={viewMode} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <FileText className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No itineraries found</h3>
            <p className="text-gray-500 mb-4">
              {searchQuery
                ? 'Try adjusting your search terms'
                : 'Create your first itinerary to get started'}
            </p>
            {!searchQuery && (
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Itinerary
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create Dialog */}
      <CreateItineraryDialog 
        open={showCreateDialog} 
        onClose={() => setShowCreateDialog(false)} 
      />
    </div>
  );
}
