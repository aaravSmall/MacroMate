import type { Profile } from '@/types/domain';

import { nextReminderDates } from './reminderSchedule';

/** How many reminders to keep scheduled ahead (well under iOS's 64 pending notifications). */
export const REMINDERS_AHEAD = 8;

/** Neutral, encouraging, never pushy. No weights or numbers in the notification. */
export const REMINDER_CONTENT = {
  title: 'Weigh-in day',
  body: 'If now’s a good time, a quick weigh-in helps you see your trend. No pressure.',
  data: { url: '/progress?focus=weighin' },
} as const;

/** Changes when the parts of the schedule that move biweekly anchors change. */
export function scheduleKey(profile: Pick<Profile, 'weighInFrequency' | 'weighInWeekday'>): string {
  return `${profile.weighInFrequency}:${profile.weighInWeekday}`;
}

/**
 * The reminder instants to schedule. Biweekly reminders are anchored to the last weigh-in, or to
 * when the schedule was set (anchorAt) if there's no weigh-in yet.
 */
export function plannedReminders({
  profile,
  lastWeighInAt,
  anchorAt,
  now = new Date(),
}: {
  profile: Pick<
    Profile,
    'weighInFrequency' | 'weighInWeekday' | 'weighInReminderTime' | 'timezone'
  >;
  lastWeighInAt: Date | null;
  anchorAt: Date | null;
  now?: Date;
}): Date[] {
  return nextReminderDates(
    {
      frequency: profile.weighInFrequency,
      weekday: profile.weighInWeekday,
      time: profile.weighInReminderTime,
      timeZone: profile.timezone,
      anchor: lastWeighInAt ?? anchorAt ?? now,
    },
    { now, count: REMINDERS_AHEAD },
  );
}
