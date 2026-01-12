'use client';

import { useState } from 'react';
import { Star, Copy, Trash2, Archive, Clock, MapPin, Tag } from 'lucide-react';
import { 
  ItineraryTemplate, 
  toggleTemplateFavorite, 
  duplicateTemplate, 
  deleteTemplate,
  archiveTemplate 
} from '@/lib/data/templates';

interface TemplateCardProps {
  template: ItineraryTemplate;
  onSelect?: (template: ItineraryTemplate) => void;
  onUpdate?: () => void;
  compact?: boolean;
}

const typeColors: Record<string, string> = {
  full: 'bg-blue-100 text-blue-800',
  day: 'bg-green-100 text-green-800',
  activity: 'bg-purple-100 text-purple-800',
  accommodation: 'bg-orange-100 text-orange-800',
  transport: 'bg-yellow-100 text-yellow-800',
  meal: 'bg-pink-100 text-pink-800',
};

const budgetColors: Record<string, string> = {
  budget: 'bg-green-50 text-green-700',
  'mid-range': 'bg-blue-50 text-blue-700',
  luxury: 'bg-purple-50 text-purple-700',
  'ultra-luxury': 'bg-amber-50 text-amber-700',
};

export function TemplateCard({ template, onSelect, onUpdate, compact = false }: TemplateCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isFavorite, setIsFavorite] = useState(template.isFavorite);

  const handleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLoading(true);
    try {
      const newValue = await toggleTemplateFavorite(template.id);
      setIsFavorite(newValue);
      onUpdate?.();
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDuplicate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLoading(true);
    try {
      await duplicateTemplate(template.id);
      onUpdate?.();
    } catch (error) {
      console.error('Failed to duplicate:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleArchive = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Archive this template?')) return;
    setIsLoading(true);
    try {
      await archiveTemplate(template.id);
      onUpdate?.();
    } catch (error) {
      console.error('Failed to archive:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Permanently delete this template? This cannot be undone.')) return;
    setIsLoading(true);
    try {
      await deleteTemplate(template.id);
      onUpdate?.();
    } catch (error) {
      console.error('Failed to delete:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (compact) {
    return (
      <div
        onClick={() => onSelect?.(template)}
        className={`p-3 border rounded-lg cursor-pointer transition-all hover:border-blue-400 hover:shadow-sm ${
          isLoading ? 'opacity-50' : ''
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-sm truncate">{template.name}</h4>
              {isFavorite && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500 flex-shrink-0" />}
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
              <span className={`px-1.5 py-0.5 rounded text-xs ${typeColors[template.templateType] || 'bg-gray-100'}`}>
                {template.templateType}
              </span>
              {template.durationDays && (
                <span className="flex items-center gap-0.5">
                  <Clock className="w-3 h-3" />
                  {template.durationDays}d
                </span>
              )}
              {template.usageCount > 0 && (
                <span className="text-gray-400">Used {template.usageCount}x</span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => onSelect?.(template)}
      className={`p-4 border rounded-lg cursor-pointer transition-all hover:border-blue-400 hover:shadow-md ${
        isLoading ? 'opacity-50' : ''
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-base truncate">{template.name}</h3>
            <button
              onClick={handleFavorite}
              className="p-1 rounded hover:bg-gray-100"
              disabled={isLoading}
            >
              <Star className={`w-4 h-4 ${isFavorite ? 'text-yellow-500 fill-yellow-500' : 'text-gray-400'}`} />
            </button>
          </div>
          {template.description && (
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{template.description}</p>
          )}
        </div>
        <div className="flex gap-1">
          <button
            onClick={handleDuplicate}
            className="p-1.5 rounded hover:bg-gray-100 text-gray-500"
            title="Duplicate"
            disabled={isLoading}
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={handleArchive}
            className="p-1.5 rounded hover:bg-gray-100 text-gray-500"
            title="Archive"
            disabled={isLoading}
          >
            <Archive className="w-4 h-4" />
          </button>
          <button
            onClick={handleDelete}
            className="p-1.5 rounded hover:bg-red-50 text-red-500"
            title="Delete"
            disabled={isLoading}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Metadata */}
      <div className="flex flex-wrap items-center gap-2 mt-3">
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeColors[template.templateType] || 'bg-gray-100'}`}>
          {template.templateType}
        </span>
        {template.budgetTier && (
          <span className={`px-2 py-0.5 rounded text-xs ${budgetColors[template.budgetTier] || 'bg-gray-100'}`}>
            {template.budgetTier}
          </span>
        )}
        {template.durationDays && (
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <Clock className="w-3 h-3" />
            {template.durationDays} days
          </span>
        )}
      </div>

      {/* Destinations */}
      {template.destinations.length > 0 && (
        <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
          <MapPin className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">{template.destinations.slice(0, 3).join(', ')}</span>
          {template.destinations.length > 3 && (
            <span className="text-gray-400">+{template.destinations.length - 3}</span>
          )}
        </div>
      )}

      {/* Tags */}
      {template.tags.length > 0 && (
        <div className="flex items-center gap-1 mt-2">
          <Tag className="w-3 h-3 text-gray-400 flex-shrink-0" />
          <div className="flex flex-wrap gap-1">
            {template.tags.slice(0, 4).map((tag) => (
              <span key={tag} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                {tag}
              </span>
            ))}
            {template.tags.length > 4 && (
              <span className="text-xs text-gray-400">+{template.tags.length - 4}</span>
            )}
          </div>
        </div>
      )}

      {/* Usage stats */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t text-xs text-gray-400">
        <span>Used {template.usageCount} times</span>
        {template.lastUsedAt && (
          <span>Last: {new Date(template.lastUsedAt).toLocaleDateString()}</span>
        )}
      </div>
    </div>
  );
}
