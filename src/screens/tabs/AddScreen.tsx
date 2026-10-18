import Ionicons from '@expo/vector-icons/Ionicons';
import { type Href, router } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, View } from 'react-native';

import { Screen, Text } from '@/components/ui';
import { useTheme } from '@/theme';

type AddOption = {
  title: string;
  description: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  href: Href;
};

const OPTIONS: AddOption[] = [
  {
    title: 'Search foods',
    description: 'Find a food in the database or your My Foods.',
    icon: 'search',
    href: '/food-search',
  },
  {
    title: 'Create food',
    description: 'Enter a food and its nutrition yourself.',
    icon: 'create-outline',
    href: '/create-food',
  },
  {
    title: 'Scan nutrition label',
    description: 'Photograph a Nutrition Facts panel and check the filled-in food.',
    icon: 'scan-outline',
    href: '/label-scan',
  },
];

export default function AddScreen() {
  const { colors, radii, spacing } = useTheme();

  return (
    <Screen scroll>
      <Text variant="title">Add food</Text>
      <Text tone="muted">Log what you ate, three ways.</Text>
      {OPTIONS.map((option) => (
        <Pressable
          key={option.title}
          accessibilityRole="button"
          accessibilityLabel={option.title}
          onPress={() => router.push(option.href)}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.lg,
            padding: spacing.xl,
            borderRadius: radii.lg,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: radii.pill,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.accentMuted,
            }}
          >
            <Ionicons name={option.icon} size={24} color={colors.accent} />
          </View>
          <View style={{ flex: 1, gap: spacing.xxs }}>
            <Text variant="subheading">{option.title}</Text>
            <Text variant="callout" tone="muted">
              {option.description}
            </Text>
          </View>
        </Pressable>
      ))}
    </Screen>
  );
}
