'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Filter, Plus, Star, Loader2 } from 'lucide-react';
import { 
  ItineraryTemplate, 
  TemplateFilter, 
  listTemplates, 
  getTemplateDestinations,
  getTemplateTags 
} from '@/lib/data/templates';
import { TemplateCard } from './TemplateCard';

interface TemplateListProps {
  onSelect?: (template: ItineraryTemplate) => void;
  onCreateNew?: () => void;
  defaultFilter?: TemplateFilter;
  compact?: boolean;
}

export function TemplateList({ 
  onSelect, 
  onCreateNew, 
  defaultFilter,
  compact = false 
}: TemplateListProps) {
  const [templates, setTemplates] = useState<ItineraryTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  
  // Filters
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<TemplateFilter>(defaultFilter || {});
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter options
  const [destinations, setDestinations] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);

  const loadTemplates = useCallback(async (reset = false) => {
    setLoading(true);
    setError(null);
    
    try {
      const currentFilter: TemplateFilter = {
        ...filter,
        search: search || undefined,
      };
      
      const result = await listTemplates(currentFilter, {
        limit: 20,
        offset: reset ? 0 : templates.length,
      });
      
      if (reset) {
        setTemplates(result.templates);
      } else {
        setTemplates(prev => [...prev, ...result.templates]);
      }
      setTotal(result.pagination.total);
      setHasMore(result.pagination.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, [filter, search, templates.length]);

  const loadFilterOptions = useCallback(async () => {
    try {
      const [dests, tagList] = await Promise.all([
        getTemplateDestinations(),
        getTemplateTags(),
      ]);
      setDestinations(dests);
      setTags(tagList);
    } catch (err) {
      console.error('Failed to load filter options:', err);
    }
  }, []);

  useEffect(() => {
    loadTemplates(true);
    loadFilterOptions();
  }, []);

  useEffect(() => {
    loadTemplates(true);
  }, [filter, search]);

  const handleRefresh = () => {
    loadTemplates(true);
  };

  const clearFilters = () => {
    setFilter({});
    setSearch('');
  };

  const hasActiveFilters = Object.keys(filter).length > 0 || search;

  return (
    <div className="flex flex-col h-full">
      {/* Search and Filters */}
      <div className="space-y-3 mb-4">
        {/* Search bar */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search templates..."
              className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-2 border rounded-lg flex items-center gap-1 text-sm ${
              hasActiveFilters ? 'bg-blue-50 border-blue-200 text-blue-600' : ''
            }`}
          >
            <Filter className="w-4 h-4" />
            {!compact && 'Filters'}
          </button>
          {onCreateNew && (
            <button
              onClick={onCreateNew}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-1 text-sm hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              {!compact && 'New'}
            </button>
          )}
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="p-3 bg-gray-50 rounded-lg space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Type filter */}
              <select
                value={filter.templateType || ''}
                onChange={(e) => setFilter({ ...filter, templateType: e.target.value as TemplateFilter['templateType'] || undefined })}
                className="px-2 py-1.5 border rounded text-sm"
              >
                <option value="">All Types</option>
                <option value="full">Full Itinerary</option>
                <option value="day">Day Plan</option>
                <option value="activity">Activity</option>
                <option value="accommodation">Accommodation</option>
                <option value="transport">Transport</option>
                <option value="meal">Meal</option>
              </select>

              {/* Budget filter */}
              <select
                value={filter.budgetTier || ''}
                onChange={(e) => setFilter({ ...filter, budgetTier: e.target.value as TemplateFilter['budgetTier'] || undefined })}
                className="px-2 py-1.5 border rounded text-sm"
              >
                <option value="">All Budgets</option>
                <option value="budget">Budget</option>
                <option value="mid-range">Mid-Range</option>
                <option value="luxury">Luxury</option>
                <option value="ultra-luxury">Ultra-Luxury</option>
              </select>

              {/* Destination filter */}
              <select
                value={filter.destination || ''}
                onChange={(e) => setFilter({ ...filter, destination: e.target.value || undefined })}
                className="px-2 py-1.5 border rounded text-sm"
              >
                <option value="">All Destinations</option>
                {destinations.map((dest) => (
                  <option key={dest} value={dest}>{dest}</option>
                ))}
              </select>

              {/* Tag filter */}
              <select
                value={filter.tag || ''}
                onChange={(e) => setFilter({ ...filter, tag: e.target.value || undefined })}
                className="px-2 py-1.5 border rounded text-sm"
              >
                <option value="">All Tags</option>
                {tags.map((tag) => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={filter.isFavorite === true}
                  onChange={(e) => setFilter({ ...filter, isFavorite: e.target.checked ? true : undefined })}
                  className="rounded"
                />
                <Star className="w-4 h-4 text-yellow-500" />
                Favorites only
              </label>

              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="ml-auto text-sm text-blue-600 hover:underline"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Results count */}
      <div className="text-sm text-gray-500 mb-2">
        {loading ? 'Loading...' : `${total} template${total !== 1 ? 's' : ''}`}
      </div>

      {/* Template grid */}
      <div className="flex-1 overflow-auto">
        {error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-lg mb-4">
            {error}
            <button onClick={() => loadTemplates(true)} className="ml-2 underline">Retry</button>
          </div>
        )}

        {!loading && templates.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p className="mb-2">No templates found</p>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="text-blue-600 hover:underline">
                Clear filters
              </button>
            )}
            {!hasActiveFilters && onCreateNew && (
              <button
                onClick={onCreateNew}
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
              >
                Create your first template
              </button>
            )}
          </div>
        )}

        <div className={compact ? 'space-y-2' : 'grid gap-4 md:grid-cols-2 lg:grid-cols-3'}>
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onSelect={onSelect}
              onUpdate={handleRefresh}
              compact={compact}
            />
          ))}
        </div>

        {/* Load more */}
        {hasMore && (
          <div className="mt-4 text-center">
            <button
              onClick={() => loadTemplates(false)}
              disabled={loading}
              className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
              ) : null}
              Load more
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
