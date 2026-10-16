import { supabase } from '@/lib/supabase';
import type { Enums, Tables, TablesUpdate } from '@/types/database';

export type WeighInFrequency = Enums<'weigh_in_frequency'>;
export type Weekday = Enums<'weekday'>;

export type UserSettings = {
  weighInFrequency: WeighInFrequency;
  weighInDay: Weekday;
  /** `HH:MM[:SS]` local time. */
  weighInTime: string;
  remindersEnabled: boolean;
};

export function mapUserSettingsRow(row: Tables<'user_settings'>): UserSettings {
  return {
    weighInFrequency: row.weigh_in_frequency,
    weighInDay: row.weigh_in_day,
    weighInTime: row.weigh_in_time,
    remindersEnabled: row.reminders_enabled,
  };
}

export async function getUserSettings(userId: string): Promise<UserSettings | null> {
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapUserSettingsRow(data) : null;
}

export async function updateUserSettings(
  userId: string,
  update: Partial<UserSettings>,
): Promise<UserSettings> {
  const patch: TablesUpdate<'user_settings'> = {};
  if (update.weighInFrequency !== undefined) patch.weigh_in_frequency = update.weighInFrequency;
  if (update.weighInDay !== undefined) patch.weigh_in_day = update.weighInDay;
  if (update.weighInTime !== undefined) patch.weigh_in_time = update.weighInTime;
  if (update.remindersEnabled !== undefined) patch.reminders_enabled = update.remindersEnabled;

  const { data, error } = await supabase
    .from('user_settings')
    .update(patch)
    .eq('user_id', userId)
    .select()
    .single();
  if (error) throw error;
  return mapUserSettingsRow(data);
}
