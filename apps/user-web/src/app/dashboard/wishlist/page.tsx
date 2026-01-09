'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Heart,
  MapPin,
  Calendar,
  MessageSquare,
  User,
  Filter,
  Grid3X3,
  List,
  Search,
  SortAsc,
  SortDesc,
  Bell,
  Trash2,
  Download,
  Share2,
  Settings,
  Plus,
  LayoutGrid,
  LayoutList,
} from 'lucide-react';
import { WishlistCard, WishlistEmpty } from '@/components/trust/WishlistCard';
import type { WishlistItem, WishlistItemType } from '@/components/trust/WishlistButton';

// ============================================================================
// MOCK DATA (Replace with API calls)
// ============================================================================

const MOCK_WISHLIST_ITEMS: WishlistItem[] = [
  {
    id: '1',
    itemType: 'destination',
    itemId: 'goa-1',
    itemName: 'Goa - The Beach Paradise',
    itemImageUrl: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=800',
    itemMetadata: { region: 'West India', activities: ['Beach', 'Nightlife', 'Water Sports'] },
    notes: 'Perfect for our anniversary trip! Check prices in October.',
    tags: ['Beach', 'Romantic', 'Anniversary'],
    priority: 5,
    plannedDateStart: '2025-10-15',
    plannedDateEnd: '2025-10-22',
    estimatedBudget: 75000,
    notifyOnDeals: true,
    createdAt: '2025-01-10T10:00:00Z',
  },
  {
    id: '2',
    itemType: 'destination',
    itemId: 'kerala-1',
    itemName: 'Kerala Backwaters',
    itemImageUrl: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=800',
    itemMetadata: { region: 'South India', activities: ['Houseboat', 'Ayurveda', 'Nature'] },
    notes: 'Need to check houseboat options',
    tags: ['Nature', 'Relaxation'],
    priority: 4,
    estimatedBudget: 60000,
    notifyOnDeals: false,
    createdAt: '2025-01-08T14:30:00Z',
  },
  {
    id: '3',
    itemType: 'proposal',
    itemId: 'prop-123',
    itemName: 'Luxury Rajasthan Tour',
    itemImageUrl: 'https://images.unsplash.com/photo-1477587458883-47145ed94245?w=800',
    itemMetadata: { agent: 'Rajasthan Tours', duration: '7 nights' },
    notes: 'Great itinerary, waiting for better pricing',
    tags: ['Luxury', 'Culture'],
    priority: 3,
    estimatedBudget: 150000,
    notifyOnDeals: true,
    createdAt: '2025-01-05T09:15:00Z',
  },
  {
    id: '4',
    itemType: 'agent',
    itemId: 'agent-456',
    itemName: 'Adventure Trails India',
    itemImageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
    itemMetadata: { rating: 4.8, reviews: 156, speciality: 'Adventure Tours' },
    notes: 'Highly recommended for trekking trips',
    tags: ['Adventure', 'Trekking'],
    priority: 4,
    notifyOnDeals: false,
    createdAt: '2025-01-03T16:45:00Z',
  },
  {
    id: '5',
    itemType: 'destination',
    itemId: 'ladakh-1',
    itemName: 'Ladakh - The Land of High Passes',
    itemImageUrl: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=800',
    itemMetadata: { region: 'North India', activities: ['Biking', 'Monastery', 'Adventure'] },
    tags: ['Adventure', 'Mountains'],
    priority: 5,
    plannedDateStart: '2025-06-01',
    plannedDateEnd: '2025-06-10',
    estimatedBudget: 100000,
    notifyOnDeals: true,
    createdAt: '2024-12-28T11:20:00Z',
  },
];

// ============================================================================
// TYPES
// ============================================================================

type SortOption = 'recent' | 'oldest' | 'priority' | 'name' | 'budget';
type ViewMode = 'grid' | 'list' | 'compact';

interface TabConfig {
  type: WishlistItemType | 'all';
  label: string;
  icon: typeof Heart;
  count: number;
}

// ============================================================================
// WISHLIST PAGE COMPONENT
// ============================================================================

