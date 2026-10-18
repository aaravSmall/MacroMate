import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { QueryStatus } from '@/components/QueryStatus';
import { Card, Divider, EmptyState, Screen, SegmentedControl, Text } from '@/components/ui';
import { defaultServing } from '@/features/food';
import {
  DINING_PROVIDERS,
  defaultMealIndex,
  mealTypeFor,
  readLastLocation,
  saveLastLocation,
  useDiningLocations,
  useDiningMenu,
} from '@/features/dining';
import { suggestMealType } from '@/features/logging';
import { toDateKeyInTimeZone } from '@/lib/dates';
import { formatKcal } from '@/lib/format';
import { queryKeys } from '@/lib/queryKeys';
import { useTheme } from '@/theme';
import type { Food } from '@/types/domain';

function FoodRow({ food, onPress }: { food: Food; onPress: () => void }) {
  const { spacing } = useTheme();
  const serving = defaultServing(food);
  const kcal = food.nutrition.calories * serving.baseMultiplier;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${food.name}, ${formatKcal(kcal)} calories per ${serving.label}`}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        gap: spacing.md,
        paddingVertical: spacing.sm,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View style={{ flex: 1, gap: spacing.xxs }}>
        <Text variant="callout">{food.name}</Text>
        <Text variant="caption" tone="muted">
          {[serving.label, food.dietTags.length ? food.dietTags.join(', ') : null]
            .filter(Boolean)
            .join(' · ')}
        </Text>
      </View>
      <Text variant="callout">{formatKcal(kcal)}</Text>
    </Pressable>
  );
}

export default function DiningScreen() {
  const { colors, radii, spacing } = useTheme();
  const queryClient = useQueryClient();
  const locations = useDiningLocations();
  const [locationId, setLocationId] = useState<string | null>(null);
  const [mealIndex, setMealIndex] = useState<number | null>(null);

  // Remember the last location on this device.
  useEffect(() => {
    void readLastLocation().then((id) => {
      if (id) setLocationId((current) => current ?? id);
    });
  }, []);
  const location = locations.data?.find((l) => l.id === locationId) ?? null;

  const timeZone = DINING_PROVIDERS[location?.provider ?? 'purdue']?.timeZone ?? 'UTC';
  const today = useMemo(() => toDateKeyInTimeZone(new Date(), timeZone), [timeZone]);
  const menu = useDiningMenu(location?.id ?? null, today);
  const meals = menu.data ?? [];
  const selected = mealIndex ?? defaultMealIndex(meals, suggestMealType(new Date()));
  const meal = meals[Math.min(selected, Math.max(0, meals.length - 1))];

  function pickLocation(id: string) {
    setLocationId(id);
    setMealIndex(null);
    void saveLastLocation(id);
  }

  function openFood(food: Food) {
    queryClient.setQueryData(queryKeys.foods.detail(food.id), food);
    router.push({
      pathname: '/food-detail/[id]',
      params: { id: food.id, meal: meal ? mealTypeFor(meal.name) : undefined },
    });
  }

  return (
    <Screen scroll edges={['bottom', 'left', 'right']}>
      <QueryStatus
        loading={locations.isPending}
        error={locations.error}
        onRetry={() => void locations.refetch()}
      />
      {locations.data && locations.data.length === 0 ? (
        <EmptyState
          icon="restaurant-outline"
          title="No dining halls yet"
          description="Menus sync every morning. Check back soon."
        />
      ) : null}

      {locations.data && locations.data.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
          {locations.data.map((l) => {
            const active = l.id === location?.id;
            return (
              <Pressable
                key={l.id}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                onPress={() => pickLocation(l.id)}
                style={{
                  paddingVertical: spacing.xs,
                  paddingHorizontal: spacing.md,
                  borderRadius: radii.pill,
                  borderWidth: 1,
                  borderColor: active ? colors.accent : colors.border,
                  backgroundColor: active ? colors.accentMuted : colors.surface,
                }}
              >
                <Text variant="callout" tone={active ? 'accent' : 'default'}>
                  {l.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {!location && locations.data?.length ? (
        <Text tone="muted">Pick a dining hall to see today&apos;s menu.</Text>
      ) : null}

      {location ? (
        <>
          <QueryStatus
            loading={menu.isPending}
            error={menu.error}
            onRetry={() => void menu.refetch()}
          />
          {menu.data && meals.length === 0 ? (
            <Text tone="muted">{location.name} has no menu posted for today.</Text>
          ) : null}
          {meals.length > 1 ? (
            <SegmentedControl
              accessibilityLabel="Meal"
              options={meals.map((m, i) => ({ value: String(i), label: m.name }))}
              value={String(selected)}
              onChange={(v) => setMealIndex(Number(v))}
              wrap
            />
          ) : null}
          {meal?.stations.map((station) => (
            <View key={station.name} style={{ gap: spacing.xs }}>
              <Text variant="label" tone="muted">
                {station.name}
              </Text>
              <Card>
                {station.foods.map((food, i) => (
                  <View key={food.id}>
                    {i > 0 ? <Divider /> : null}
                    <FoodRow food={food} onPress={() => openFood(food)} />
                  </View>
                ))}
              </Card>
            </View>
          ))}
          {meal ? (
            <Text variant="caption" tone="muted">
              Nutrition from {DINING_PROVIDERS[location.provider]?.label ?? 'the dining hall'}.
              Portions vary, so use the portion helper if you&apos;re unsure.
            </Text>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}
