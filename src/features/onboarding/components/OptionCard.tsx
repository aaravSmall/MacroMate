import { Pressable } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/theme';

export type OptionCardProps = {
  title: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
  /** Use checkbox semantics (multi-select) instead of radio. */
  multiple?: boolean;
};

export function OptionCard({ title, description, selected, onPress, multiple }: OptionCardProps) {
  const { colors, radii, spacing } = useTheme();
  return (
    <Pressable
      accessibilityRole={multiple ? 'checkbox' : 'radio'}
      accessibilityState={multiple ? { checked: selected } : { selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        gap: spacing.xxs,
        padding: description ? spacing.lg : spacing.md,
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: selected ? colors.accent : colors.border,
        backgroundColor: selected ? colors.accentMuted : colors.surface,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Text variant={description ? 'subheading' : 'callout'} tone={selected ? 'accent' : 'default'}>
        {title}
      </Text>
      {description ? (
        <Text variant="callout" tone="muted">
          {description}
        </Text>
      ) : null}
    </Pressable>
  );
}
