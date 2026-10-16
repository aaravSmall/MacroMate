import { Pressable, View } from 'react-native';

import { useTheme } from '@/theme';

import { Text } from './Text';

export type SegmentOption<T extends string> = { label: string; value: T };

export type SegmentedControlProps<T extends string> = {
  options: readonly SegmentOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  accessibilityLabel?: string;
  /** Wrap onto multiple lines instead of sharing one row. */
  wrap?: boolean;
};

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
  wrap = false,
}: SegmentedControlProps<T>) {
  const { colors, radii, spacing } = useTheme();
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      style={{ flexDirection: 'row', flexWrap: wrap ? 'wrap' : 'nowrap', gap: spacing.xs }}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
            onPress={() => onChange(option.value)}
            style={{
              flexGrow: wrap ? 0 : 1,
              flexBasis: wrap ? undefined : 0,
              alignItems: 'center',
              paddingVertical: spacing.sm,
              paddingHorizontal: spacing.md,
              borderRadius: radii.md,
              borderWidth: 1,
              borderColor: selected ? colors.accent : colors.border,
              backgroundColor: selected ? colors.accentMuted : colors.surface,
            }}
          >
            <Text variant="callout" tone={selected ? 'accent' : 'default'}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
