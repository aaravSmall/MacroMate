import {
  cancelAllLocalNotifications,
  notificationPermission,
  scheduleLocalNotification,
} from '@/lib/localNotifications';
import type { Profile } from '@/types/domain';

import { plannedReminders, REMINDER_CONTENT, scheduleKey } from '../logic/reminderPlan';
import { readReminderState, updateReminderState } from '../reminderState';

/**
 * Replaces the scheduled weigh-in reminders with the next few from the profile's schedule.
 * Cancels everything when reminders are off or notifications aren't allowed. (Weigh-in
 * reminders are the app's only local notifications, so cancelling all is safe.)
 */
export async function rescheduleWeighInReminders({
  userId,
  profile,
  lastWeighInAt,
}: {
  userId: string;
  profile: Profile;
  lastWeighInAt: Date | null;
}): Promise<number> {
  let state = await readReminderState(userId);
  await cancelAllLocalNotifications();
  if (!state.enabled || (await notificationPermission()) !== 'granted') return 0;

  // A new frequency or weekday starts a new biweekly cycle from today.
  const key = scheduleKey(profile);
  if (state.scheduleKey !== key) {
    state = await updateReminderState(userId, {
      scheduleKey: key,
      anchorAt: new Date().toISOString(),
    });
  }

  const dates = plannedReminders({
    profile,
    lastWeighInAt,
    anchorAt: state.anchorAt ? new Date(state.anchorAt) : null,
  });
  for (const date of dates) {
    await scheduleLocalNotification(date, {
      title: REMINDER_CONTENT.title,
      body: REMINDER_CONTENT.body,
      data: { ...REMINDER_CONTENT.data },
    });
  }
  return dates.length;
}

/** Cancels all reminders on this device (sign-out, account deletion, turning them off). */
export async function cancelWeighInReminders(): Promise<void> {
  await cancelAllLocalNotifications();
}
