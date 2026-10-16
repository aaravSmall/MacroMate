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
    goalType: row.goal_type,
    targetWeightKg: row.target_weight_kg,
    weeklyRateKg: row.weekly_rate_kg,
    dailyCalorieTarget: row.daily_calorie_target,
    macroTargets: { proteinG: row.protein_g, carbsG: row.carbs_g, fatG: row.fat_g },
    numbersOffMode: row.numbers_off_mode,
    units: row.units,
    motivation: row.motivation,
    dietaryRestrictions: row.dietary_restrictions,
    allergies: row.allergies,
    onboardingCompletedAt: row.onboarding_completed_at,
  };
}

export type ProfileUpdate = Partial<Omit<Profile, 'id'>>;

export function profileUpdateToRow(update: ProfileUpdate): TablesUpdate<'profiles'> {
  const row: TablesUpdate<'profiles'> = {};
  if (update.displayName !== undefined) row.display_name = update.displayName;
  if (update.sex !== undefined) row.sex = update.sex;
  if (update.birthDate !== undefined) row.birth_date = update.birthDate;
  if (update.heightCm !== undefined) row.height_cm = update.heightCm;
  if (update.activityLevel !== undefined) row.activity_level = update.activityLevel;
  if (update.goalType !== undefined) row.goal_type = update.goalType;
  if (update.targetWeightKg !== undefined) row.target_weight_kg = update.targetWeightKg;
  if (update.weeklyRateKg !== undefined) row.weekly_rate_kg = update.weeklyRateKg;
  if (update.dailyCalorieTarget !== undefined) row.daily_calorie_target = update.dailyCalorieTarget;
  if (update.macroTargets !== undefined) {
    row.protein_g = update.macroTargets.proteinG;
    row.carbs_g = update.macroTargets.carbsG;
    row.fat_g = update.macroTargets.fatG;
  }
  if (update.numbersOffMode !== undefined) row.numbers_off_mode = update.numbersOffMode;
  if (update.units !== undefined) row.units = update.units;
  if (update.motivation !== undefined) row.motivation = update.motivation;
  if (update.dietaryRestrictions !== undefined) {
    row.dietary_restrictions = update.dietaryRestrictions;
  }
  if (update.allergies !== undefined) row.allergies = update.allergies;
  if (update.onboardingCompletedAt !== undefined) {
    row.onboarding_completed_at = update.onboardingCompletedAt;
  }
  return row;
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
