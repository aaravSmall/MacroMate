import {
  REFUEL_NOTIFY_WITHIN_MS,
  refuelKind,
  refuelMessage,
  workoutsToNotify,
} from '@/features/exercise/logic/refuel';

describe('refuelKind', () => {
  it('maps HealthKit workout types to tip kinds', () => {
    expect(refuelKind('Running')).toBe('running');
    expect(refuelKind('Strength training')).toBe('strength');
    expect(refuelKind('Functional strength training')).toBe('strength');
    expect(refuelKind('Climbing')).toBe('climbing');
  });

  it('falls back to generic', () => {
    expect(refuelKind('Yoga')).toBe('generic');
    expect(refuelKind('Workout')).toBe('generic');
  });
});

describe('refuelMessage', () => {
  it('names calories burned and the refuel nudge', () => {
    const msg = refuelMessage({ activityType: 'Running', burnedKcal: 412.4 });
    expect(msg.title).toBe('Nice workout!');
    expect(msg.message).toBe("You burned about 412 cal. Don't forget to refuel.");
    expect(msg.tip).toMatch(/^After a run, some carbs/);
  });

  it('leaves out calories in numbers-off mode or without energy data', () => {
    expect(
      refuelMessage({ activityType: 'Running', burnedKcal: 400, numbersOff: true }).message,
    ).toBe("Don't forget to refuel.");
    expect(refuelMessage({ activityType: 'Running', burnedKcal: null }).message).toBe(
      "Don't forget to refuel.",
    );
  });

  it('varies the tip by workout type', () => {
    expect(refuelMessage({ activityType: 'Strength training', burnedKcal: 0 }).tip).toMatch(
      /protein/,
    );
    expect(refuelMessage({ activityType: 'Climbing', burnedKcal: 0 }).tip).toMatch(/collagen/);
    expect(refuelMessage({ activityType: 'Yoga', burnedKcal: 0 }).tip).toMatch(/carbs and protein/);
  });

  it('skips suggestions that conflict with allergies or restrictions', () => {
    const tip = refuelMessage({
      activityType: 'Strength training',
      burnedKcal: 0,
      prefs: { allergies: ['Milk'], restrictions: [] },
    }).tip;
    expect(tip).not.toMatch(/yogurt|shake/i);
    expect(tip).toMatch(/eggs on toast or tofu or edamame/);
  });

  it('never frames food as earned', () => {
    for (const activityType of ['Running', 'Strength training', 'Climbing', 'Yoga']) {
      const { title, message, tip } = refuelMessage({ activityType, burnedKcal: 300 });
      expect(`${title} ${message} ${tip}`.toLowerCase()).not.toMatch(/earn|deserve|burn it off/);
    }
  });
});

describe('workoutsToNotify', () => {
  const now = new Date('2026-10-19T18:00:00Z');
  const ago = (ms: number) => new Date(now.getTime() - ms);
  const workouts = [
    { externalId: 'recent', endedAt: ago(30 * 60 * 1000) },
    { externalId: 'old', endedAt: ago(REFUEL_NOTIFY_WITHIN_MS + 1) },
    { externalId: 'done', endedAt: ago(10 * 60 * 1000) },
    { externalId: 'future', endedAt: new Date(now.getTime() + 60_000) },
  ];

  it('picks recent, unhandled workouts only', () => {
    expect(
      workoutsToNotify(workouts, { now, alreadyHandled: new Set(['done']) }).map(
        (w) => w.externalId,
      ),
    ).toEqual(['recent']);
  });
});
