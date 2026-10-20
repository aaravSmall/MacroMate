import { View } from 'react-native';

import { QueryStatus } from '@/components/QueryStatus';
import { Button, Card, Divider, Screen, SegmentedControl, SwitchRow, Text } from '@/components/ui';
import { useProfile, useUpdateProfile } from '@/features/account';
import { MEALS_LOGGED_TARGET } from '@/features/goals';
import { ALLERGY_OPTIONS, DIETARY_RESTRICTION_OPTIONS, OptionCard } from '@/features/onboarding';
import {
  useHealthConnection,
  useSetHealthConnected,
  useSetRefuelNotifications,
  useSyncHealth,
} from '@/features/exercise';
import {
  confirmReminders,
  describeSchedule,
  useReminderState,
  useSetRemindersEnabled,
} from '@/features/weighins';
import { useTheme } from '@/theme';
import type { HabitGoal, UnitSystem, WeighInFrequency } from '@/types/domain';

const UNIT_OPTIONS: { value: UnitSystem; label: string }[] = [
  { value: 'imperial', label: 'lb / ft' },
  { value: 'metric', label: 'kg / cm' },
];

const FREQUENCY_OPTIONS: { value: WeighInFrequency; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'monthly', label: 'Monthly' },
];

const HABIT_OPTIONS: { value: HabitGoal; label: string; description: string }[] = [
  { value: 'protein', label: 'Protein', description: 'Reach your daily protein target.' },
  {
    value: 'meals_logged',
    label: 'Meals logged',
    description: `Log ${MEALS_LOGGED_TARGET} meals a day.`,
  },
];

/** `profiles.weigh_in_weekday`: 0 = Sunday … 6 = Saturday. */
const DAY_OPTIONS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label, day) => ({
  value: String(day),
  label,
}));

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { spacing } = useTheme();
  return (
    <View style={{ gap: spacing.xs }}>
      <Text variant="label" tone="muted">
        {title}
      </Text>
      {children}
    </View>
  );
}

function ChipList({
  options,
  selected,
  onChange,
}: {
  options: readonly string[];
  selected: readonly string[];
  onChange: (next: string[]) => void;
}) {
  const { spacing } = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
      {options.map((option) => {
        const on = selected.includes(option);
        return (
          <OptionCard
            key={option}
            title={option}
            multiple
            selected={on}
            onPress={() =>
              onChange(on ? selected.filter((s) => s !== option) : [...selected, option])
            }
          />
        );
      })}
    </View>
  );
}

function AppleHealthCard() {
  const connection = useHealthConnection();
  const setConnected = useSetHealthConnected();
  const sync = useSyncHealth();
  const setRefuel = useSetRefuelNotifications();
  if (!connection.data) return null;
  const { available, connected, lastSyncAt } = connection.data;

  const status = !available
    ? "Apple Health isn't available on this device."
    : connected
      ? lastSyncAt
        ? `Connected. Last synced ${new Date(lastSyncAt).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })}.`
        : 'Connected. Syncing…'
      : 'Bring in workouts and active energy from your watch and fitness apps. Read-only: MacroMate never writes to Apple Health.';

  const error = setConnected.error ?? sync.error;
  return (
    <Card>
      <Text variant="subheading">Apple Health</Text>
      <Text variant="callout" tone="muted">
        {status}
      </Text>
      {available ? (
        connected ? (
          <>
            <SwitchRow
              label="Refuel reminders"
              description="A friendly notification shortly after a workout syncs. Uses your notification permission and never asks on its own."
              value={connection.data.refuelNotifications}
              onValueChange={(enabled) => setRefuel.mutate(enabled)}
              disabled={setRefuel.isPending}
            />
            <Text variant="caption" tone="muted">
              Disconnecting stops syncing and keeps workouts already added. To remove
              MacroMate&apos;s access completely, open the Health app → your profile → Apps →
              MacroMate.
            </Text>
            <Button
              title="Disconnect"
              variant="ghost"
              onPress={() => setConnected.mutate(false)}
              loading={setConnected.isPending}
            />
          </>
        ) : (
          <Button
            title="Connect Apple Health"
            onPress={() => setConnected.mutate(true)}
            loading={setConnected.isPending}
          />
        )
      ) : null}
      {error ? <Text tone="danger">{error.message}</Text> : null}
    </Card>
  );
}

