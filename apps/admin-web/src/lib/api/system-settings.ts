/**
 * System Settings API for Admin
 * 
 * Manage system-wide operational settings like request limits, caps, etc.
 * These settings are stored in the system_settings table in Supabase.
 */

import { apiClient } from './client';

// ============================================================================
// TYPES
// ============================================================================

export interface SystemSetting {
  key: string;
  value: number | string | boolean | object;
  description: string;
  category: string;
  updated_at: string;
  updated_by?: string;
}

export interface SystemSettingsMap {
  // Request limits
  max_open_requests_per_user: number;
  daily_request_cap_per_user: number;
  request_expiry_hours: number;
  
  // Allow for additional settings
  [key: string]: number | string | boolean | object;
}

export interface RequestLimitsSettings {
  maxOpenRequestsPerUser: number;
  dailyRequestCapPerUser: number;
  requestExpiryHours: number;
}

// ============================================================================
// DEFAULT VALUES
// ============================================================================

export const defaultRequestLimits: RequestLimitsSettings = {
  maxOpenRequestsPerUser: 3,
  dailyRequestCapPerUser: 5,
  requestExpiryHours: 72,
};

// API base path - routes through requests service admin endpoints
const SETTINGS_API_BASE = '/api/requests/admin/settings/system';

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Fetch all system settings
 */
export async function getSystemSettings(): Promise<SystemSetting[]> {
  try {
    const response = await apiClient.get<{ data: SystemSetting[]; success: boolean }>(SETTINGS_API_BASE);
    return response.data || [];
  } catch (error) {
    console.warn('Failed to fetch system settings:', error);
    return [];
  }
}

/**
 * Fetch a specific system setting by key
 */
export async function getSystemSetting(key: string): Promise<SystemSetting | null> {
  try {
    const response = await apiClient.get<{ data: SystemSetting; success: boolean }>(`${SETTINGS_API_BASE}/${key}`);
    return response.data || null;
  } catch (error) {
    console.warn(`Failed to fetch system setting ${key}:`, error);
    return null;
  }
}

/**
 * Update a system setting
 */
export async function updateSystemSetting(
  key: string, 
  value: number | string | boolean | object
): Promise<SystemSetting> {
  const response = await apiClient.put<{ data: SystemSetting; success: boolean }>(
    `${SETTINGS_API_BASE}/${key}`,
    { value }
  );
  if (!response.data) {
    throw new Error('Failed to update setting');
  }
  return response.data;
}

/**
 * Fetch request limits settings
 */
export async function getRequestLimits(): Promise<RequestLimitsSettings> {
  try {
    const settings = await getSystemSettings();
    
    const settingsMap: Record<string, number | string | boolean | object> = {};
    for (const setting of settings) {
      settingsMap[setting.key] = setting.value;
    }

    return {
      maxOpenRequestsPerUser: typeof settingsMap.max_open_requests_per_user === 'number' 
        ? settingsMap.max_open_requests_per_user 
        : defaultRequestLimits.maxOpenRequestsPerUser,
      dailyRequestCapPerUser: typeof settingsMap.daily_request_cap_per_user === 'number'
        ? settingsMap.daily_request_cap_per_user
        : defaultRequestLimits.dailyRequestCapPerUser,
      requestExpiryHours: typeof settingsMap.request_expiry_hours === 'number'
        ? settingsMap.request_expiry_hours
        : defaultRequestLimits.requestExpiryHours,
    };
  } catch (error) {
    console.warn('Failed to fetch request limits, using defaults:', error);
    return defaultRequestLimits;
  }
}

/**
 * Update request limits settings
 */
export async function updateRequestLimits(limits: Partial<RequestLimitsSettings>): Promise<RequestLimitsSettings> {
  const updates: Promise<SystemSetting>[] = [];

  if (limits.maxOpenRequestsPerUser !== undefined) {
    updates.push(updateSystemSetting('max_open_requests_per_user', limits.maxOpenRequestsPerUser));
  }
  if (limits.dailyRequestCapPerUser !== undefined) {
    updates.push(updateSystemSetting('daily_request_cap_per_user', limits.dailyRequestCapPerUser));
  }
  if (limits.requestExpiryHours !== undefined) {
    updates.push(updateSystemSetting('request_expiry_hours', limits.requestExpiryHours));
  }

  await Promise.all(updates);
  
  // Return the updated limits
  return getRequestLimits();
}

/**
 * Batch update multiple system settings
 */
export async function batchUpdateSystemSettings(
  settings: Array<{ key: string; value: number | string | boolean | object }>
): Promise<SystemSetting[]> {
  const response = await apiClient.put<{ data: SystemSetting[]; success: boolean }>(
    `${SETTINGS_API_BASE}/batch`,
    { settings }
  );
  return response.data || [];
}
