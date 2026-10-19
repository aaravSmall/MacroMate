import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { useProfile } from '@/features/account';
import { useAuth } from '@/features/auth';
import { deviceTimeZone } from '@/lib/dates';
import {
  clearLastNotificationResponse,
  useLastNotificationResponse,
} from '@/lib/localNotifications';
import { queryKeys } from '@/lib/queryKeys';

import { healthSync } from '../healthSync';
import { readHealthSyncState, updateHealthSyncState } from '../healthSyncState';
import { planExerciseSync, syncWindow } from '../logic/healthSyncPlan';
import { notifyRecentWorkouts, REFUEL_NOTIFICATION_DATA } from '../services/refuelNotifications';
import {
  deleteExerciseEntries,
  listHealthEntries,
  upsertExerciseEntries,
} from '../services/exerciseService';

/** Device-side connection status for Apple Health. */
export function useHealthConnection() {
  const { user } = useAuth();
  const userId = user?.id;
  return useQuery({
    queryKey: queryKeys.health.connection(userId ?? ''),
    queryFn: async () => {
      const [available, permission, state] = await Promise.all([
        healthSync.isAvailable(),
        healthSync.permissionState(),
        readHealthSyncState(userId ?? ''),
      ]);
      return { available, permission, ...state };
    },
    enabled: !!userId,
  });
}

/**
 * Reads workouts from Health since the last sync and mirrors them into exercise_entries:
 * upserts by (user_id, external_id) and removes ones deleted in Health within the window.
 * Does nothing unless the user connected Health in Tally.
 */
export function useSyncHealth() {
  const { user } = useAuth();
  const profile = useProfile().data;
  const timezone = profile?.timezone ?? deviceTimeZone();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<{ synced: number; removed: number } | null> => {
      if (!user) return null;
      const state = await readHealthSyncState(user.id);
      if (!state.connected || !(await healthSync.isAvailable())) return null;

      const now = new Date();
      const window = syncWindow(state.lastSyncAt ? new Date(state.lastSyncAt) : null, now);
      const [workouts, existing] = await Promise.all([
        healthSync.getWorkouts(window),
        listHealthEntries(window.from, window.to),
      ]);
      const plan = planExerciseSync({ workouts, existing, window, userId: user.id, timezone });
      await upsertExerciseEntries(plan.upserts);
      await deleteExerciseEntries(plan.deleteIds);
      await updateHealthSyncState(user.id, { lastSyncAt: now.toISOString() });
      // Best effort: a notification failure never fails the sync.
      await notifyRecentWorkouts({
        userId: user.id,
        workouts,
        numbersOff: profile?.numbersOff ?? false,
        prefs: {
          allergies: profile?.allergies ?? [],
          restrictions: profile?.dietaryRestrictions ?? [],
        },
        now,
      }).catch(() => 0);
      return { synced: plan.upserts.length, removed: plan.deleteIds.length };
    },
    onSuccess: (result) => {
      if (!result) return;
      void queryClient.invalidateQueries({ queryKey: queryKeys.exercise.all });
      if (user)
        void queryClient.invalidateQueries({ queryKey: queryKeys.health.connection(user.id) });
    },
  });
}

/** Connects (permission sheet, then a first sync) or disconnects Apple Health. */
export function useSetHealthConnected() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const sync = useSyncHealth();
  return useMutation({
    mutationFn: async (connected: boolean) => {
      if (!user) throw new Error('Not signed in.');
      if (connected) {
        const shown = await healthSync.requestPermissions();
        if (!shown) throw new Error("Apple Health isn't available on this device.");
      }
      // Disconnecting stops syncing; synced workouts stay. HealthKit access itself can only be
      // revoked in the Health app.
      await updateHealthSyncState(
        user.id,
        connected ? { connected } : { connected, lastSyncAt: null },
      );
      return connected;
    },
    onSuccess: (connected) => {
      if (user)
        void queryClient.invalidateQueries({ queryKey: queryKeys.health.connection(user.id) });
      if (connected) sync.mutate();
    },
  });
}

/** Turns post-workout refuel notifications on or off on this device. */
export function useSetRefuelNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!user) return;
      await updateHealthSyncState(user.id, { refuelNotifications: enabled });
    },
    onSuccess: () => {
      if (user)
        void queryClient.invalidateQueries({ queryKey: queryKeys.health.connection(user.id) });
    },
  });
}

/** Opens Add food when a refuel notification is tapped. */
export function RefuelNotificationResponse() {
  const response = useLastNotificationResponse();
  useEffect(() => {
    const kind: unknown = response?.notification.request.content.data?.kind;
    if (kind !== REFUEL_NOTIFICATION_DATA.kind) return;
    router.navigate(REFUEL_NOTIFICATION_DATA.url);
    void clearLastNotificationResponse();
  }, [response]);
  return null;
}

/** Marks a workout's refuel prompt as dismissed so it never shows again. */
export function useDismissRefuel() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (externalId: string) => {
      if (!user) return;
      const state = await readHealthSyncState(user.id);
      await updateHealthSyncState(user.id, {
        dismissedRefuel: [...state.dismissedRefuel, externalId],
      });
    },
    onSuccess: () => {
      if (user)
        void queryClient.invalidateQueries({ queryKey: queryKeys.health.connection(user.id) });
    },
  });
}

const MIN_FOREGROUND_INTERVAL_MS = 60_000;

/** Syncs Health when the app opens and whenever it returns to the foreground. */
export function HealthSyncOnForeground() {
  const { mutate } = useSyncHealth();
  const lastRun = useRef(0);

  useEffect(() => {
    const run = () => {
      if (Date.now() - lastRun.current < MIN_FOREGROUND_INTERVAL_MS) return;
      lastRun.current = Date.now();
      mutate();
    };
    run();
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') run();
    });
    return () => subscription.remove();
  }, [mutate]);

  return null;
}