export default function SettingsScreen() {
  const profile = useProfile();
  const updateProfile = useUpdateProfile();
  const reminders = useReminderState();
  const setReminders = useSetRemindersEnabled();

  async function toggleReminders(enabled: boolean) {
    if (enabled && profile.data && !(await confirmReminders(describeSchedule(profile.data)))) {
      return;
    }
    setReminders.mutate(enabled);
  }

  return (
    <Screen scroll edges={['bottom', 'left', 'right']}>
      <QueryStatus
        loading={profile.isPending}
        error={profile.error}
        onRetry={() => void profile.refetch()}
      />
      {profile.data ? (
        <>
          <Card>
            <Section title="Units">
              <SegmentedControl
                accessibilityLabel="Units"
                options={UNIT_OPTIONS}
                value={profile.data.unitSystem}
                onChange={(unitSystem) => updateProfile.mutate({ unitSystem })}
              />
            </Section>
            <Divider />
            <SwitchRow
              label="Numbers off"
              description="Hide calorie numbers and track habits instead. Your data is still saved, and turning this off brings everything back."
              value={profile.data.numbersOff}
              onValueChange={(numbersOff) => updateProfile.mutate({ numbersOff })}
            />
            {profile.data.numbersOff ? (
              <Section title="Habits to track">
                {HABIT_OPTIONS.map((habit) => {
                  const habits = profile.data?.habitGoals ?? [];
                  const on = habits.includes(habit.value);
                  return (
                    <SwitchRow
                      key={habit.value}
                      label={habit.label}
                      description={habit.description}
                      value={on}
                      onValueChange={(enabled) =>
                        updateProfile.mutate({
                          habitGoals: enabled
                            ? [...habits, habit.value]
                            : habits.filter((h) => h !== habit.value),
                        })
                      }
                    />
                  );
                })}
              </Section>
            ) : null}
          </Card>

          <Card>
            <Text variant="subheading">Diet & allergies</Text>
            <Text variant="callout" tone="muted">
              Used to flag foods and tailor suggestions. Food data can be incomplete, so always
              check labels.
            </Text>
            <Section title="Dietary preferences">
              <ChipList
                options={DIETARY_RESTRICTION_OPTIONS}
                selected={profile.data.dietaryRestrictions}
                onChange={(dietaryRestrictions) => updateProfile.mutate({ dietaryRestrictions })}
              />
            </Section>
            <Section title="Allergies">
              <ChipList
                options={ALLERGY_OPTIONS}
                selected={profile.data.allergies}
                onChange={(allergies) => updateProfile.mutate({ allergies })}
              />
            </Section>
          </Card>

          <AppleHealthCard />

          <Card>
            <Text variant="subheading">Weigh-ins</Text>
            <SwitchRow
              label="Weigh-in reminders"
              description={
                reminders.data?.enabled
                  ? `A gentle reminder ${describeSchedule(profile.data)}.`
                  : 'Get a gentle reminder on the schedule below. Turn it off anytime.'
              }
              value={reminders.data?.enabled ?? false}
              onValueChange={(enabled) => void toggleReminders(enabled)}
              disabled={setReminders.isPending}
            />
            {setReminders.error ? (
              <Text variant="caption" tone="danger">
                {setReminders.error.message}
              </Text>
            ) : null}
            <Divider />
            <Section title="How often">
              <SegmentedControl
                accessibilityLabel="Weigh-in frequency"
                options={FREQUENCY_OPTIONS}
                value={profile.data.weighInFrequency}
                onChange={(weighInFrequency) => updateProfile.mutate({ weighInFrequency })}
              />
            </Section>
            <Section title="Day">
              <SegmentedControl
                accessibilityLabel="Weigh-in day"
                options={DAY_OPTIONS}
                value={String(profile.data.weighInWeekday)}
                onChange={(day) => updateProfile.mutate({ weighInWeekday: Number(day) })}
                wrap
              />
            </Section>
          </Card>
          {updateProfile.error ? <Text tone="danger">{updateProfile.error.message}</Text> : null}
        </>
      ) : null}
    </Screen>
  );
}
