import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { QueryStatus } from '@/components/QueryStatus';
import { Button, Card, Divider, Screen, SegmentedControl, Text, TextField } from '@/components/ui';
import { useFood, useUserFoods } from '@/features/food';
import { MEAL_LABEL_NAMES, MEAL_LABELS, suggestMealLabel, useAddLog } from '@/features/logging';
import { formatGrams, formatKcal, formatServing, parseNumber } from '@/lib/format';
import { scaleNutrition } from '@/lib/nutrition';
import { logTimeForDateKey, useSelectedDateStore } from '@/store/selectedDateStore';
import { useTheme } from '@/theme';
import type { AnyFood, MealLabel } from '@/types/domain';

const MEAL_OPTIONS = MEAL_LABELS.map((value) => ({ value, label: MEAL_LABEL_NAMES[value] }));

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text variant="callout">{label}</Text>
      <Text variant="callout" tone="muted">
        {value}
      </Text>
    </View>
  );
}

function LogFoodForm({ food }: { food: AnyFood }) {
  const { spacing } = useTheme();
  const dateKey = useSelectedDateStore((s) => s.dateKey);
  const loggedAt = useMemo(() => logTimeForDateKey(dateKey), [dateKey]);
  const [servingsText, setServingsText] = useState('1');
  const [mealLabel, setMealLabel] = useState<MealLabel>(() => suggestMealLabel(loggedAt));
  const [error, setError] = useState<string | null>(null);
  const addLog = useAddLog();

  const servings = parseNumber(servingsText);
  const valid = servings !== null && servings > 0;
  const totals = scaleNutrition(food.nutrition, valid ? servings : 1);

  async function handleLog() {
    if (!valid) {
      setError('Enter a number of servings above 0.');
      return;
    }
    setError(null);
    try {
      await addLog.mutateAsync({ food, servings, loggedAt, mealLabel });
      router.dismissAll();
      router.navigate('/today');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not log this food.');
    }
  }

  return (
    <>
      <View style={{ gap: spacing.xxs }}>
        <Text variant="title">{food.name}</Text>
        <Text tone="muted">
          {[food.brand, `${formatServing(food.serving.size, food.serving.unit)} per serving`]
            .filter(Boolean)
            .join(' · ')}
        </Text>
      </View>

      <Card>
        <Row label="Calories" value={formatKcal(totals.calories)} />
        <Divider />
        <Row label="Protein" value={formatGrams(totals.proteinG)} />
        <Row label="Carbs" value={formatGrams(totals.carbsG)} />
        <Row label="Fat" value={formatGrams(totals.fatG)} />
        <Text variant="caption" tone="muted">
          For {valid ? servings : 1} serving{valid && servings !== 1 ? 's' : ''}
        </Text>
      </Card>

      <TextField
        label="Servings"
        value={servingsText}
        onChangeText={setServingsText}
        keyboardType="decimal-pad"
        selectTextOnFocus
      />
      <View style={{ gap: spacing.xs }}>
        <Text variant="label" tone="muted">
          Meal
        </Text>
        <SegmentedControl
          accessibilityLabel="Meal"
          options={MEAL_OPTIONS}
          value={mealLabel}
          onChange={setMealLabel}
        />
      </View>
      {error ? <Text tone="danger">{error}</Text> : null}
      <Button title="Log it" onPress={handleLog} loading={addLog.isPending} />
    </>
  );
}

export default function FoodDetailScreen() {
  const { id, kind } = useLocalSearchParams<{ id: string; kind?: string }>();
  const isUserFood = kind === 'userFood';
  const food = useFood(isUserFood ? undefined : id);
  const userFoods = useUserFoods();

  const query = isUserFood ? userFoods : food;
  const data = isUserFood ? userFoods.data?.find((f) => f.id === id) : food.data;

  return (
    <Screen scroll edges={['bottom', 'left', 'right']}>
      <QueryStatus
        loading={query.isPending}
        error={query.error}
        onRetry={() => void query.refetch()}
      />
      {!query.isPending && !query.error && !data ? (
        <Text tone="muted">We couldn&apos;t find this food.</Text>
      ) : null}
      {data ? <LogFoodForm food={data} /> : null}
    </Screen>
  );
}