export default function WishlistPage() {
  const router = useRouter();
  
  // State
  const [items, setItems] = useState<WishlistItem[]>(MOCK_WISHLIST_ITEMS);
  const [activeTab, setActiveTab] = useState<WishlistItemType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [sortAsc, setSortAsc] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Calculate tab counts
  const tabConfigs: TabConfig[] = useMemo(() => [
    { type: 'all', label: 'All', icon: Heart, count: items.length },
    { type: 'destination', label: 'Destinations', icon: MapPin, count: items.filter(i => i.itemType === 'destination').length },
    { type: 'proposal', label: 'Proposals', icon: MessageSquare, count: items.filter(i => i.itemType === 'proposal').length },
    { type: 'itinerary', label: 'Itineraries', icon: Calendar, count: items.filter(i => i.itemType === 'itinerary').length },
    { type: 'agent', label: 'Agents', icon: User, count: items.filter(i => i.itemType === 'agent').length },
  ], [items]);

  // Get all unique tags
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    items.forEach(item => item.tags?.forEach(tag => tags.add(tag)));
    return Array.from(tags).sort();
  }, [items]);

  // Filter and sort items
  const filteredItems = useMemo(() => {
    let result = [...items];
    
    // Filter by tab
    if (activeTab !== 'all') {
      result = result.filter(item => item.itemType === activeTab);
    }
    
    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(item =>
        item.itemName.toLowerCase().includes(query) ||
        item.notes?.toLowerCase().includes(query) ||
        item.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }
    
    // Filter by tags
    if (selectedTags.length > 0) {
      result = result.filter(item =>
        selectedTags.some(tag => item.tags?.includes(tag))
      );
    }
    
    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'recent':
          comparison = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          break;
        case 'oldest':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'priority':
          comparison = (b.priority || 0) - (a.priority || 0);
          break;
        case 'name':
          comparison = a.itemName.localeCompare(b.itemName);
          break;
        case 'budget':
          comparison = (b.estimatedBudget || 0) - (a.estimatedBudget || 0);
          break;
      }
      return sortAsc ? -comparison : comparison;
    });
    
    return result;
  }, [items, activeTab, searchQuery, selectedTags, sortBy, sortAsc]);

  // Handlers
  const handleRemoveItem = useCallback((item: WishlistItem) => {
    setShowDeleteConfirm(item.id);
  }, []);

  const confirmRemove = useCallback((itemId: string) => {
    setItems(prev => prev.filter(item => item.id !== itemId));
    setShowDeleteConfirm(null);
  }, []);

  const handleEditItem = useCallback((item: WishlistItem) => {
    // Open edit modal (to be implemented)
    console.log('Edit item:', item);
  }, []);

  const handleToggleNotify = useCallback((item: WishlistItem) => {
    setItems(prev => prev.map(i => 
      i.id === item.id ? { ...i, notifyOnDeals: !i.notifyOnDeals } : i
    ));
  }, []);

  const handleViewDetails = useCallback((item: WishlistItem) => {
    const typeConfig = {
      destination: '/explore',
      proposal: '/dashboard/proposals',
      itinerary: '/dashboard/trips',
      agent: '/agents',
    };
    router.push(`${typeConfig[item.itemType]}/${item.itemId}`);
  }, [router]);

  const handleClearAll = useCallback(() => {
    if (confirm('Are you sure you want to clear all wishlist items?')) {
      if (activeTab === 'all') {
        setItems([]);
      } else {
        setItems(prev => prev.filter(item => item.itemType !== activeTab));
      }
    }
  }, [activeTab]);

  const handleExport = useCallback(() => {
    const dataStr = JSON.stringify(filteredItems, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'wishlist.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredItems]);

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            {/* Title Row */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-50 rounded-xl">
                  <Heart className="w-6 h-6 text-red-500 fill-red-500" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">My Wishlist</h1>
                  <p className="text-sm text-gray-500">
                    {items.length} {items.length === 1 ? 'item' : 'items'} saved for later
                  </p>
                </div>
              </div>
              
              {/* Header Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExport}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Export wishlist"
                >
                  <Download size={20} />
                </button>
                <button
                  onClick={() => {/* Share functionality */}}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Share wishlist"
                >
                  <Share2 size={20} />
                </button>
                {filteredItems.length > 0 && (
                  <button
                    onClick={handleClearAll}
                    className="flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm"
                  >
                    <Trash2 size={16} />
                    Clear {activeTab !== 'all' ? tabConfigs.find(t => t.type === activeTab)?.label : 'All'}
                  </button>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1">
              {tabConfigs.map((tab) => {
                const TabIcon = tab.icon;
                const isActive = activeTab === tab.type;
                return (
                  <button
                    key={tab.type}
                    onClick={() => setActiveTab(tab.type)}
                    className={`
                      flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm
                      transition-all duration-200 whitespace-nowrap
                      ${isActive 
                        ? 'bg-gray-900 text-white shadow-sm' 
                        : 'text-gray-600 hover:bg-gray-100'
                      }
                    `}
                  >
                    <TabIcon size={16} className={isActive ? '' : 'opacity-60'} />
                    {tab.label}
                    <span className={`
                      px-2 py-0.5 rounded-full text-xs
                      ${isActive ? 'bg-white/20' : 'bg-gray-200 text-gray-500'}
                    `}>
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search wishlist..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
              />
            </div>

            {/* Filters & Sort */}
            <div className="flex items-center gap-2">
              {/* Filter Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`
                  flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium
                  transition-colors border
                  ${showFilters || selectedTags.length > 0
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'text-gray-600 border-gray-200 hover:bg-gray-50'
                  }
                `}
              >
                <Filter size={16} />
                Filters
                {selectedTags.length > 0 && (
                  <span className="px-1.5 py-0.5 bg-white/20 rounded text-xs">
                    {selectedTags.length}
                  </span>
                )}
              </button>

              {/* Sort Dropdown */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                <option value="recent">Recently Added</option>
                <option value="oldest">Oldest First</option>
                <option value="priority">Priority</option>
                <option value="name">Name</option>
                <option value="budget">Budget</option>
              </select>

              {/* Sort Direction */}
              <button
                onClick={() => setSortAsc(!sortAsc)}
                className="p-2.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                title={sortAsc ? 'Ascending' : 'Descending'}
              >
                {sortAsc ? <SortAsc size={18} /> : <SortDesc size={18} />}
              </button>

              {/* View Mode */}
              <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2.5 ${viewMode === 'grid' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
                  title="Grid view"
                >
                  <LayoutGrid size={18} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2.5 ${viewMode === 'list' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
                  title="List view"
                >
                  <LayoutList size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Tag Filters */}
          {showFilters && allTags.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-gray-500 mr-2">Filter by tag:</span>
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`
                      px-3 py-1.5 rounded-full text-sm font-medium transition-colors
                      ${selectedTags.includes(tag)
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }
                    `}
                  >
                    {tag}
                  </button>
                ))}
                {selectedTags.length > 0 && (
                  <button
                    onClick={() => setSelectedTags([])}
                    className="text-sm text-gray-500 hover:text-gray-700 underline ml-2"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {filteredItems.length === 0 ? (
          <WishlistEmpty
            type={activeTab}
            onExplore={() => router.push('/explore')}
          />
        ) : (
          <div className={`
            ${viewMode === 'grid' 
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' 
              : 'flex flex-col gap-4'
            }
          `}>
            {filteredItems.map((item) => (
              <div key={item.id} className="relative">
                <WishlistCard
                  item={item}
                  variant={viewMode === 'grid' ? 'detailed' : viewMode === 'list' ? 'default' : 'compact'}
                  onRemove={handleRemoveItem}
                  onEdit={handleEditItem}
                  onToggleNotify={handleToggleNotify}
                  onViewDetails={handleViewDetails}
                />
                
                {/* Delete Confirmation */}
                {showDeleteConfirm === item.id && (
                  <div className="absolute inset-0 bg-white/95 backdrop-blur-sm rounded-xl flex items-center justify-center z-20">
                    <div className="text-center p-6">
                      <p className="text-gray-900 font-medium mb-4">
                        Remove "{item.itemName}" from wishlist?
                      </p>
                      <div className="flex items-center justify-center gap-3">
                        <button
                          onClick={() => setShowDeleteConfirm(null)}
                          className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => confirmRemove(item.id)}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Results Summary */}
        {filteredItems.length > 0 && (
          <div className="mt-8 text-center text-sm text-gray-500">
            Showing {filteredItems.length} of {items.length} items
            {(searchQuery || selectedTags.length > 0 || activeTab !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedTags([]);
                  setActiveTab('all');
                }}
                className="ml-2 text-gray-700 hover:text-gray-900 underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
