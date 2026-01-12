'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Plus, Trash2, GripVertical } from 'lucide-react';
import { 
  createTemplate, 
  CreateTemplateInput, 
  TemplateType, 
  BudgetTier,
  DayContent,
  ActivityContent 
} from '@/lib/data/templates';

const TEMPLATE_TYPES: { value: TemplateType; label: string; description: string }[] = [
  { value: 'full', label: 'Full Itinerary', description: 'Complete multi-day trip plan' },
  { value: 'day', label: 'Day Plan', description: 'Single day activities' },
  { value: 'activity', label: 'Activity', description: 'Individual activity or excursion' },
  { value: 'accommodation', label: 'Accommodation', description: 'Hotel or stay details' },
  { value: 'transport', label: 'Transport', description: 'Transfer or transportation' },
  { value: 'meal', label: 'Meal', description: 'Restaurant or dining experience' },
];

const BUDGET_TIERS: { value: BudgetTier; label: string }[] = [
  { value: 'budget', label: 'Budget' },
  { value: 'mid-range', label: 'Mid-Range' },
  { value: 'luxury', label: 'Luxury' },
  { value: 'ultra-luxury', label: 'Ultra-Luxury' },
];

const TRAVEL_STYLES = [
  'Adventure', 'Cultural', 'Relaxation', 'Family', 'Romantic', 
  'Solo', 'Business', 'Eco-friendly', 'Luxury', 'Budget'
];

