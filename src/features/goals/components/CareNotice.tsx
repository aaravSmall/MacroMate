import Ionicons from '@expo/vector-icons/Ionicons';
import { Link } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/theme';

export type CareNoticeProps = {
  title: string;
  message: string;
  /** Show a link to the Help & resources page. Defaults to true. */
  showHelpLink?: boolean;
  children?: ReactNode;
};

/**
 * A gentle, non-blocking notice for safety-related guidance. Uses the calm accent palette
 * (never warning/error colors) and points to Help & resources.
 */
export function CareNotice({ title, message, showHelpLink = true, children }: CareNoticeProps) {
  const { colors, radii, spacing } = useTheme();
  return (
    <View
      accessibilityRole="summary"
      style={{
        flexDirection: 'row',
        gap: spacing.md,
        padding: spacing.lg,
        borderRadius: radii.lg,
        backgroundColor: colors.accentMuted,
      }}
    >
      <Ionicons name="heart-outline" size={22} color={colors.accent} />
      <View style={{ flex: 1, gap: spacing.xs }}>
        <Text variant="subheading">{title}</Text>
        <Text variant="callout">{message}</Text>
        {children}
        {showHelpLink ? (
          <Link href="/account/help">
            <Text variant="callout" tone="accent">
              Help & resources
            </Text>
          </Link>
        ) : null}
      </View>
    </View>
  );
}
