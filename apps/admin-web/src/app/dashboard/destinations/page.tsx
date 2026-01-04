'use client';

import React, { useEffect, useState, useMemo, ChangeEvent, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import {
  getDestinations,
  createDestination,
  updateDestination,
  uploadDestinationImage,
  deleteDestination,
  getDestinationStats,
  bulkUpdateDestinations,
  DESTINATION_REGIONS,
  DESTINATION_THEMES,
  MONTH_NAMES,
  THEME_COLORS,
  REGION_COLORS,
} from '@/lib/api';
import type {
  Destination,
  DestinationRegion,
  DestinationTheme,
  CreateDestinationDto,
  UpdateDestinationDto,
} from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  MapPin,
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Star,
  ImageIcon,
  Filter,
  Download,
  Upload,
  RefreshCw,
  Globe,
  Mountain,
  Trees,
  Building,
  Waves,
  Grid3X3,
  List,
  CheckSquare,
  Square,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Calendar,
  Clock,
  TrendingUp,
  BarChart3,
  Settings2,
  Copy,
  ExternalLink,
  Sparkles,
  AlertCircle,
} from 'lucide-react';

// ============================================================================
// DESTINATION FORM COMPONENT
// ============================================================================

interface DestinationFormProps {
  destination?: Destination | null;
  onSubmit: (data: CreateDestinationDto | UpdateDestinationDto, imageFile: File | null) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

function DestinationForm({ destination, onSubmit, onCancel, isLoading }: DestinationFormProps) {
  const isEditing = !!destination;
  
  const [formData, setFormData] = useState({
    id: destination?.id || '',
    name: destination?.name || '',
    state: destination?.state || '',
    region: destination?.region || 'North' as DestinationRegion,
    themes: [...(destination?.themes || [])] as DestinationTheme[],
    idealMonths: [...(destination?.idealMonths || [])] as number[],
    suggestedDurationMin: destination?.suggestedDurationMin || 2,
    suggestedDurationMax: destination?.suggestedDurationMax || 4,
    highlight: destination?.highlight || '',
    imageUrl: destination?.imageUrl || '',
    isFeatured: destination?.isFeatured || false,
    isActive: destination?.isActive ?? true,
    displayOrder: destination?.displayOrder || 0,
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!imageFile) {
      setImagePreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(imageFile);
    setImagePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const common = {
      name: formData.name,
      state: formData.state,
      region: formData.region,
      themes: formData.themes,
      idealMonths: formData.idealMonths,
      suggestedDurationMin: formData.suggestedDurationMin,
      suggestedDurationMax: formData.suggestedDurationMax,
      highlight: formData.highlight,
      isFeatured: formData.isFeatured,
      isActive: formData.isActive,
      displayOrder: formData.displayOrder,
    };

    const data = isEditing
      ? ({
          ...common,
          // If a new file is selected, backend upload endpoint will set imageUrl.
          ...(imageFile ? {} : { imageUrl: formData.imageUrl || null }),
        } satisfies UpdateDestinationDto)
      : ({
          id: formData.id,
          ...common,
          imageUrl: formData.imageUrl || null,
        } satisfies CreateDestinationDto);

    onSubmit(data, imageFile);
  };

  const toggleTheme = (theme: DestinationTheme) => {
    setFormData(prev => ({
      ...prev,
      themes: prev.themes.includes(theme)
        ? prev.themes.filter(t => t !== theme)
        : [...prev.themes, theme],
    }));
  };

  const toggleMonth = (month: number) => {
    setFormData(prev => ({
      ...prev,
      idealMonths: prev.idealMonths.includes(month)
        ? prev.idealMonths.filter(m => m !== month)
        : [...prev.idealMonths, month].sort((a, b) => a - b),
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        {/* ID - only for new destinations */}
        {!isEditing && (
          <div className="space-y-2">
            <Label htmlFor="id">ID (URL-friendly)</Label>
            <Input
              id="id"
              value={formData.id}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, id: e.target.value }))}
              placeholder="e.g., in-jaipur"
              required
            />
            <p className="text-xs text-muted-foreground">
              Use format: in-cityname (lowercase, no spaces)
            </p>
          </div>
        )}

        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="e.g., Jaipur"
            required
          />
        </div>

        {/* State */}
        <div className="space-y-2">
          <Label htmlFor="state">State/UT</Label>
          <Input
            id="state"
            value={formData.state}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, state: e.target.value }))}
            placeholder="e.g., Rajasthan"
            required
          />
        </div>

        {/* Region */}
        <div className="space-y-2">
          <Label htmlFor="region">Region</Label>
          <Select
            value={formData.region}
            onValueChange={(value: DestinationRegion) => 
              setFormData(prev => ({ ...prev, region: value }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DESTINATION_REGIONS.map(region => (
                <SelectItem key={region} value={region}>{region}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Duration */}
        <div className="space-y-2">
          <Label>Suggested Duration (days)</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={1}
              max={30}
              value={formData.suggestedDurationMin}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ 
                ...prev, 
                suggestedDurationMin: parseInt(e.target.value) || 1 
              }))}
              className="w-20"
            />
            <span className="text-muted-foreground">to</span>
            <Input
              type="number"
              min={1}
              max={60}
              value={formData.suggestedDurationMax}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ 
                ...prev, 
                suggestedDurationMax: parseInt(e.target.value) || 1 
              }))}
              className="w-20"
            />
            <span className="text-muted-foreground">days</span>
          </div>
        </div>

        {/* Display Order */}
        <div className="space-y-2">
          <Label htmlFor="displayOrder">Display Order</Label>
          <Input
            id="displayOrder"
            type="number"
            min={0}
            value={formData.displayOrder}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ 
              ...prev, 
              displayOrder: parseInt(e.target.value) || 0 
            }))}
          />
          <p className="text-xs text-muted-foreground">Lower = higher priority</p>
        </div>
      </div>

      {/* Image Upload */}
      <div className="space-y-2">
        <Label htmlFor="imageFile">Image</Label>
        <div className="grid grid-cols-[1fr_auto] gap-2 items-start">
          <Input
            id="imageFile"
            type="file"
            accept="image/*"
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              const file = e.target.files?.[0] || null;
              setImageFile(file);
            }}
          />
          <div className="relative h-10 w-16 rounded border overflow-hidden">
            {(imagePreviewUrl || formData.imageUrl) ? (
              <Image
                src={imagePreviewUrl || formData.imageUrl}
                alt="Preview"
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="h-full w-full bg-muted" />
            )}
          </div>
        </div>

        {formData.imageUrl && (
          <div className="space-y-1">
            <Label htmlFor="imageUrl" className="text-xs text-muted-foreground">
              Current image URL
            </Label>
            <Input id="imageUrl" value={formData.imageUrl} disabled />
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Upload an image file. It will be stored in Supabase Storage and shown in user web.
        </p>
      </div>

      {/* Highlight */}
      <div className="space-y-2">
        <Label htmlFor="highlight">Highlight</Label>
        <Textarea
          id="highlight"
          value={formData.highlight}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setFormData(prev => ({ ...prev, highlight: e.target.value }))}
          placeholder="Brief description of what makes this destination special..."
          rows={2}
          required
        />
      </div>

      {/* Themes */}
      <div className="space-y-2">
        <Label>Themes (select all that apply)</Label>
        <div className="flex flex-wrap gap-2">
          {DESTINATION_THEMES.map(theme => (
            <Badge
              key={theme}
              variant={formData.themes.includes(theme) ? 'default' : 'outline'}
              className="cursor-pointer transition-colors"
              onClick={() => toggleTheme(theme)}
            >
              {theme}
            </Badge>
          ))}
        </div>
      </div>

      {/* Ideal Months */}
      <div className="space-y-2">
        <Label>Best Months to Visit</Label>
        <div className="flex flex-wrap gap-2">
          {MONTH_NAMES.map((month, idx) => (
            <Badge
              key={month}
              variant={formData.idealMonths.includes(idx + 1) ? 'default' : 'outline'}
              className="cursor-pointer transition-colors"
              onClick={() => toggleMonth(idx + 1)}
            >
              {month.slice(0, 3)}
            </Badge>
          ))}
        </div>
      </div>

      {/* Flags */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Checkbox
            id="isActive"
            checked={formData.isActive}
            onCheckedChange={(checked: boolean | 'indeterminate') => 
              setFormData(prev => ({ ...prev, isActive: checked === true }))
            }
          />
          <Label htmlFor="isActive" className="cursor-pointer">Active (visible on explore page)</Label>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="isFeatured"
            checked={formData.isFeatured}
            onCheckedChange={(checked: boolean | 'indeterminate') => 
              setFormData(prev => ({ ...prev, isFeatured: checked === true }))
            }
          />
          <Label htmlFor="isFeatured" className="cursor-pointer">Featured (shown in hero section)</Label>
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : isEditing ? 'Update Destination' : 'Create Destination'}
        </Button>
      </DialogFooter>
    </form>
  );
}

