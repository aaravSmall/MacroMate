import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { type TypographyVariant, useTheme } from '@/theme';

export type TextProps = RNTextProps & {
  variant?: TypographyVariant;
  tone?: 'default' | 'muted' | 'accent' | 'onAccent' | 'danger';
  align?: 'left' | 'center' | 'right';
};

export function Text({ variant = 'body', tone = 'default', align, style, ...rest }: TextProps) {
  const { colors, typography } = useTheme();
  const color = {
    default: colors.text,
    muted: colors.textMuted,
    accent: colors.accent,
    onAccent: colors.onAccent,
    danger: colors.danger,
  }[tone];

  return <RNText style={[typography[variant], { color, textAlign: align }, style]} {...rest} />;
}
