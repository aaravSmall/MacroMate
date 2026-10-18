import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router/js-tabs';
import { View } from 'react-native';

import { HealthSyncOnForeground } from '@/features/exercise';
import { WeighInReminderSync } from '@/features/weighins';
import { useTheme } from '@/theme';

export default function TabsLayout() {
  const { colors, radii } = useTheme();

  // Only mounted for signed-in, onboarded users (the root layout guards this group).
  return (
    <>
      <HealthSyncOnForeground />
      <WeighInReminderSync />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        }}
      >
        <Tabs.Screen
          name="today"
          options={{
            title: 'Today',
            tabBarIcon: ({ size, focused }) => (
              <Ionicons
                name={focused ? 'today' : 'today-outline'}
                size={size}
                color={focused ? colors.accent : colors.textMuted}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="add"
          options={{
            title: 'Add',
            tabBarAccessibilityLabel: 'Add food',
            tabBarLabel: () => null,
            tabBarIcon: () => (
              <View
                style={{
                  width: 48,
                  height: 48,
                  marginTop: 12,
                  borderRadius: radii.pill,
                  backgroundColor: colors.accent,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="add" size={30} color={colors.onAccent} />
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="progress"
          options={{
            title: 'Progress',
            tabBarIcon: ({ size, focused }) => (
              <Ionicons
                name={focused ? 'stats-chart' : 'stats-chart-outline'}
                size={size}
                color={focused ? colors.accent : colors.textMuted}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="account"
          options={{
            title: 'Account',
            tabBarIcon: ({ size, focused }) => (
              <Ionicons
                name={focused ? 'person-circle' : 'person-circle-outline'}
                size={size}
                color={focused ? colors.accent : colors.textMuted}
              />
            ),
          }}
        />
      </Tabs>
    </>
  );
}
