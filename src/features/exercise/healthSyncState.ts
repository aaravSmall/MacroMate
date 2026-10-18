import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Per-device Apple Health sync state, per user: whether they connected Health in Tally, when
 * the last sync ran, and which refuel prompts they dismissed. Health data itself lives in
 * exercise_entries; this is only bookkeeping.
 */
export type HealthSyncState = {
  connected: boolean;
  lastSyncAt: string | null;
  dismissedRefuel: string[];
};

const EMPTY: HealthSyncState = { connected: false, lastSyncAt: null, dismissedRefuel: [] };
const MAX_DISMISSED = 100;
const key = (userId: string) => `healthSync:${userId}`;

export async function readHealthSyncState(userId: string): Promise<HealthSyncState> {
  try {
    const raw = await AsyncStorage.getItem(key(userId));
    if (!raw) return EMPTY;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return EMPTY;
    const p = parsed as Partial<HealthSyncState>;
    return {
      connected: p.connected === true,
      lastSyncAt: typeof p.lastSyncAt === 'string' ? p.lastSyncAt : null,
      dismissedRefuel: Array.isArray(p.dismissedRefuel)
        ? p.dismissedRefuel.filter((x): x is string => typeof x === 'string')
        : [],
    };
  } catch {
    return EMPTY;
  }
}

export async function updateHealthSyncState(
  userId: string,
  patch: Partial<HealthSyncState>,
): Promise<HealthSyncState> {
  const next = { ...(await readHealthSyncState(userId)), ...patch };
  next.dismissedRefuel = next.dismissedRefuel.slice(-MAX_DISMISSED);
  await AsyncStorage.setItem(key(userId), JSON.stringify(next));
  return next;
}
