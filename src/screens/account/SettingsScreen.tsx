import { View } from 'react-native';

import { QueryStatus } from '@/components/QueryStatus';
import { Card, Divider, Screen, SegmentedControl, SwitchRow, Text } from '@/components/ui';
import { useProfile, useUpdateProfile } from '@/features/account';
import { useTheme } from '@/theme';
import type { UnitSystem, WeighInFrequency } from '@/types/domain';

const UNIT_OPTIONS: { value: UnitSystem; label: string }[] = [
  { value: 'imperial', label: 'lb / ft' },
  { value: 'metric', label: 'kg / cm' },
];

const FREQUENCY_OPTIONS: { value: WeighInFrequency; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'monthly', label: 'Monthly' },
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

export default function SettingsScreen() {
  const profile = useProfile();
  const updateProfile = useUpdateProfile();

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
              description="Hide calorie numbers and focus on the habit of logging. Your data is still saved."
              value={profile.data.numbersOff}
              onValueChange={(numbersOff) => updateProfile.mutate({ numbersOff })}
            />
          </Card>

          {/* TODO(reminders): schedule local notifications from this schedule. */}
          <Card>
            <Text variant="subheading">Weigh-in schedule</Text>
            <Text variant="callout" tone="muted">
              Reminder notifications are coming soon. Your schedule is saved now.
            </Text>
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
