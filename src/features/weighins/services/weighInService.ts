import { requireUserId, supabase } from '@/lib/supabase';
import type { Tables } from '@/types/database';
import type { WeighIn } from '@/types/domain';

export function mapWeighInRow(row: Tables<'weigh_ins'>): WeighIn {
  return {
    id: row.id,
    measuredAt: row.measured_at,
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
  weightKg: number;
  measuredAt?: Date;
  bodyFatPct?: number | null;
};

export async function addWeighIn(input: NewWeighIn): Promise<WeighIn> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from('weigh_ins')
    .insert({
      user_id: userId,
      weight_kg: input.weightKg,
      measured_at: (input.measuredAt ?? new Date()).toISOString(),
      body_fat_pct: input.bodyFatPct ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return mapWeighInRow(data);
}