// ============================================================================
// DESTINATION PREVIEW COMPONENT
// ============================================================================

interface DestinationPreviewProps {
  destination: Destination;
  onClose: () => void;
}

function DestinationPreview({ destination, onClose }: DestinationPreviewProps) {
  return (
    <div className="space-y-6">
      {/* Hero Image */}
      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted">
        {destination.imageUrl ? (
          <Image
            src={destination.imageUrl}
            alt={destination.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <ImageIcon className="h-16 w-16 text-muted-foreground" />
          </div>
        )}
        {destination.isFeatured && (
          <Badge className="absolute top-2 left-2 bg-amber-500">
            <Star className="h-3 w-3 mr-1" /> Featured
          </Badge>
        )}
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-muted-foreground text-xs">State</Label>
          <p className="font-medium">{destination.state}</p>
        </div>
        <div>
          <Label className="text-muted-foreground text-xs">Region</Label>
          <Badge className={REGION_COLORS[destination.region]} variant="secondary">
            {destination.region}
          </Badge>
        </div>
        <div>
          <Label className="text-muted-foreground text-xs">Duration</Label>
          <p className="font-medium">{destination.suggestedDurationMin}-{destination.suggestedDurationMax} days</p>
        </div>
        <div>
          <Label className="text-muted-foreground text-xs">Status</Label>
          <Badge variant={destination.isActive ? 'default' : 'secondary'}>
            {destination.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      </div>

      {/* Highlight */}
      <div>
        <Label className="text-muted-foreground text-xs">Highlight</Label>
        <p className="text-sm mt-1">{destination.highlight}</p>
      </div>

      {/* Themes */}
      <div>
        <Label className="text-muted-foreground text-xs">Themes</Label>
        <div className="flex flex-wrap gap-1 mt-1">
          {destination.themes.map((theme) => (
            <Badge key={theme} className={THEME_COLORS[theme]} variant="secondary">
              {theme}
            </Badge>
          ))}
        </div>
      </div>

      {/* Best Months */}
      <div>
        <Label className="text-muted-foreground text-xs">Best Months to Visit</Label>
        <div className="flex flex-wrap gap-1 mt-1">
          {destination.idealMonths.map((month) => (
            <Badge key={month} variant="outline">
              {MONTH_NAMES[month - 1]?.slice(0, 3)}
            </Badge>
          ))}
        </div>
      </div>

      {/* ID for developers */}
      <div className="pt-2 border-t">
        <Label className="text-muted-foreground text-xs">Destination ID</Label>
        <div className="flex items-center gap-2 mt-1">
          <code className="text-xs bg-muted px-2 py-1 rounded">{destination.id}</code>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigator.clipboard.writeText(destination.id)}
          >
            <Copy className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// DESTINATION CARD COMPONENT (for grid view)
// ============================================================================

interface DestinationCardProps {
  destination: Destination;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onEdit: (destination: Destination) => void;
  onDelete: (destination: Destination) => void;
  onToggleActive: (destination: Destination) => void;
  onToggleFeatured: (destination: Destination) => void;
  onPreview: (destination: Destination) => void;
}

function DestinationCard({
  destination,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onToggleActive,
  onToggleFeatured,
  onPreview,
}: DestinationCardProps) {
  return (
    <Card className={`overflow-hidden transition-all hover:shadow-lg ${isSelected ? 'ring-2 ring-primary' : ''}`}>
      {/* Image */}
      <div className="relative aspect-[4/3] bg-muted">
        {destination.imageUrl ? (
          <Image
            src={destination.imageUrl}
            alt={destination.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <ImageIcon className="h-12 w-12 text-muted-foreground" />
          </div>
        )}
        
        {/* Selection checkbox */}
        <div 
          className="absolute top-2 left-2 cursor-pointer"
          onClick={(e) => { e.stopPropagation(); onSelect(destination.id); }}
        >
          {isSelected ? (
            <CheckSquare className="h-5 w-5 text-primary bg-white rounded" />
          ) : (
            <Square className="h-5 w-5 text-muted-foreground bg-white/80 rounded" />
          )}
        </div>

        {/* Badges */}
        <div className="absolute top-2 right-2 flex gap-1">
          {destination.isFeatured && (
            <Badge className="bg-amber-500">
              <Star className="h-3 w-3" />
            </Badge>
          )}
          {!destination.isActive && (
            <Badge variant="secondary">
              <EyeOff className="h-3 w-3" />
            </Badge>
          )}
        </div>
      </div>

      {/* Content */}
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{destination.name}</h3>
            <p className="text-sm text-muted-foreground truncate">{destination.state}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onPreview(destination)}>
                <Eye className="h-4 w-4 mr-2" /> Preview
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(destination)}>
                <Pencil className="h-4 w-4 mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onToggleActive(destination)}>
                {destination.isActive ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                {destination.isActive ? 'Deactivate' : 'Activate'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onToggleFeatured(destination)}>
                <Star className={`h-4 w-4 mr-2 ${destination.isFeatured ? 'fill-amber-400' : ''}`} />
                {destination.isFeatured ? 'Unfeature' : 'Feature'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onDelete(destination)} className="text-red-600">
                <Trash2 className="h-4 w-4 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mt-2">
          <Badge className={`${REGION_COLORS[destination.region]} text-xs`} variant="secondary">
            {destination.region}
          </Badge>
          {destination.themes.slice(0, 2).map((theme) => (
            <Badge key={theme} variant="outline" className="text-xs">
              {theme}
            </Badge>
          ))}
          {destination.themes.length > 2 && (
            <Badge variant="outline" className="text-xs">
              +{destination.themes.length - 2}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN DESTINATIONS PAGE
// ============================================================================

export default function DestinationsPage() {
  const queryClient = useQueryClient();
  
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [regionFilter, setRegionFilter] = useState<DestinationRegion | 'all'>('all');
  const [themeFilter, setThemeFilter] = useState<DestinationTheme | 'all'>('all');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDestination, setEditingDestination] = useState<Destination | null>(null);
  const [deletingDestination, setDeletingDestination] = useState<Destination | null>(null);
  const [previewDestination, setPreviewDestination] = useState<Destination | null>(null);
  
  // View state
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Pagination
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Queries
  const { data: destinationsData, isLoading, refetch } = useQuery({
    queryKey: ['destinations', { search: searchQuery, region: regionFilter, theme: themeFilter, active: activeFilter }],
    queryFn: () => getDestinations({
      page: 1,
      limit: 500, // Get all for client-side filtering
      filters: {
        ...(regionFilter !== 'all' && { region: regionFilter }),
        ...(activeFilter !== 'all' && { isActive: activeFilter === 'active' }),
        ...(searchQuery && { search: searchQuery }),
      },
    }),
  });

  const { data: stats } = useQuery({
    queryKey: ['destination-stats'],
    queryFn: getDestinationStats,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: createDestination,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['destinations'] });
      queryClient.invalidateQueries({ queryKey: ['destination-stats'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDestinationDto }) => 
      updateDestination(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['destinations'] });
      queryClient.invalidateQueries({ queryKey: ['destination-stats'] });
    },
  });

  const uploadImageMutation = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => uploadDestinationImage(id, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['destinations'] });
      queryClient.invalidateQueries({ queryKey: ['destination-stats'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDestination,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['destinations'] });
      queryClient.invalidateQueries({ queryKey: ['destination-stats'] });
      setDeletingDestination(null);
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: bulkUpdateDestinations,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['destinations'] });
      queryClient.invalidateQueries({ queryKey: ['destination-stats'] });
      setSelectedIds(new Set());
    },
  });

  // Filter destinations by theme (client-side since API doesn't support theme filter)
  const allDestinations: Destination[] = useMemo(() => {
    const data = (destinationsData?.data ?? []) as Destination[];
    if (themeFilter === 'all') return data;
    return data.filter((d: Destination) => d.themes.includes(themeFilter));
  }, [destinationsData, themeFilter]);

  // Paginate destinations
  const paginatedDestinations = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return allDestinations.slice(start, start + itemsPerPage);
  }, [allDestinations, page, itemsPerPage]);

  const totalPages = Math.ceil(allDestinations.length / itemsPerPage);

  // Selection helpers
  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(paginatedDestinations.map((d: Destination) => d.id)));
  }, [paginatedDestinations]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Handlers
  const handleCreate = async (data: CreateDestinationDto | UpdateDestinationDto, imageFile: File | null) => {
    const created = await createMutation.mutateAsync(data as CreateDestinationDto);
    if (imageFile) {
      await uploadImageMutation.mutateAsync({ id: created.id, file: imageFile });
    }
    setIsFormOpen(false);
  };

  const handleUpdate = async (data: CreateDestinationDto | UpdateDestinationDto, imageFile: File | null) => {
    if (!editingDestination) return;
    await updateMutation.mutateAsync({ id: editingDestination.id, data: data as UpdateDestinationDto });
    if (imageFile) {
      await uploadImageMutation.mutateAsync({ id: editingDestination.id, file: imageFile });
    }
    setEditingDestination(null);
  };

  const handleDelete = () => {
    if (deletingDestination) {
      deleteMutation.mutate(deletingDestination.id);
    }
  };

  const handleToggleActive = (destination: Destination) => {
    updateMutation.mutate({
      id: destination.id,
      data: { isActive: !destination.isActive },
    });
  };

  const handleToggleFeatured = (destination: Destination) => {
    updateMutation.mutate({
      id: destination.id,
      data: { isFeatured: !destination.isFeatured },
    });
  };

  // Bulk action handlers
  const handleBulkActivate = () => {
    const updates = Array.from(selectedIds).map((id) => ({
      id,
      updates: { isActive: true },
    }));
    bulkUpdateMutation.mutate(updates);
  };

  const handleBulkDeactivate = () => {
    const updates = Array.from(selectedIds).map((id) => ({
      id,
      updates: { isActive: false },
    }));
    bulkUpdateMutation.mutate(updates);
  };

  const handleBulkFeature = () => {
    const updates = Array.from(selectedIds).map((id) => ({
      id,
      updates: { isFeatured: true },
    }));
    bulkUpdateMutation.mutate(updates);
  };

  const handleBulkUnfeature = () => {
    const updates = Array.from(selectedIds).map((id) => ({
      id,
      updates: { isFeatured: false },
    }));
    bulkUpdateMutation.mutate(updates);
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['ID', 'Name', 'State', 'Region', 'Themes', 'Ideal Months', 'Duration Min', 'Duration Max', 'Highlight', 'Featured', 'Active'];
    const rows = allDestinations.map((d: Destination) => [
      d.id,
      d.name,
      d.state,
      d.region,
      d.themes.join('; '),
      d.idealMonths.map(m => MONTH_NAMES[m - 1]).join('; '),
      d.suggestedDurationMin,
      d.suggestedDurationMax,
      d.highlight,
      d.isFeatured ? 'Yes' : 'No',
      d.isActive ? 'Yes' : 'No',
    ]);
    
    const csvContent = [headers, ...rows].map(row => 
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `destinations-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // Computed stats
  const computedStats = useMemo(() => {
    const total = allDestinations.length;
    const active = allDestinations.filter((d: Destination) => d.isActive).length;
    const featured = allDestinations.filter((d: Destination) => d.isFeatured).length;
    const missingImages = allDestinations.filter((d: Destination) => !d.imageUrl).length;
    const regionCounts = DESTINATION_REGIONS.reduce((acc, region) => {
      acc[region] = allDestinations.filter((d: Destination) => d.region === region).length;
      return acc;
    }, {} as Record<DestinationRegion, number>);
    const themeCounts = DESTINATION_THEMES.reduce((acc, theme) => {
      acc[theme] = allDestinations.filter((d: Destination) => d.themes.includes(theme)).length;
      return acc;
    }, {} as Record<DestinationTheme, number>);
    
    return { total, active, featured, missingImages, regionCounts, themeCounts };
  }, [allDestinations]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MapPin className="h-6 w-6" />
            Destinations Management
          </h1>
          <p className="text-muted-foreground">
            Manage explore page destinations, images, and featured content
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Destination
          </Button>
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Total Destinations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{computedStats.total}</div>
            <Progress value={(computedStats.active / computedStats.total) * 100} className="mt-2 h-1" />
            <p className="text-xs text-muted-foreground mt-1">{computedStats.active} active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{computedStats.active}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {Math.round((computedStats.active / computedStats.total) * 100)}% of total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Star className="h-4 w-4" />
              Featured
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">{computedStats.featured}</div>
            <p className="text-xs text-muted-foreground mt-1">Shown in hero section</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Missing Images
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{computedStats.missingImages}</div>
            <p className="text-xs text-muted-foreground mt-1">Needs attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Region & Theme Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Destinations by Region</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {DESTINATION_REGIONS.map((region) => (
              <div key={region} className="flex items-center gap-2">
                <span className="text-sm w-24">{region}</span>
                <Progress 
                  value={(computedStats.regionCounts[region] / computedStats.total) * 100} 
                  className="flex-1 h-2"
                />
                <span className="text-sm text-muted-foreground w-8 text-right">
                  {computedStats.regionCounts[region]}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Popular Themes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {DESTINATION_THEMES
                .sort((a, b) => computedStats.themeCounts[b] - computedStats.themeCounts[a])
                .slice(0, 10)
                .map((theme) => (
                  <Badge 
                    key={theme} 
                    variant="secondary"
                    className={`${THEME_COLORS[theme]} cursor-pointer ${themeFilter === theme ? 'ring-2 ring-primary' : ''}`}
                    onClick={() => setThemeFilter(themeFilter === theme ? 'all' : theme)}
                  >
                    {theme} ({computedStats.themeCounts[theme]})
                  </Badge>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Actions Bar */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search destinations..."
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
                className="pl-10"
              />
            </div>
            
            {/* Region Filter */}
            <Select
              value={regionFilter}
              onValueChange={(value) => { setRegionFilter(value as DestinationRegion | 'all'); setPage(1); }}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All regions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Regions</SelectItem>
                {DESTINATION_REGIONS.map(region => (
                  <SelectItem key={region} value={region}>{region}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Theme Filter */}
            <Select
              value={themeFilter}
              onValueChange={(value) => { setThemeFilter(value as DestinationTheme | 'all'); setPage(1); }}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All themes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Themes</SelectItem>
                {DESTINATION_THEMES.map(theme => (
                  <SelectItem key={theme} value={theme}>{theme}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Status Filter */}
            <Select
              value={activeFilter}
              onValueChange={(value) => { setActiveFilter(value as 'all' | 'active' | 'inactive'); setPage(1); }}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            {/* View Mode Toggle */}
            <div className="flex items-center border rounded-md">
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-r-none"
                onClick={() => setViewMode('table')}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-l-none"
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 mt-4 pt-4 border-t">
              <Badge variant="secondary" className="mr-2">
                {selectedIds.size} selected
              </Badge>
              <Button size="sm" variant="outline" onClick={handleBulkActivate}>
                <Eye className="h-4 w-4 mr-1" /> Activate
              </Button>
              <Button size="sm" variant="outline" onClick={handleBulkDeactivate}>
                <EyeOff className="h-4 w-4 mr-1" /> Deactivate
              </Button>
              <Button size="sm" variant="outline" onClick={handleBulkFeature}>
                <Star className="h-4 w-4 mr-1" /> Feature
              </Button>
              <Button size="sm" variant="outline" onClick={handleBulkUnfeature}>
                <Star className="h-4 w-4 mr-1" /> Unfeature
              </Button>
              <div className="flex-1" />
              <Button size="sm" variant="ghost" onClick={clearSelection}>
                <X className="h-4 w-4 mr-1" /> Clear
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Destinations List/Grid */}
      <Card>
        <CardContent className="p-0">
          {viewMode === 'table' ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={paginatedDestinations.length > 0 && paginatedDestinations.every((d: Destination) => selectedIds.has(d.id))}
                      onCheckedChange={(checked) => checked ? selectAll() : clearSelection()}
                    />
                  </TableHead>
                  <TableHead className="w-16">Image</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Themes</TableHead>
                  <TableHead className="w-20">Duration</TableHead>
                  <TableHead className="w-20 text-center">Status</TableHead>
                  <TableHead className="w-20 text-center">Featured</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : paginatedDestinations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      No destinations found
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedDestinations.map((destination: Destination) => (
                    <TableRow key={destination.id} className={!destination.isActive ? 'opacity-60' : ''}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(destination.id)}
                          onCheckedChange={() => toggleSelection(destination.id)}
                        />
                      </TableCell>
                      <TableCell>
                        {destination.imageUrl ? (
                          <div 
                            className="relative h-10 w-14 rounded overflow-hidden cursor-pointer hover:ring-2 ring-primary"
                            onClick={() => setPreviewDestination(destination)}
                          >
                            <Image
                              src={destination.imageUrl}
                              alt={destination.name}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                        ) : (
                          <div className="h-10 w-14 rounded bg-muted flex items-center justify-center">
                            <ImageIcon className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <button
                          className="font-medium hover:underline text-left"
                          onClick={() => setPreviewDestination(destination)}
                        >
                          {destination.name}
                        </button>
                      </TableCell>
                      <TableCell>{destination.state}</TableCell>
                      <TableCell>
                        <Badge className={REGION_COLORS[destination.region]} variant="secondary">
                          {destination.region}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {destination.themes.slice(0, 2).map((theme: DestinationTheme) => (
                            <Badge key={theme} variant="outline" className="text-xs">
                              {theme}
                            </Badge>
                          ))}
                          {destination.themes.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{destination.themes.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {destination.suggestedDurationMin}-{destination.suggestedDurationMax}d
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleActive(destination)}
                        >
                          {destination.isActive ? (
                            <Eye className="h-4 w-4 text-green-600" />
                          ) : (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleFeatured(destination)}
                        >
                          <Star
                            className={`h-4 w-4 ${
                              destination.isFeatured 
                                ? 'fill-amber-400 text-amber-400' 
                                : 'text-muted-foreground'
                            }`}
                          />
                        </Button>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setPreviewDestination(destination)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Preview
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setEditingDestination(destination)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setDeletingDestination(destination)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          ) : (
            <div className="p-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : paginatedDestinations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No destinations found
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {paginatedDestinations.map((destination: Destination) => (
                    <DestinationCard
                      key={destination.id}
                      destination={destination}
                      isSelected={selectedIds.has(destination.id)}
                      onSelect={toggleSelection}
                      onEdit={setEditingDestination}
                      onDelete={setDeletingDestination}
                      onToggleActive={handleToggleActive}
                      onToggleFeatured={handleToggleFeatured}
                      onPreview={setPreviewDestination}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>

        {/* Pagination */}
        {allDestinations.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>
                Showing {((page - 1) * itemsPerPage) + 1}-{Math.min(page * itemsPerPage, allDestinations.length)} of {allDestinations.length}
              </span>
              <Select
                value={String(itemsPerPage)}
                onValueChange={(value) => { setItemsPerPage(Number(value)); setPage(1); }}
              >
                <SelectTrigger className="w-20 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <span>per page</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(1)}
                disabled={page === 1}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-3 text-sm">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Create Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Destination</DialogTitle>
            <DialogDescription>
              Add a new destination to the explore page
            </DialogDescription>
          </DialogHeader>
          <DestinationForm
            onSubmit={handleCreate}
            onCancel={() => setIsFormOpen(false)}
            isLoading={createMutation.isPending || uploadImageMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingDestination} onOpenChange={() => setEditingDestination(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Destination</DialogTitle>
            <DialogDescription>
              Update destination details and image
            </DialogDescription>
          </DialogHeader>
          {editingDestination && (
            <DestinationForm
              destination={editingDestination}
              onSubmit={handleUpdate}
              onCancel={() => setEditingDestination(null)}
              isLoading={updateMutation.isPending || uploadImageMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewDestination} onOpenChange={() => setPreviewDestination(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              {previewDestination?.name}
            </DialogTitle>
          </DialogHeader>
          {previewDestination && (
            <DestinationPreview
              destination={previewDestination}
              onClose={() => setPreviewDestination(null)}
            />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewDestination(null)}>
              Close
            </Button>
            <Button onClick={() => {
              setEditingDestination(previewDestination);
              setPreviewDestination(null);
            }}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingDestination} onOpenChange={() => setDeletingDestination(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Destination</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deletingDestination?.name}</strong>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
