/**
 * Health data sync. The app reads workouts (from any source: Apple Watch, Hevy, Fitbit, … all
 * arrive through Apple Health) and active energy. It never writes to Health.
 *
 * iOS uses HealthKit (appleHealthSync.ts), which needs a development build. Android and
 * unsupported builds use noopHealthSync.
 */
import { Platform } from 'react-native';

export type HealthWorkout = {
  /** Stable HealthKit sample UUID; stored as exercise_entries.external_id. */
  externalId: string;
  activityType: string;
  startedAt: Date;
  endedAt: Date;
  /** Active energy burned, kcal (0 when the workout didn't record it). */
  activeCalories: number;
};

/**
 * - unavailable: no Health on this device/build
 * - shouldRequest: the permission sheet hasn't been shown yet
 * - requested: the sheet was shown (HealthKit never reveals whether reading was allowed)
 */
export type HealthPermissionState = 'unavailable' | 'shouldRequest' | 'requested';

export interface HealthSync {
  /** Whether health data is available on this device and build. */
  isAvailable(): Promise<boolean>;
  permissionState(): Promise<HealthPermissionState>;
  /** Shows the read-only permission sheet for workouts and active energy. */
  requestPermissions(): Promise<boolean>;
  /** Workouts that started within [from, to]. */
  getWorkouts(range: { from: Date; to: Date }): Promise<HealthWorkout[]>;
}

/** Used on Android and unsupported builds: reports unavailable and returns nothing. */
export const noopHealthSync: HealthSync = {
  isAvailable: async () => false,
  permissionState: async () => 'unavailable',
  requestPermissions: async () => false,
  getWorkouts: async () => [],
};

function pick(): HealthSync {
  if (Platform.OS !== 'ios') return noopHealthSync;
  // Loaded lazily so non-iOS bundles and tests never touch the native module.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { appleHealthSync } = require('./appleHealthSync') as typeof import('./appleHealthSync');
  return appleHealthSync;
}

export const healthSync: HealthSync = pick();
