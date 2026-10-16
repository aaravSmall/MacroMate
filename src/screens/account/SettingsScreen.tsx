import { View } from 'react-native';

import { QueryStatus } from '@/components/QueryStatus';
import { Card, Divider, Screen, SegmentedControl, SwitchRow, Text } from '@/components/ui';
import { useProfile, useUpdateProfile } from '@/features/account';
import {
  useUpdateUserSettings,
  useUserSettings,
  type Weekday,
  type WeighInFrequency,
} from '@/features/weighins';
import { useTheme } from '@/theme';
import type { UnitSystem } from '@/types/domain';

const UNIT_OPTIONS: { value: UnitSystem; label: string }[] = [
  { value: 'imperial', label: 'lb / ft' },
  { value: 'metric', label: 'kg / cm' },
];

const FREQUENCY_OPTIONS: { value: WeighInFrequency; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'monthly', label: 'Monthly' },
];

const DAY_OPTIONS: { value: Weekday; label: string }[] = [
  { value: 'sunday', label: 'Sun' },
  { value: 'monday', label: 'Mon' },
  { value: 'tuesday', label: 'Tue' },
  { value: 'wednesday', label: 'Wed' },
  { value: 'thursday', label: 'Thu' },
  { value: 'friday', label: 'Fri' },
  { value: 'saturday', label: 'Sat' },
];

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
  const settings = useUserSettings();
  const updateProfile = useUpdateProfile();
  const updateSettings = useUpdateUserSettings();
  const error = updateProfile.error ?? updateSettings.error;

  return (
    <Screen scroll edges={['bottom', 'left', 'right']}>
      <QueryStatus
        loading={profile.isPending || settings.isPending}
        error={profile.error ?? settings.error}
        onRetry={() => {
          void profile.refetch();
          void settings.refetch();
        }}
      />
      {profile.data && settings.data ? (
        <>
          <Card>
            <Section title="Units">
              <SegmentedControl
                accessibilityLabel="Units"
                options={UNIT_OPTIONS}
                value={profile.data.units}
                onChange={(units) => updateProfile.mutate({ units })}
              />
            </Section>
            <Divider />
            <SwitchRow
              label="Numbers off"
              description="Hide calorie numbers and focus on the habit of logging. Your data is still saved."
              value={profile.data.numbersOffMode}
              onValueChange={(numbersOffMode) => updateProfile.mutate({ numbersOffMode })}
            />
          </Card>

          <Card>
            <SwitchRow
              label="Weigh-in reminders"
              description="Reminder notifications are coming soon. Your schedule is saved now."
              value={settings.data.remindersEnabled}
              onValueChange={(remindersEnabled) => updateSettings.mutate({ remindersEnabled })}
            />
            <Divider />
            <Section title="How often">
              <SegmentedControl
                accessibilityLabel="Weigh-in frequency"
                options={FREQUENCY_OPTIONS}
                value={settings.data.weighInFrequency}
                onChange={(weighInFrequency) => updateSettings.mutate({ weighInFrequency })}
              />
            </Section>
            <Section title="Day">
              <SegmentedControl
                accessibilityLabel="Weigh-in day"
                options={DAY_OPTIONS}
                value={settings.data.weighInDay}
                onChange={(weighInDay) => updateSettings.mutate({ weighInDay })}
                wrap
              />
            </Section>
          </Card>
          {error ? <Text tone="danger">{error.message}</Text> : null}
        </>
      ) : null}
    </Screen>
  );
}
