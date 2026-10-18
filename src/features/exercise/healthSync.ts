/**
 * Health data sync (Apple Health on iOS).
 *
 * TODO(healthkit): implement with a HealthKit module. HealthKit is a native module that Expo Go
 * doesn't include, so this needs a development build (`npx expo run:ios` or
 * `eas build --profile development`) plus the HealthKit entitlement and usage strings in
 * app.json. Synced workouts should upsert into exercise_entries keyed by (user_id, external_id).
 */

export type HealthWorkout = {
  /** Stable id from the health store; used as exercise_entries.external_id. */
  externalId: string;
  activityType: string;
  startedAt: Date;
  endedAt: Date;
  /** Active energy burned, kcal. */
  activeCalories: number;
};

export interface HealthSync {
  /** Whether health data is available on this device and build. */
  isAvailable(): Promise<boolean>;
  /** Prompts for read access to workouts and active energy. Resolves to whether it was granted. */
  requestPermissions(): Promise<boolean>;
  /** Workouts that started within [from, to). */
  getWorkouts(range: { from: Date; to: Date }): Promise<HealthWorkout[]>;
}

/** Placeholder used until HealthKit is wired up: reports unavailable and returns nothing. */
export const noopHealthSync: HealthSync = {
  isAvailable: async () => false,
  requestPermissions: async () => false,
  getWorkouts: async () => [],
};

export const healthSync: HealthSync = noopHealthSync;
