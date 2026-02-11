'use client';

import { useState, useEffect, useCallback } from 'react';
import { Sparkles, FileText, ChevronRight, Star, Clock, Loader2 } from 'lucide-react';
import { 
  ItineraryTemplate, 
  TemplateSuggestion, 
  getTemplateSuggestions,
  getTemplate,
  recordTemplateUsage 
} from '@/lib/data/templates';

interface TemplatePickerProps {
  /** Context for smart suggestions */
  context?: {
    destination?: string;
    travelStyle?: string;
    duration?: number;
  };
  /** Called when a template is selected */
  onSelect: (template: ItineraryTemplate) => void;
  /** Called when user wants to start from scratch */
  onStartFromScratch?: () => void;
  /** Whether the picker is in a loading state */
  disabled?: boolean;
}

export function TemplatePicker({ 
  context, 
  onSelect, 
  onStartFromScratch,
  disabled = false 
}: TemplatePickerProps) {
  const [suggestions, setSuggestions] = useState<TemplateSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadSuggestions = useCallback(async () => {
    setLoading(true);
    try {
      const results = await getTemplateSuggestions(context, expanded ? 20 : 5);
      setSuggestions(results);
    } catch (err) {
      console.error('Failed to load template suggestions:', err);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, [context, expanded]);

  useEffect(() => {
    loadSuggestions();
  }, [loadSuggestions]);

  const handleSelectTemplate = async (suggestion: TemplateSuggestion) => {
    setSelecting(suggestion.id);
    try {
      // Fetch full template
      const template = await getTemplate(suggestion.id);
      
      // Record usage (don't await - fire and forget)
      recordTemplateUsage(suggestion.id, {
        destination: context?.destination,
        travelStyle: context?.travelStyle,
      });
      
      onSelect(template);
    } catch (err) {
      console.error('Failed to load template:', err);
      setLoadError('Failed to load template. Please try again.');
      setTimeout(() => setLoadError(null), 4000);
    } finally {
      setSelecting(null);
    }
  };

  if (loading && suggestions.length === 0) {
    return (
      <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
        <div className="flex items-center justify-center gap-2 text-blue-600">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading template suggestions...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-blue-100 bg-white/50">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">Quick Start with Templates</h3>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          {context?.destination 
            ? `Suggested templates for trips to ${context.destination}`
            : 'Start with a template or create from scratch'}
        </p>
      </div>

      {/* Templates */}
      <div className="p-4">
        {suggestions.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No templates yet. Create your first one!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.id}
                onClick={() => handleSelectTemplate(suggestion)}
                disabled={disabled || selecting !== null}
                className={`w-full p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-400 hover:shadow-sm transition-all text-left flex items-center gap-3 ${
                  disabled ? 'opacity-50 cursor-not-allowed' : ''
                } ${selecting === suggestion.id ? 'border-blue-500 ring-2 ring-blue-200' : ''}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 truncate">{suggestion.name}</span>
                    {suggestion.isFavorite && (
                      <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    <span className="px-1.5 py-0.5 bg-gray-100 rounded capitalize">
                      {suggestion.templateType}
                    </span>
                    {suggestion.durationDays && (
                      <span className="flex items-center gap-0.5">
                        <Clock className="w-3 h-3" />
                        {suggestion.durationDays} days
                      </span>
                    )}
                    {suggestion.destinations.length > 0 && (
                      <span className="truncate max-w-[150px]">
                        {suggestion.destinations.slice(0, 2).join(', ')}
                      </span>
                    )}
                  </div>
                </div>
                {selecting === suggestion.id ? (
                  <Loader2 className="w-4 h-4 text-blue-600 animate-spin flex-shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Show more / Show less */}
        {suggestions.length > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full mt-3 py-2 text-sm text-blue-600 hover:text-blue-700"
          >
            {expanded ? 'Show fewer' : 'Show more templates'}
          </button>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 pt-0 flex gap-2">
        {onStartFromScratch && (
          <button
            onClick={onStartFromScratch}
            disabled={disabled}
            className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Start from Scratch
          </button>
        )}
        <button
          onClick={() => window.location.href = '/templates'}
          disabled={disabled}
          className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          Browse All Templates
        </button>
      </div>
    </div>
  );
}
