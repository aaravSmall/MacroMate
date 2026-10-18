import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, View } from 'react-native';

import { QueryStatus } from '@/components/QueryStatus';
import { Button, Card, Divider, Screen, SegmentedControl, Text, TextField } from '@/components/ui';
import { useProfile } from '@/features/account';
import { useAuth } from '@/features/auth';
import {
  canDeleteFood,
  canVerifyFood,
  hasMismatchWarning,
  useDeleteFood,
  useFood,
  useMyVerification,
  useVerifyFood,
} from '@/features/food';
import {
  MEAL_LABEL_NAMES,
  MEAL_LABELS,
  portionNutrition,
  suggestMealType,
  useAddLog,
} from '@/features/logging';
import { toDateKey, toDateKeyInTimeZone } from '@/lib/dates';
import { formatGrams, formatKcal, parseNumber } from '@/lib/format';
import { logTimeForDateKey, useSelectedDateStore } from '@/store/selectedDateStore';
import { useTheme } from '@/theme';
import type { Food, MealType } from '@/types/domain';

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

/** "Does this match your label?" Resolves to the answer, or null if the user skips it. */
function askLabelMatch(foodName: string): Promise<boolean | null> {
  return new Promise((resolve) => {
    Alert.alert(
      'Does this match your label?',
      `Compare the calories and macros for ${foodName} with your package. Your answer helps others.`,
      [
        { text: 'Not now', style: 'cancel', onPress: () => resolve(null) },
        { text: "Doesn't match", onPress: () => resolve(false) },
        { text: 'Matches', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(null) },
    );
  });
}

function LogFoodForm({ food, userId }: { food: Food; userId: string }) {
  const { spacing } = useTheme();
  const profile = useProfile();
  const dateKey = useSelectedDateStore((s) => s.dateKey);
  const loggedAt = useMemo(() => logTimeForDateKey(dateKey), [dateKey]);
  const [servingIndex, setServingIndex] = useState(0);
  const [quantityText, setQuantityText] = useState('1');
  const [meal, setMeal] = useState<MealType>(() => suggestMealType(loggedAt));
  const [error, setError] = useState<string | null>(null);
  const addLog = useAddLog();
  const deleteFood = useDeleteFood();

  const verifiable = canVerifyFood(food, userId);
  const myVerification = useMyVerification(food.id, verifiable);
  const verifyFood = useVerifyFood();

  const serving = food.servings[servingIndex] ?? food.servings[0];
  const quantity = parseNumber(quantityText);
  const valid = quantity !== null && quantity > 0;
  const totals = serving ? portionNutrition(food, serving, valid ? quantity : 1) : null;

  async function handleLog() {
    if (!serving || !valid) {
      setError('Enter an amount above 0.');
      return;
    }
    setError(null);

    if (verifiable && myVerification.data === null) {
      const matches = await askLabelMatch(food.name);
      if (matches !== null) verifyFood.mutate({ foodId: food.id, matches });
    }

    const timezone = profile.data?.timezone;
    try {
      await addLog.mutateAsync({
        food,
        serving,
        quantity,
        loggedAt,
        // The user's timezone at log time; falls back to the device's day if it isn't loaded.
        localDate: timezone ? toDateKeyInTimeZone(loggedAt, timezone) : toDateKey(loggedAt),
        meal,
      });
      router.dismissAll();
      router.navigate('/today');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not log this food.');
    }
  }

  function handleDelete() {
    Alert.alert('Delete this food?', `${food.name} will be removed from My Foods.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteFood.mutate(food.id, { onSuccess: () => router.back() });
        },
      },
    ]);
  }

  return (
    <>
      <View style={{ gap: spacing.xxs }}>
        <Text variant="title">{food.name}</Text>
        {food.brand ? <Text tone="muted">{food.brand}</Text> : null}
        {food.visibility === 'public' && hasMismatchWarning(food) ? (
          <Text variant="callout" tone="accent">
            Some people found this doesn&apos;t match their package. It&apos;s worth checking
            against your label.
          </Text>
        ) : null}
      </View>

      {totals ? (
        <Card>
          <Row label="Calories" value={formatKcal(totals.calories)} />
          <Divider />
          <Row label="Protein" value={formatGrams(totals.proteinG)} />
          <Row label="Carbs" value={formatGrams(totals.carbsG)} />
          <Row label="Fat" value={formatGrams(totals.fatG)} />
          <Text variant="caption" tone="muted">
            For {valid ? quantity : 1} × {serving?.label}
          </Text>
        </Card>
      ) : null}

      {food.servings.length > 1 ? (
        <View style={{ gap: spacing.xs }}>
          <Text variant="label" tone="muted">
            Serving
          </Text>
          <SegmentedControl
            accessibilityLabel="Serving"
            options={food.servings.map((s, i) => ({ value: String(i), label: s.label }))}
            value={String(servingIndex)}
            onChange={(value) => setServingIndex(Number(value))}
            wrap
          />
        </View>
      ) : null}
      <TextField
        label={`Amount (× ${serving?.label ?? 'serving'})`}
        value={quantityText}
        onChangeText={setQuantityText}
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
          value={meal}
          onChange={setMeal}
        />
      </View>
      {error ? <Text tone="danger">{error}</Text> : null}
      <Button title="Log it" onPress={handleLog} loading={addLog.isPending} />
      {/* Only user_recipe foods are editable (canEditFood); there's no recipe editor yet, so no
          other food shows edit controls. */}
      {canDeleteFood(food, userId) ? (
        <Button
          title="Delete from My Foods"
          variant="ghost"
          onPress={handleDelete}
          loading={deleteFood.isPending}
        />
      ) : null}
      {deleteFood.error ? <Text tone="danger">{deleteFood.error.message}</Text> : null}
    </>
  );
}

export default function FoodDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const food = useFood(id);
  const userId = useAuth().user?.id;

  return (
    <Screen scroll edges={['bottom', 'left', 'right']}>
      <QueryStatus
        loading={food.isPending}
        error={food.error}
        onRetry={() => void food.refetch()}
      />
      {!food.isPending && !food.error && !food.data ? (
        <Text tone="muted">We couldn&apos;t find this food.</Text>
      ) : null}
      {food.data && userId ? <LogFoodForm food={food.data} userId={userId} /> : null}
    </Screen>
  );
}