export default function NewTemplatePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [templateType, setTemplateType] = useState<TemplateType>('full');
  const [destinations, setDestinations] = useState<string[]>([]);
  const [destinationInput, setDestinationInput] = useState('');
  const [travelStyles, setTravelStyles] = useState<string[]>([]);
  const [durationDays, setDurationDays] = useState<number | null>(null);
  const [budgetTier, setBudgetTier] = useState<BudgetTier | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  // Content for full itinerary
  const [days, setDays] = useState<DayContent[]>([]);
  const [inclusions, setInclusions] = useState<string[]>([]);
  const [exclusions, setExclusions] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  const addDestination = () => {
    if (destinationInput.trim() && !destinations.includes(destinationInput.trim())) {
      setDestinations([...destinations, destinationInput.trim()]);
      setDestinationInput('');
    }
  };

  const removeDestination = (dest: string) => {
    setDestinations(destinations.filter(d => d !== dest));
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const toggleTravelStyle = (style: string) => {
    if (travelStyles.includes(style)) {
      setTravelStyles(travelStyles.filter(s => s !== style));
    } else {
      setTravelStyles([...travelStyles, style]);
    }
  };

  const addDay = () => {
    setDays([...days, { 
      day: days.length + 1, 
      title: `Day ${days.length + 1}`, 
      activities: [] 
    }]);
  };

  const updateDay = (index: number, updates: Partial<DayContent>) => {
    const newDays = [...days];
    newDays[index] = { ...newDays[index], ...updates };
    setDays(newDays);
  };

  const removeDay = (index: number) => {
    const newDays = days.filter((_, i) => i !== index);
    // Renumber days
    newDays.forEach((day, i) => day.day = i + 1);
    setDays(newDays);
  };

  const addActivity = (dayIndex: number) => {
    const newDays = [...days];
    newDays[dayIndex].activities.push({ name: '' });
    setDays(newDays);
  };

  const updateActivity = (dayIndex: number, actIndex: number, updates: Partial<ActivityContent>) => {
    const newDays = [...days];
    newDays[dayIndex].activities[actIndex] = { 
      ...newDays[dayIndex].activities[actIndex], 
      ...updates 
    };
    setDays(newDays);
  };

  const removeActivity = (dayIndex: number, actIndex: number) => {
    const newDays = [...days];
    newDays[dayIndex].activities.splice(actIndex, 1);
    setDays(newDays);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Template name is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const input: CreateTemplateInput = {
        name: name.trim(),
        description: description.trim() || null,
        templateType,
        content: {
          days: templateType === 'full' ? days : undefined,
          inclusions: templateType === 'full' ? inclusions : undefined,
          exclusions: templateType === 'full' ? exclusions : undefined,
          notes: notes.trim() || undefined,
        },
        destinations,
        travelStyles,
        durationDays: durationDays || (templateType === 'full' ? days.length : null),
        budgetTier,
        tags,
      };

      const template = await createTemplate(input);
      router.push(`/templates/${template.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create template');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/templates')}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-xl font-bold text-gray-900">New Template</h1>
            </div>
            <button
              onClick={handleSave}
              disabled={saving || !name.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-700 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Template'}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg">
            {error}
          </div>
        )}

        {/* Basic Info */}
        <div className="bg-white rounded-lg border p-6 space-y-4">
          <h2 className="font-semibold text-lg">Basic Information</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Template Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Golden Triangle Classic"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this template..."
              rows={3}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Template Type
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {TEMPLATE_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setTemplateType(type.value)}
                  className={`p-3 border rounded-lg text-left transition-all ${
                    templateType === type.value 
                      ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' 
                      : 'hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-sm">{type.label}</div>
                  <div className="text-xs text-gray-500">{type.description}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Destinations & Style */}
        <div className="bg-white rounded-lg border p-6 space-y-4">
          <h2 className="font-semibold text-lg">Destinations & Style</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Destinations
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={destinationInput}
                onChange={(e) => setDestinationInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addDestination()}
                placeholder="Add destination..."
                className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <button
                onClick={addDestination}
                className="px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {destinations.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {destinations.map((dest) => (
                  <span key={dest} className="px-2 py-1 bg-blue-100 text-blue-800 rounded flex items-center gap-1 text-sm">
                    {dest}
                    <button onClick={() => removeDestination(dest)} className="hover:text-blue-600">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Travel Styles
            </label>
            <div className="flex flex-wrap gap-2">
              {TRAVEL_STYLES.map((style) => (
                <button
                  key={style}
                  onClick={() => toggleTravelStyle(style)}
                  className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                    travelStyles.includes(style)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duration (days)
              </label>
              <input
                type="number"
                value={durationDays ?? ''}
                onChange={(e) => setDurationDays(e.target.value ? parseInt(e.target.value) : null)}
                min={1}
                max={365}
                placeholder="Auto-calculated for full itineraries"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Budget Tier
              </label>
              <select
                value={budgetTier ?? ''}
                onChange={(e) => setBudgetTier(e.target.value as BudgetTier || null)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="">Select budget tier</option>
                {BUDGET_TIERS.map((tier) => (
                  <option key={tier.value} value={tier.value}>{tier.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tags
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addTag()}
                placeholder="Add tag..."
                className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <button
                onClick={addTag}
                className="px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag) => (
                  <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-700 rounded flex items-center gap-1 text-sm">
                    {tag}
                    <button onClick={() => removeTag(tag)} className="hover:text-gray-600">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Day-by-Day Content (for full itineraries) */}
        {templateType === 'full' && (
          <div className="bg-white rounded-lg border p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-lg">Day-by-Day Itinerary</h2>
              <button
                onClick={addDay}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm flex items-center gap-1 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                Add Day
              </button>
            </div>

            {days.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No days added yet. Click "Add Day" to start building your itinerary.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {days.map((day, dayIndex) => (
                  <div key={dayIndex} className="border rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <GripVertical className="w-4 h-4 text-gray-400 cursor-move" />
                      <span className="font-medium text-blue-600">Day {day.day}</span>
                      <input
                        type="text"
                        value={day.title}
                        onChange={(e) => updateDay(dayIndex, { title: e.target.value })}
                        placeholder="Day title..."
                        className="flex-1 px-2 py-1 border rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                      <button
                        onClick={() => removeDay(dayIndex)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Activities */}
                    <div className="ml-7 space-y-2">
                      {day.activities.map((activity, actIndex) => (
                        <div key={actIndex} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={activity.name}
                            onChange={(e) => updateActivity(dayIndex, actIndex, { name: e.target.value })}
                            placeholder="Activity name..."
                            className="flex-1 px-2 py-1 border rounded text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          />
                          <button
                            onClick={() => removeActivity(dayIndex, actIndex)}
                            className="p-1 text-gray-400 hover:text-red-500"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => addActivity(dayIndex)}
                        className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        Add Activity
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        <div className="bg-white rounded-lg border p-6 space-y-4">
          <h2 className="font-semibold text-lg">Additional Notes</h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional notes, tips, or reminders for this template..."
            rows={4}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}
