/**
 * System Settings Repository
 * 
 * Handles database operations for system_settings table.
 */

import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { config } from '../env';

export interface SystemSetting {
  key: string;
  value: number | string | boolean | object;
  description: string;
  category: string;
  updated_at: string;
  updated_by: string | null;
}

export interface SettingsRepository {
  getAll(): Promise<SystemSetting[]>;
  getByKey(key: string): Promise<SystemSetting | null>;
  getByCategory(category: string): Promise<SystemSetting[]>;
  update(key: string, value: number | string | boolean | object, updatedBy?: string): Promise<SystemSetting>;
  batchUpdate(settings: Array<{ key: string; value: number | string | boolean | object }>, updatedBy?: string): Promise<SystemSetting[]>;
}

export function createSettingsRepository(): SettingsRepository {
  const supabase: SupabaseClient = createClient(
    config.database.supabaseUrl,
    config.database.supabaseServiceRoleKey
  );

  return {
    async getAll(): Promise<SystemSetting[]> {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .order('category', { ascending: true })
        .order('key', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch settings: ${error.message}`);
      }

      return data || [];
    },

    async getByKey(key: string): Promise<SystemSetting | null> {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .eq('key', key)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows found
          return null;
        }
        throw new Error(`Failed to fetch setting: ${error.message}`);
      }

      return data;
    },

    async getByCategory(category: string): Promise<SystemSetting[]> {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .eq('category', category)
        .order('key', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch settings for category: ${error.message}`);
      }

      return data || [];
    },

    async update(key: string, value: number | string | boolean | object, updatedBy?: string): Promise<SystemSetting> {
      const { data, error } = await supabase
        .from('system_settings')
        .update({
          value,
          updated_at: new Date().toISOString(),
          updated_by: updatedBy || null,
        })
        .eq('key', key)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update setting: ${error.message}`);
      }

      if (!data) {
        throw new Error(`Setting not found: ${key}`);
      }

      return data;
    },

    async batchUpdate(
      settings: Array<{ key: string; value: number | string | boolean | object }>,
      updatedBy?: string
    ): Promise<SystemSetting[]> {
      const results: SystemSetting[] = [];

      // Use a transaction-like approach by updating each setting
      for (const setting of settings) {
        const { data, error } = await supabase
          .from('system_settings')
          .update({
            value: setting.value,
            updated_at: new Date().toISOString(),
            updated_by: updatedBy || null,
          })
          .eq('key', setting.key)
          .select()
          .single();

        if (error) {
          throw new Error(`Failed to update setting ${setting.key}: ${error.message}`);
        }

        if (data) {
          results.push(data);
        }
      }

      return results;
    },
  };
}
