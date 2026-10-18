/**
 * Local notifications adapter (expo-notifications). Local only: nothing is sent through a push
 * service, and the app never asks for permission at launch.
 */
import * as Notifications from 'expo-notifications';

// Show reminders as a banner even when the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export type NotificationPermission = 'granted' | 'denied' | 'undetermined';

/**
 * expo-notifications' IosAuthorizationStatus values. Mirrored here because the enum is only
 * reachable through re-exports that ESLint's import plugin can't resolve.
 */
const IOS_STATUS = { NOT_DETERMINED: 0, AUTHORIZED: 2, PROVISIONAL: 3, EPHEMERAL: 4 } as const;

function toPermission(response: Notifications.NotificationPermissionsStatus): NotificationPermission {
  const ios: number | undefined = response.ios?.status;
  if (ios !== undefined) {
    if (
      ios === IOS_STATUS.AUTHORIZED ||
      ios === IOS_STATUS.PROVISIONAL ||
      ios === IOS_STATUS.EPHEMERAL
    ) {
      return 'granted';
    }
    return ios === IOS_STATUS.NOT_DETERMINED ? 'undetermined' : 'denied';
  }
  if (response.granted) return 'granted';
  return response.canAskAgain ? 'undetermined' : 'denied';
}

export async function notificationPermission(): Promise<NotificationPermission> {
  return toPermission(await Notifications.getPermissionsAsync());
}

/** Shows the system prompt (only if it hasn't been answered). Resolves true when allowed. */
export async function requestNotificationPermission(): Promise<boolean> {
  const response = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: false },
  });
  return toPermission(response) === 'granted';
}

export async function scheduleLocalNotification(
  date: Date,
  content: { title: string; body: string; data?: Record<string, string> },
): Promise<string> {
  return Notifications.scheduleNotificationAsync({
    content,
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
  });
}

export async function cancelAllLocalNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export const useLastNotificationResponse = Notifications.useLastNotificationResponse;
export const clearLastNotificationResponse = Notifications.clearLastNotificationResponseAsync;
