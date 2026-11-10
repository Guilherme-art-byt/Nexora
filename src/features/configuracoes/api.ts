import { getSupabase } from '@/lib/supabase/client';
import type { Tables, TablesUpdate } from '@/lib/supabase/database.types';

export type UserSettings = Tables<'user_settings'>;
export type UserSettingsPatch = Omit<TablesUpdate<'user_settings'>, 'user_id' | 'updated_at'>;

export async function fetchSettings(userId: string): Promise<UserSettings> {
  const { data, error } = await getSupabase()
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .single();
  if (error) throw error;
  return data;
}

export async function updateSettings(
  userId: string,
  patch: UserSettingsPatch,
): Promise<UserSettings> {
  const { data, error } = await getSupabase()
    .from('user_settings')
    .update(patch)
    .eq('user_id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}
