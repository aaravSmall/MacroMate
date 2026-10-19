import type { DietaryPrefs } from '@/lib/dietary';
import { notificationPermission, scheduleLocalNotification } from '@/lib/localNotifications';

import type { HealthWorkout } from '../healthSync';
import { readHealthSyncState, updateHealthSyncState } from '../healthSyncState';
import { REFUEL_NOTIFY_DELAY_MS, refuelMessage, workoutsToNotify } from '../logic/refuel';

export const REFUEL_NOTIFICATION_DATA = { kind: 'refuel', url: '/add' } as const;

/**
 * Schedules a refuel notification shortly after a sync finds a workout that just ended. Never
 * asks for permission: only notifies if notifications are already allowed and the user hasn't
 * turned refuel reminders off. Each workout is notified at most once.
 */
export async function notifyRecentWorkouts({
  userId,
  workouts,
  numbersOff,
  prefs,
  now = new Date(),
}: {
  userId: string;
  workouts: readonly HealthWorkout[];
  numbersOff: boolean;
  prefs: DietaryPrefs;
  now?: Date;
}): Promise<number> {
  const state = await readHealthSyncState(userId);
  if (!state.refuelNotifications) return 0;
  const due = workoutsToNotify(workouts, {
    now,
    alreadyHandled: new Set([...state.notifiedRefuel, ...state.dismissedRefuel]),
  });
  if (due.length === 0 || (await notificationPermission()) !== 'granted') return 0;

  // One notification even if a sync finds several: about the latest workout.
  const latest = [...due].sort((a, b) => b.endedAt.getTime() - a.endedAt.getTime())[0];
  if (!latest) return 0;
  const { title, message } = refuelMessage({
    activityType: latest.activityType,
    burnedKcal: latest.activeCalories,
    numbersOff,
    prefs,
  });
  await scheduleLocalNotification(new Date(now.getTime() + REFUEL_NOTIFY_DELAY_MS), {
    title,
    body: message,
    data: { ...REFUEL_NOTIFICATION_DATA },
  });
  await updateHealthSyncState(userId, {
    notifiedRefuel: [...state.notifiedRefuel, ...due.map((w) => w.externalId)],
  });
  return 1;
}
