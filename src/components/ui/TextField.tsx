import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, TextInput, type TextInputProps, View } from 'react-native';

import { useTheme } from '@/theme';

import { Text } from './Text';

export type TextFieldProps = TextInputProps & {
  label: string;
  error?: string | null;
};

/**
 * Labeled text input. Secure fields (`secureTextEntry`) get a show/hide toggle so people can
 * check what they typed.
 */
export function TextField({ label, error, style, secureTextEntry, ...rest }: TextFieldProps) {
  const { colors, radii, spacing, typography } = useTheme();
  const [revealed, setRevealed] = useState(false);
  const secure = !!secureTextEntry;

  return (
    <View style={{ gap: spacing.xs }}>
      <Text variant="label" tone="muted">
        {label}
      </Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: error ? colors.danger : colors.border,
          borderRadius: radii.md,
        }}
      >
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={secure && !revealed}
          style={[
            typography.body,
            {
              flex: 1,
              color: colors.text,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.md,
            },
            style,
          ]}
          {...rest}
        />
        {secure ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              revealed ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`
            }
            onPress={() => setRevealed((r) => !r)}
            hitSlop={8}
            style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.sm }}
          >
            <Ionicons
              name={revealed ? 'eye-off-outline' : 'eye-outline'}
              size={22}
              color={colors.textMuted}
            />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text variant="caption" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
