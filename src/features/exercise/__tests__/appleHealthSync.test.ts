import {
  getRequestStatusForAuthorization,
  isHealthDataAvailable,
  queryWorkoutSamples,
  requestAuthorization,
} from '@kingstinct/react-native-healthkit';

import { appleHealthSync } from '@/features/exercise/appleHealthSync';

jest.mock('@kingstinct/react-native-healthkit', () => ({
  AuthorizationRequestStatus: { unknown: 0, shouldRequest: 1, unnecessary: 2 },
  WorkoutActivityType: { 37: 'running', 50: 'traditionalStrengthTraining' },
  isHealthDataAvailable: jest.fn(() => true),
  getRequestStatusForAuthorization: jest.fn(),
  requestAuthorization: jest.fn(async () => true),
  queryWorkoutSamples: jest.fn(),
}));

const mocked = <T>(fn: T) => fn as unknown as jest.Mock;

describe('appleHealthSync (HealthKit mocked)', () => {
  beforeEach(() => mocked(isHealthDataAvailable).mockReturnValue(true));

  it('requests read-only access to workouts and active energy', async () => {
    await appleHealthSync.requestPermissions();
    expect(requestAuthorization).toHaveBeenCalledWith({
      toRead: ['HKWorkoutTypeIdentifier', 'HKQuantityTypeIdentifierActiveEnergyBurned'],
    });
    const [arg] = mocked(requestAuthorization).mock.calls[0] ?? [];
    expect(arg).not.toHaveProperty('toShare');
  });

  it('reports permission state', async () => {
    mocked(getRequestStatusForAuthorization).mockResolvedValueOnce(1);
    await expect(appleHealthSync.permissionState()).resolves.toBe('shouldRequest');
    mocked(getRequestStatusForAuthorization).mockResolvedValueOnce(2);
    await expect(appleHealthSync.permissionState()).resolves.toBe('requested');
    mocked(isHealthDataAvailable).mockReturnValue(false);
    await expect(appleHealthSync.permissionState()).resolves.toBe('unavailable');
  });

  it('queries every source in the date range and maps workouts', async () => {
    mocked(queryWorkoutSamples).mockResolvedValue([
      {
        uuid: 'HK-UUID-1',
        workoutActivityType: 50,
        startDate: new Date('2026-10-18T12:00:00Z'),
        endDate: new Date('2026-10-18T12:45:00Z'),
        totalEnergyBurned: { unit: 'kcal', quantity: 287.4 },
      },
      {
        uuid: 'HK-UUID-2',
        workoutActivityType: 37,
        startDate: new Date('2026-10-18T07:00:00Z'),
        endDate: new Date('2026-10-18T07:30:00Z'),
      },
    ]);
    const from = new Date('2026-10-11T00:00:00Z');
    const to = new Date('2026-10-18T23:00:00Z');
    const workouts = await appleHealthSync.getWorkouts({ from, to });
    expect(queryWorkoutSamples).toHaveBeenCalledWith({
      limit: 0,
      filter: { date: { startDate: from, endDate: to } },
    });
    expect(workouts).toEqual([
      {
        externalId: 'HK-UUID-1',
        activityType: 'Strength training',
        startedAt: new Date('2026-10-18T12:00:00Z'),
        endedAt: new Date('2026-10-18T12:45:00Z'),
        activeCalories: 287.4,
      },
      {
        externalId: 'HK-UUID-2',
        activityType: 'Running',
        startedAt: new Date('2026-10-18T07:00:00Z'),
        endedAt: new Date('2026-10-18T07:30:00Z'),
        activeCalories: 0,
      },
    ]);
  });
});
