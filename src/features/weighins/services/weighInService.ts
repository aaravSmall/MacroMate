import { requireUserId, supabase } from '@/lib/supabase';
import type { Tables } from '@/types/database';
import type { WeighIn } from '@/types/domain';

export function mapWeighInRow(row: Tables<'weigh_ins'>): WeighIn {
  return {
    id: row.id,
    measuredAt: row.measured_at,
    localDate: row.local_date,
    weightKg: row.weight_kg,
    bodyFatPct: row.body_fat_pct,
  };
}

/** Most recent first. */
export async function listWeighIns({ limit = 100 }: { limit?: number } = {}): Promise<WeighIn[]> {
  const { data, error } = await supabase
    .from('weigh_ins')
    .select('*')
    .order('measured_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data.map(mapWeighInRow);
}

export type NewWeighIn = {
  /** Always kg; convert from the user's units before saving. */
  weightKg: number;
  measuredAt: Date;
  /** `YYYY-MM-DD` of measuredAt in the user's timezone. */
  localDate: string;
  bodyFatPct?: number | null;
};

export async function addWeighIn(input: NewWeighIn): Promise<WeighIn> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from('weigh_ins')
    .insert({
      user_id: userId,
      weight_kg: input.weightKg,
      measured_at: input.measuredAt.toISOString(),
      local_date: input.localDate,
      body_fat_pct: input.bodyFatPct ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return mapWeighInRow(data);
}
