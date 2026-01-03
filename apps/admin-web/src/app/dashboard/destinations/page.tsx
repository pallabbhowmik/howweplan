'use client';

import React, { useState, useMemo, ChangeEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import {
  getDestinations,
  createDestination,
  updateDestination,
  deleteDestination,
  getDestinationStats,
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
} from 'lucide-react';

// ============================================================================
// DESTINATION FORM COMPONENT
// ============================================================================

interface DestinationFormProps {
  destination?: Destination | null;
  onSubmit: (data: CreateDestinationDto | UpdateDestinationDto) => void;
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const data = isEditing
      ? {
          name: formData.name,
          state: formData.state,
          region: formData.region,
          themes: formData.themes,
          idealMonths: formData.idealMonths,
          suggestedDurationMin: formData.suggestedDurationMin,
          suggestedDurationMax: formData.suggestedDurationMax,
          highlight: formData.highlight,
          imageUrl: formData.imageUrl || null,
          isFeatured: formData.isFeatured,
          isActive: formData.isActive,
          displayOrder: formData.displayOrder,
        }
      : {
          id: formData.id,
          name: formData.name,
          state: formData.state,
          region: formData.region,
          themes: formData.themes,
          idealMonths: formData.idealMonths,
          suggestedDurationMin: formData.suggestedDurationMin,
          suggestedDurationMax: formData.suggestedDurationMax,
          highlight: formData.highlight,
          imageUrl: formData.imageUrl || null,
          isFeatured: formData.isFeatured,
          isActive: formData.isActive,
          displayOrder: formData.displayOrder,
        };

    onSubmit(data);
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

      {/* Image URL */}
      <div className="space-y-2">
        <Label htmlFor="imageUrl">Image URL</Label>
        <div className="flex gap-2">
          <Input
            id="imageUrl"
            value={formData.imageUrl}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, imageUrl: e.target.value }))}
            placeholder="https://images.unsplash.com/..."
            className="flex-1"
          />
          {formData.imageUrl && (
            <div className="relative h-10 w-16 rounded border overflow-hidden">
              <Image
                src={formData.imageUrl}
                alt="Preview"
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Use Unsplash URLs: https://images.unsplash.com/photo-XXXXX?w=800&h=500&fit=crop
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
// MAIN DESTINATIONS PAGE
// ============================================================================

export default function DestinationsPage() {
  const queryClient = useQueryClient();
  
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [regionFilter, setRegionFilter] = useState<DestinationRegion | 'all'>('all');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDestination, setEditingDestination] = useState<Destination | null>(null);
  const [deletingDestination, setDeletingDestination] = useState<Destination | null>(null);

  // Queries
  const { data: destinationsData, isLoading } = useQuery({
    queryKey: ['destinations', { search: searchQuery, region: regionFilter, active: activeFilter }],
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
      setIsFormOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDestinationDto }) => 
      updateDestination(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['destinations'] });
      queryClient.invalidateQueries({ queryKey: ['destination-stats'] });
      setEditingDestination(null);
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

  // Handlers
  const handleCreate = (data: CreateDestinationDto | UpdateDestinationDto) => {
    createMutation.mutate(data as CreateDestinationDto);
  };

  const handleUpdate = (data: CreateDestinationDto | UpdateDestinationDto) => {
    if (editingDestination) {
      updateMutation.mutate({ id: editingDestination.id, data: data as UpdateDestinationDto });
    }
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

  const destinations = destinationsData?.data || [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MapPin className="h-6 w-6" />
            Destinations
          </h1>
          <p className="text-muted-foreground">
            Manage explore page destinations and their images
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Destination
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Destinations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || destinations.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats?.active || destinations.filter(d => d.isActive).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Featured
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {stats?.featured || destinations.filter(d => d.isFeatured).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Missing Images
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {destinations.filter(d => !d.imageUrl).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search destinations..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={regionFilter}
              onValueChange={(value) => setRegionFilter(value as DestinationRegion | 'all')}
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
            <Select
              value={activeFilter}
              onValueChange={(value) => setActiveFilter(value as 'all' | 'active' | 'inactive')}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Destinations Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
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
                  <TableCell colSpan={9} className="text-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : destinations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No destinations found
                  </TableCell>
                </TableRow>
              ) : (
                destinations.map(destination => (
                  <TableRow key={destination.id} className={!destination.isActive ? 'opacity-50' : ''}>
                    <TableCell>
                      {destination.imageUrl ? (
                        <div className="relative h-10 w-14 rounded overflow-hidden">
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
                    <TableCell className="font-medium">{destination.name}</TableCell>
                    <TableCell>{destination.state}</TableCell>
                    <TableCell>
                      <Badge className={REGION_COLORS[destination.region]} variant="secondary">
                        {destination.region}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {destination.themes.slice(0, 2).map(theme => (
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
        </CardContent>
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
            isLoading={createMutation.isPending}
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
              isLoading={updateMutation.isPending}
            />
          )}
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
