import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Alert } from 'react-native';

import { useProfile } from '@/features/account';
import { useAuth } from '@/features/auth';
import {
  clearLastNotificationResponse,
  requestNotificationPermission,
  useLastNotificationResponse,
} from '@/lib/localNotifications';
import { queryKeys } from '@/lib/queryKeys';
import type { Profile } from '@/types/domain';

import { scheduleKey } from '../logic/reminderPlan';
import { readReminderState, updateReminderState } from '../reminderState';
import { cancelWeighInReminders, rescheduleWeighInReminders } from '../services/reminderService';
import { useWeighIns } from './useWeighIns';

export function useReminderState() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.reminders.state(user?.id ?? ''),
    queryFn: () => readReminderState(user?.id ?? ''),
    enabled: !!user,
  });
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const FREQUENCY = { weekly: 'every', biweekly: 'every other', monthly: 'the first' } as const;

/** "every Sunday at 8:00 AM" */
export function describeSchedule(
  profile: Pick<Profile, 'weighInFrequency' | 'weighInWeekday' | 'weighInReminderTime'>,
): string {
  const [h = 8, m = 0] = profile.weighInReminderTime.split(':').map(Number);
  const time = new Date(2000, 0, 1, h, m).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
  const day = WEEKDAYS[profile.weighInWeekday] ?? 'Sunday';
  const suffix = profile.weighInFrequency === 'monthly' ? ' of the month' : '';
  return `${FREQUENCY[profile.weighInFrequency]} ${day}${suffix} at ${time}`;
}

/** Explains reminders before the system permission prompt. Resolves true to continue. */
export function confirmReminders(schedule: string): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      'Weigh-in reminders',
      `We'll send a gentle reminder ${schedule}. You can change the day or turn it off anytime in Settings. Next, iOS will ask to allow notifications.`,
      [
        { text: 'Not now', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Turn on', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

/** Turns reminders on (system permission, then scheduling) or off (cancels them). */
export function useSetRemindersEnabled() {
  const { user } = useAuth();
  const profile = useProfile().data;
  const weighIns = useWeighIns();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!user || !profile) throw new Error('Not signed in.');
      if (enabled && !(await requestNotificationPermission())) {
        throw new Error(
          'Notifications are off for Tally. You can allow them in iOS Settings → Notifications → Tally.',
        );
      }
      await updateReminderState(user.id, {
        enabled,
        ...(enabled
          ? { anchorAt: new Date().toISOString(), scheduleKey: scheduleKey(profile) }
          : {}),
      });
      if (!enabled) {
        await cancelWeighInReminders();
        return 0;
      }
      const last = weighIns.data?.[0]?.measuredAt;
      return rescheduleWeighInReminders({
        userId: user.id,
        profile,
        lastWeighInAt: last ? new Date(last) : null,
      });
    },
    onSettled: () => {
      if (user)
        void queryClient.invalidateQueries({ queryKey: queryKeys.reminders.state(user.id) });
    },
  });
}

/**
 * Keeps reminders in step with the schedule: reschedules on launch, when the schedule changes,
 * and after a weigh-in. Opens Progress with the weigh-in field focused when a reminder is tapped.
 */
export function WeighInReminderSync() {
  const { user } = useAuth();
  const profile = useProfile().data;
  const weighIns = useWeighIns();
  const state = useReminderState().data;
  const lastWeighInAt = weighIns.data?.[0]?.measuredAt ?? null;
  const response = useLastNotificationResponse();

  const deps = profile
    ? [
        profile.weighInFrequency,
        profile.weighInWeekday,
        profile.weighInReminderTime,
        profile.timezone,
      ].join('|')
    : '';

  useEffect(() => {
    if (!user || !profile || !state?.enabled || weighIns.isPending) return;
    void rescheduleWeighInReminders({
      userId: user.id,
      profile,
      lastWeighInAt: lastWeighInAt ? new Date(lastWeighInAt) : null,
    }).catch(() => undefined);
    // `deps` captures the schedule fields; the profile object itself changes on every fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, deps, state?.enabled, lastWeighInAt, weighIns.isPending]);

  useEffect(() => {
    if (!response) return;
    const url = response.notification.request.content.data?.url;
    if (url === '/progress?focus=weighin') {
      router.navigate({
        pathname: '/progress',
        params: { focus: 'weighin', t: String(Date.now()) },
      });
    }
    void clearLastNotificationResponse();
  }, [response]);

  return null;
}
