import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  plannedReminders,
  REMINDER_CONTENT,
  REMINDERS_AHEAD,
} from '@/features/weighins/logic/reminderPlan';
import { readReminderState, updateReminderState } from '@/features/weighins/reminderState';
import {
  cancelWeighInReminders,
  rescheduleWeighInReminders,
} from '@/features/weighins/services/reminderService';
import {
  cancelAllLocalNotifications,
  cancelLocalNotificationsExcept,
  notificationPermission,
  scheduleLocalNotification,
} from '@/lib/localNotifications';
import type { Profile } from '@/types/domain';

jest.mock('@/lib/localNotifications', () => ({
  cancelAllLocalNotifications: jest.fn(async () => undefined),
  cancelLocalNotificationsExcept: jest.fn(async () => undefined),
  notificationPermission: jest.fn(async () => 'granted'),
  scheduleLocalNotification: jest.fn(async () => 'id'),
}));

const m = <T>(fn: T) => fn as unknown as jest.Mock;

const profile = {
  id: 'user-1',
  weighInFrequency: 'weekly',
  weighInWeekday: 0,
  weighInReminderTime: '08:00:00',
  timezone: 'America/New_York',
} as Profile;

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  m(notificationPermission).mockResolvedValue('granted');
});

describe('plannedReminders', () => {
  const now = new Date('2026-10-20T12:00:00Z');

  it('plans the next few reminders', () => {
    const dates = plannedReminders({ profile, lastWeighInAt: null, anchorAt: null, now });
    expect(dates).toHaveLength(REMINDERS_AHEAD);
    expect(dates[0]?.toISOString()).toBe('2026-10-25T12:00:00.000Z');
  });

  it('anchors biweekly to the last weigh-in, else the settings change', () => {
    const biweekly = { ...profile, weighInFrequency: 'biweekly' as const };
    const fromWeighIn = plannedReminders({
      profile: biweekly,
      lastWeighInAt: new Date('2026-10-18T13:00:00Z'), // Sun
      anchorAt: new Date('2026-10-11T13:00:00Z'),
      now,
    });
    expect(fromWeighIn[0]?.toISOString()).toBe('2026-11-01T13:00:00.000Z');
    const fromSettings = plannedReminders({
      profile: biweekly,
      lastWeighInAt: null,
      anchorAt: new Date('2026-10-11T13:00:00Z'),
      now,
    });
    expect(fromSettings[0]?.toISOString()).toBe('2026-10-25T12:00:00.000Z');
  });

  it('keeps the notification neutral, without numbers', () => {
    expect(REMINDER_CONTENT.body).not.toMatch(/\d/);
    expect(REMINDER_CONTENT.title).not.toMatch(/!|\d/);
  });
});

describe('rescheduleWeighInReminders', () => {
  it('replaces scheduled reminders when enabled and allowed', async () => {
    await updateReminderState('user-1', { enabled: true });
    const count = await rescheduleWeighInReminders({
      userId: 'user-1',
      profile,
      lastWeighInAt: null,
    });
    expect(cancelLocalNotificationsExcept).toHaveBeenCalledWith(['refuel']);
    expect(cancelAllLocalNotifications).not.toHaveBeenCalled();
    expect(count).toBe(REMINDERS_AHEAD);
    expect(scheduleLocalNotification).toHaveBeenCalledTimes(REMINDERS_AHEAD);
    expect(m(scheduleLocalNotification).mock.calls[0]?.[1]).toEqual({
      title: REMINDER_CONTENT.title,
      body: REMINDER_CONTENT.body,
      data: { url: '/progress?focus=weighin' },
    });
  });

  it('only cancels when reminders are off', async () => {
    await expect(
      rescheduleWeighInReminders({ userId: 'user-1', profile, lastWeighInAt: null }),
    ).resolves.toBe(0);
    expect(cancelLocalNotificationsExcept).toHaveBeenCalledWith(['refuel']);
    expect(scheduleLocalNotification).not.toHaveBeenCalled();
  });

  it('schedules nothing without notification permission', async () => {
    await updateReminderState('user-1', { enabled: true });
    m(notificationPermission).mockResolvedValue('denied');
    await rescheduleWeighInReminders({ userId: 'user-1', profile, lastWeighInAt: null });
    expect(scheduleLocalNotification).not.toHaveBeenCalled();
  });

  it('restarts the biweekly anchor when the schedule changes', async () => {
    await updateReminderState('user-1', {
      enabled: true,
      scheduleKey: 'weekly:0',
      anchorAt: '2026-01-01T00:00:00.000Z',
    });
    await rescheduleWeighInReminders({
      userId: 'user-1',
      profile: { ...profile, weighInFrequency: 'biweekly' },
      lastWeighInAt: null,
    });
    const state = await readReminderState('user-1');
    expect(state.scheduleKey).toBe('biweekly:0');
    expect(state.anchorAt).not.toBe('2026-01-01T00:00:00.000Z');
  });

  it('cancelWeighInReminders cancels everything', async () => {
    await cancelWeighInReminders();
    expect(cancelAllLocalNotifications).toHaveBeenCalledTimes(1);
  });
});
