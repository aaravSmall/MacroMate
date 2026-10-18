import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Per-device reminder state, per user. Reminders are local notifications, and notification
 * permission is per device, so the on/off switch lives here; the schedule itself (frequency,
 * weekday, time) lives on the profile.
 */
export type ReminderState = {
  enabled: boolean;
  /** When the schedule last changed; the biweekly anchor before any weigh-in exists. */
  anchorAt: string | null;
  /** Schedule fingerprint, to notice frequency/weekday changes. */
  scheduleKey: string | null;
};

const EMPTY: ReminderState = { enabled: false, anchorAt: null, scheduleKey: null };
const key = (userId: string) => `weighInReminders:${userId}`;

export async function readReminderState(userId: string): Promise<ReminderState> {
  try {
    const raw = await AsyncStorage.getItem(key(userId));
    if (!raw) return EMPTY;
    const p = JSON.parse(raw) as Partial<ReminderState>;
    return {
      enabled: p.enabled === true,
      anchorAt: typeof p.anchorAt === 'string' ? p.anchorAt : null,
      scheduleKey: typeof p.scheduleKey === 'string' ? p.scheduleKey : null,
    };
  } catch {
    return EMPTY;
  }
}

export async function updateReminderState(
  userId: string,
  patch: Partial<ReminderState>,
): Promise<ReminderState> {
  const next = { ...(await readReminderState(userId)), ...patch };
  await AsyncStorage.setItem(key(userId), JSON.stringify(next));
  return next;
}
