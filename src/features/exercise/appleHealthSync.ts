import {
  AuthorizationRequestStatus,
  getRequestStatusForAuthorization,
  isHealthDataAvailable,
  queryWorkoutSamples,
  requestAuthorization,
  WorkoutActivityType,
} from '@kingstinct/react-native-healthkit';

import type { HealthSync, HealthWorkout } from './healthSync';
import { energyKcal, humanizeActivity } from './logic/healthSyncPlan';

/** Read-only: workouts and active energy. Nothing is ever requested for writing. */
const READ = {
  toRead: ['HKWorkoutTypeIdentifier', 'HKQuantityTypeIdentifierActiveEnergyBurned'] as const,
};

export const appleHealthSync: HealthSync = {
  isAvailable: async () => isHealthDataAvailable(),

  permissionState: async () => {
    if (!isHealthDataAvailable()) return 'unavailable';
    const status = await getRequestStatusForAuthorization(READ);
    return status === AuthorizationRequestStatus.shouldRequest ? 'shouldRequest' : 'requested';
  },

  requestPermissions: async () => {
    if (!isHealthDataAvailable()) return false;
    return requestAuthorization(READ);
  },

  getWorkouts: async ({ from, to }) => {
    // No source filter: workouts from every app and device that writes to Health.
    const workouts = await queryWorkoutSamples({
      limit: 0,
      filter: { date: { startDate: from, endDate: to } },
    });
    return workouts.map((w): HealthWorkout => ({
      externalId: w.uuid,
      activityType: humanizeActivity(WorkoutActivityType[w.workoutActivityType]),
      startedAt: new Date(w.startDate),
      endedAt: new Date(w.endDate),
      activeCalories: energyKcal(w.totalEnergyBurned),
    }));
  },
};
