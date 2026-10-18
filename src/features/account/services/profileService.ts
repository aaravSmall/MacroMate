import { supabase } from '@/lib/supabase';
import type { Tables, TablesUpdate } from '@/types/database';
import type { Profile } from '@/types/domain';

export function mapProfileRow(row: Tables<'profiles'>): Profile {
  return {
    id: row.id,
    displayName: row.display_name,
    sex: row.sex,
    birthDate: row.birth_date,
    heightCm: row.height_cm,
    activityLevel: row.activity_level,
    unitSystem: row.unit_system,
    timezone: row.timezone,
    motivation: row.motivation,
    dietaryRestrictions: row.dietary_restrictions,
    allergies: row.allergies,
    numbersOff: row.numbers_off,
    weighInFrequency: row.weigh_in_frequency,
    weighInWeekday: row.weigh_in_weekday,
    weighInReminderTime: row.weigh_in_reminder_time,
    onboardedAt: row.onboarded_at,
  };
}

export type ProfileUpdate = Partial<Omit<Profile, 'id'>>;

const COLUMNS: { [K in keyof ProfileUpdate]-?: keyof TablesUpdate<'profiles'> } = {
  displayName: 'display_name',
  sex: 'sex',
  birthDate: 'birth_date',
  heightCm: 'height_cm',
  activityLevel: 'activity_level',
  unitSystem: 'unit_system',
  timezone: 'timezone',
  motivation: 'motivation',
  dietaryRestrictions: 'dietary_restrictions',
  allergies: 'allergies',
  numbersOff: 'numbers_off',
  weighInFrequency: 'weigh_in_frequency',
  weighInWeekday: 'weigh_in_weekday',
  weighInReminderTime: 'weigh_in_reminder_time',
  onboardedAt: 'onboarded_at',
};

export function profileUpdateToRow(update: ProfileUpdate): TablesUpdate<'profiles'> {
  const row: Record<string, unknown> = {};
  for (const [key, column] of Object.entries(COLUMNS)) {
    const value = update[key as keyof ProfileUpdate];
    if (value !== undefined) row[column] = value;
  }
  return row as TablesUpdate<'profiles'>;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapProfileRow(data) : null;
}

/**
 * Updates the user's profile. The row is created by a trigger at sign-up, so the app never
 * inserts into `profiles`.
 */
export async function updateProfile(userId: string, update: ProfileUpdate): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update(profileUpdateToRow(update))
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return mapProfileRow(data);
}
