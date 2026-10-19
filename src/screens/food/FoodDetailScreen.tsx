import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { QueryStatus } from '@/components/QueryStatus';
import { Button, Card, Divider, Screen, SegmentedControl, Text, TextField } from '@/components/ui';
import { useProfile } from '@/features/account';
import { useAuth } from '@/features/auth';
import {
  allergenNotice,
  canDeleteFood,
  canShareFood,
  containsLabel,
  DietaryBadge,
  canEditFood,
  canVerifyFood,
  hasMismatchWarning,
  isUncachedOpenFoodFactsResult,
  LabelCheckCard,
  matchServing,
  PortionGuideSheet,
  ShareFoodSheet,
  useCacheOpenFoodFactsFood,
  useDeleteFood,
  useShareFood,
  useFood,
  useMyVerification,
  useVerifyFood,
  VerificationLine,
} from '@/features/food';
import {
  MEAL_LABEL_NAMES,
  MEAL_LABELS,
  portionNutrition,
  suggestMealType,
  useAddLog,
} from '@/features/logging';
import { diningProviderLabel } from '@/features/dining';
import { toDateKey, toDateKeyInTimeZone } from '@/lib/dates';
import { formatGrams, formatKcal, parseNumber } from '@/lib/format';
import { logTimeForDateKey, useSelectedDateStore } from '@/store/selectedDateStore';
import { useTheme } from '@/theme';
import type { Food, MealType } from '@/types/domain';

const MEAL_OPTIONS = MEAL_LABELS.map((value) => ({ value, label: MEAL_LABEL_NAMES[value] }));

/** Dining foods always show their allergen status and note; others only flagged allergens. */
function AllergenInfo({ food }: { food: Food }) {
  const { spacing } = useTheme();
  const section = allergenNotice(food);
  if (section) {
    return (
      <View
        style={{ gap: spacing.xxs }}
        accessible
        accessibilityLabel={`${section.status}. ${section.note}`}
      >
        <Text variant="callout">{section.status}</Text>
        <Text variant="caption" tone="muted">
          {section.note}
        </Text>
      </View>
    );
  }
  const contains = containsLabel(food);
  return contains ? <Text variant="callout">{contains}</Text> : null;
}

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

const MEAL_TYPES: readonly MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

function LogFoodForm({
  food,
  userId,
  initialMeal,
}: {
  food: Food;
  userId: string;
  initialMeal?: MealType;
}) {
  const { spacing } = useTheme();
  const profile = useProfile();
  const dateKey = useSelectedDateStore((s) => s.dateKey);
  const loggedAt = useMemo(() => logTimeForDateKey(dateKey), [dateKey]);
  const [servingIndex, setServingIndex] = useState(0);
  const [quantityText, setQuantityText] = useState('1');
  const [meal, setMeal] = useState<MealType>(() => initialMeal ?? suggestMealType(loggedAt));
  const [error, setError] = useState<string | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const addLog = useAddLog();
  const deleteFood = useDeleteFood();
  const shareFood = useShareFood();
  const [shareOpen, setShareOpen] = useState(false);
  const cacheFood = useCacheOpenFoodFactsFood();

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

    // A live Open Food Facts result becomes a real global food first, so the entry links to it.
    let target = food;
    let portion = serving;
    if (isUncachedOpenFoodFactsResult(food)) {
      if (!food.externalId) {
        setError("We couldn't save this food. Try another result.");
        return;
      }
      try {
        target = await cacheFood.mutateAsync(food.externalId);
      } catch (e) {
        setError(e instanceof Error ? e.message : "We couldn't save this food right now.");
        return;
      }
      portion = matchServing(target.servings, serving);
    }

    const timezone = profile.data?.timezone;
    try {
      await addLog.mutateAsync({
        food: target,
        serving: portion,
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
        <VerificationLine food={food} showWarning={false} />
        {food.source === 'dining_hall' ? (
          <Text variant="caption" tone="muted">
            Nutrition from {diningProviderLabel(food.provider) ?? 'the dining hall'}
          </Text>
        ) : null}
        {/* Allergens only ever warn; never present a food as safe (see logic/allergens.ts). */}
        <AllergenInfo food={food} />
        {profile.data ? (
          <DietaryBadge
            food={food}
            prefs={{
              allergies: profile.data.allergies,
              restrictions: profile.data.dietaryRestrictions,
            }}
          />
        ) : null}
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

      {verifiable ? (
        <LabelCheckCard
          answer={myVerification.data ?? null}
          pending={verifyFood.isPending}
          onAnswer={(matches) => verifyFood.mutate({ foodId: food.id, matches })}
        />
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
      <Pressable
        accessibilityRole="button"
        onPress={() => setGuideOpen(true)}
        hitSlop={8}
        style={{ alignSelf: 'flex-start' }}
      >
        <Text variant="callout" tone="accent">
          Not sure how much?
        </Text>
      </Pressable>
      {serving ? (
        <PortionGuideSheet
          visible={guideOpen}
          food={food}
          serving={serving}
          onPick={(q) => {
            setQuantityText(String(q));
            setGuideOpen(false);
          }}
          onClose={() => setGuideOpen(false)}
        />
      ) : null}
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
      {cacheFood.isPending ? (
        <Text variant="caption" tone="muted">
          Saving this food so it can be checked and reused…
        </Text>
      ) : null}
      {error ? <Text tone="danger">{error}</Text> : null}
      <Button
        title="Log it"
        onPress={handleLog}
        loading={cacheFood.isPending || addLog.isPending}
      />
      {/* Only the user's own meals (user_recipe) are editable; products keep their label values. */}
      {canEditFood(food, userId) ? (
        <Button
          title="Edit meal"
          variant="secondary"
          onPress={() => router.push({ pathname: '/create-food', params: { edit: food.id } })}
        />
      ) : null}
      {canShareFood(food, userId) ? (
        <Button
          title="Share to public database"
          variant="secondary"
          onPress={() => setShareOpen(true)}
        />
      ) : null}
      <ShareFoodSheet
        visible={shareOpen}
        foodName={food.name}
        sharing={shareFood.isPending}
        error={shareFood.error ? 'We couldn’t share this food. Please try again.' : null}
        onShare={() => shareFood.mutate(food.id, { onSuccess: () => setShareOpen(false) })}
        onClose={() => setShareOpen(false)}
      />
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
  const { id, meal } = useLocalSearchParams<{ id: string; meal?: string }>();
  const initialMeal = MEAL_TYPES.find((m) => m === meal);
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
      {food.data && userId ? (
        <LogFoodForm food={food.data} userId={userId} initialMeal={initialMeal} />
      ) : null}
    </Screen>
  );
}
