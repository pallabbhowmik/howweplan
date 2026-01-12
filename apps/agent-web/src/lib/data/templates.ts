import { apiUrl, authenticatedFetch } from '@/lib/api/auth';

// ============================================================================
// Template Types
// ============================================================================

export type TemplateType = 'full' | 'day' | 'activity' | 'accommodation' | 'transport' | 'meal';
export type BudgetTier = 'budget' | 'mid-range' | 'luxury' | 'ultra-luxury';

export interface TemplateContent {
  days?: DayContent[];
  inclusions?: string[];
  exclusions?: string[];
  notes?: string;
  title?: string;
  activities?: ActivityContent[];
  name?: string;
  description?: string;
  location?: string;
  price?: { amount: number; currency: string };
  duration_minutes?: number;
  start_time?: string;
  [key: string]: unknown;
}

export interface DayContent {
  day: number;
  title: string;
  activities: ActivityContent[];
  notes?: string;
}

export interface ActivityContent {
  name: string;
  description?: string;
  location?: string;
  start_time?: string;
  duration_minutes?: number;
  price?: { amount: number; currency: string };
  type?: 'activity' | 'accommodation' | 'transport' | 'meal';
  [key: string]: unknown;
}

export interface ItineraryTemplate {
  id: string;
  agentId: string;
  name: string;
  description: string | null;
  templateType: TemplateType;
  content: TemplateContent;
  destinations: string[];
  travelStyles: string[];
  durationDays: number | null;
  budgetTier: BudgetTier | null;
  tags: string[];
  usageCount: number;
  lastUsedAt: string | null;
  isFavorite: boolean;
  isArchived: boolean;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateSuggestion {
  id: string;
  name: string;
  description: string | null;
  templateType: TemplateType;
  destinations: string[];
  travelStyles: string[];
  durationDays: number | null;
  tags: string[];
  usageCount: number;
  lastUsedAt: string | null;
  isFavorite: boolean;
  relevanceScore: number;
}

export interface CreateTemplateInput {
  name: string;
  description?: string | null;
  templateType: TemplateType;
  content: TemplateContent;
  destinations?: string[];
  travelStyles?: string[];
  durationDays?: number | null;
  budgetTier?: BudgetTier | null;
  tags?: string[];
  isFavorite?: boolean;
}

export interface UpdateTemplateInput {
  name?: string;
  description?: string | null;
  content?: TemplateContent;
  destinations?: string[];
  travelStyles?: string[];
  durationDays?: number | null;
  budgetTier?: BudgetTier | null;
  tags?: string[];
  isFavorite?: boolean;
  isArchived?: boolean;
}

export interface TemplateFilter {
  templateType?: TemplateType;
  destination?: string;
  travelStyle?: string;
  budgetTier?: BudgetTier;
  tag?: string;
  isFavorite?: boolean;
  isArchived?: boolean;
  search?: string;
}

export interface TemplateListResponse {
  templates: ItineraryTemplate[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

// ============================================================================
// API Functions
// ============================================================================

const TEMPLATES_BASE = '/api/itineraries/api/v1/templates';

/**
 * Create a new template.
 */
export async function createTemplate(input: CreateTemplateInput): Promise<ItineraryTemplate> {
  const response = await authenticatedFetch(`${apiUrl}${TEMPLATES_BASE}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to create template' }));
    throw new Error(error.error?.message || error.message || 'Failed to create template');
  }

  const result = await response.json();
  return result.data;
}

/**
 * List templates with optional filtering.
 */
export async function listTemplates(
  filter?: TemplateFilter,
  pagination?: { limit?: number; offset?: number }
): Promise<TemplateListResponse> {
  const params = new URLSearchParams();
  
  if (filter) {
    if (filter.templateType) params.set('templateType', filter.templateType);
    if (filter.destination) params.set('destination', filter.destination);
    if (filter.travelStyle) params.set('travelStyle', filter.travelStyle);
    if (filter.budgetTier) params.set('budgetTier', filter.budgetTier);
    if (filter.tag) params.set('tag', filter.tag);
    if (filter.isFavorite !== undefined) params.set('isFavorite', String(filter.isFavorite));
    if (filter.isArchived !== undefined) params.set('isArchived', String(filter.isArchived));
    if (filter.search) params.set('search', filter.search);
  }
  
  if (pagination) {
    if (pagination.limit) params.set('limit', String(pagination.limit));
    if (pagination.offset) params.set('offset', String(pagination.offset));
  }

  const url = `${apiUrl}${TEMPLATES_BASE}${params.toString() ? `?${params}` : ''}`;
  const response = await authenticatedFetch(url);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to list templates' }));
    throw new Error(error.error?.message || error.message || 'Failed to list templates');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Get a template by ID.
 */
export async function getTemplate(id: string): Promise<ItineraryTemplate> {
  const response = await authenticatedFetch(`${apiUrl}${TEMPLATES_BASE}/${id}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to get template' }));
    throw new Error(error.error?.message || error.message || 'Failed to get template');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Update a template.
 */
export async function updateTemplate(id: string, input: UpdateTemplateInput): Promise<ItineraryTemplate> {
  const response = await authenticatedFetch(`${apiUrl}${TEMPLATES_BASE}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to update template' }));
    throw new Error(error.error?.message || error.message || 'Failed to update template');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Delete a template.
 */
export async function deleteTemplate(id: string): Promise<void> {
  const response = await authenticatedFetch(`${apiUrl}${TEMPLATES_BASE}/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to delete template' }));
    throw new Error(error.error?.message || error.message || 'Failed to delete template');
  }
}

/**
 * Get smart template suggestions based on context.
 */
export async function getTemplateSuggestions(
  context?: {
    destination?: string;
    travelStyle?: string;
    duration?: number;
  },
  limit?: number
): Promise<TemplateSuggestion[]> {
  const params = new URLSearchParams();
  
  if (context) {
    if (context.destination) params.set('destination', context.destination);
    if (context.travelStyle) params.set('travelStyle', context.travelStyle);
    if (context.duration) params.set('duration', String(context.duration));
  }
  if (limit) params.set('limit', String(limit));

  const url = `${apiUrl}${TEMPLATES_BASE}/suggestions${params.toString() ? `?${params}` : ''}`;
  const response = await authenticatedFetch(url);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to get suggestions' }));
    throw new Error(error.error?.message || error.message || 'Failed to get suggestions');
  }

  const result = await response.json();
  return result.data.suggestions;
}

/**
 * Duplicate a template.
 */
export async function duplicateTemplate(id: string, newName?: string): Promise<ItineraryTemplate> {
  const response = await authenticatedFetch(`${apiUrl}${TEMPLATES_BASE}/${id}/duplicate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ newName }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to duplicate template' }));
    throw new Error(error.error?.message || error.message || 'Failed to duplicate template');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Toggle favorite status.
 */
export async function toggleTemplateFavorite(id: string): Promise<boolean> {
  const response = await authenticatedFetch(`${apiUrl}${TEMPLATES_BASE}/${id}/favorite`, {
    method: 'POST',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to toggle favorite' }));
    throw new Error(error.error?.message || error.message || 'Failed to toggle favorite');
  }

  const result = await response.json();
  return result.data.isFavorite;
}

/**
 * Record template usage.
 */
export async function recordTemplateUsage(
  id: string,
  context?: {
    itineraryId?: string;
    destination?: string;
    travelStyle?: string;
  }
): Promise<void> {
  const response = await authenticatedFetch(`${apiUrl}${TEMPLATES_BASE}/${id}/usage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(context || {}),
  });

  if (!response.ok) {
    console.warn('Failed to record template usage');
  }
}

/**
 * Get all unique destinations from templates.
 */
export async function getTemplateDestinations(): Promise<string[]> {
  const response = await authenticatedFetch(`${apiUrl}${TEMPLATES_BASE}/meta/destinations`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to get destinations' }));
    throw new Error(error.error?.message || error.message || 'Failed to get destinations');
  }

  const result = await response.json();
  return result.data.destinations;
}

/**
 * Get all unique tags from templates.
 */
export async function getTemplateTags(): Promise<string[]> {
  const response = await authenticatedFetch(`${apiUrl}${TEMPLATES_BASE}/meta/tags`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to get tags' }));
    throw new Error(error.error?.message || error.message || 'Failed to get tags');
  }

  const result = await response.json();
  return result.data.tags;
}

/**
 * Archive a template (soft delete).
 */
export async function archiveTemplate(id: string): Promise<ItineraryTemplate> {
  return updateTemplate(id, { isArchived: true });
}

/**
 * Unarchive a template.
 */
export async function unarchiveTemplate(id: string): Promise<ItineraryTemplate> {
  return updateTemplate(id, { isArchived: false });
}
