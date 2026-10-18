import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';

import { QueryStatus } from '@/components/QueryStatus';
import { Button, Card, Divider, Screen, SegmentedControl, Text, TextField } from '@/components/ui';
import {
  MEAL_LABEL_NAMES,
  MEAL_LABELS,
  useDeleteLog,
  useLog,
  useUpdateLog,
} from '@/features/logging';
import { formatGrams, formatKcal, formatTime, parseNumber } from '@/lib/format';
import { useTheme } from '@/theme';
import type { LogEntry, MealType } from '@/types/domain';

const MEAL_OPTIONS = MEAL_LABELS.map((value) => ({ value, label: MEAL_LABEL_NAMES[value] }));

function formatMicronutrient(key: string, amount: number): { name: string; value: string } {
  const match = /^(.*)_(mg|mcg|g)$/.exec(key);
  const name = (match?.[1] ?? key).replace(/_/g, ' ');
  return {
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value: `${Math.round(amount * 10) / 10} ${match?.[2] ?? ''}`.trim(),
  };
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

function EntryEditor({ entry }: { entry: LogEntry }) {
  const { spacing } = useTheme();
  const [quantity, setQuantity] = useState(String(entry.quantity));
  const [meal, setMeal] = useState<MealType>(entry.meal);
  const [quantityError, setQuantityError] = useState<string | null>(null);
  const updateLog = useUpdateLog();
  const deleteLog = useDeleteLog();

  async function handleSave() {
    const value = parseNumber(quantity);
    if (value === null || value <= 0) {
      setQuantityError('Enter an amount above 0.');
      return;
    }
    setQuantityError(null);
    try {
      await updateLog.mutateAsync({ entry, update: { quantity: value, meal } });
      router.back();
    } catch {
      // Shown from updateLog.error.
    }
  }

  function handleDelete() {
    Alert.alert('Delete this entry?', `${entry.foodName} will be removed from your log.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteLog.mutate(entry);
          router.back();
        },
      },
    ]);
  }

  const micros = Object.entries(entry.totals.micronutrients);
  return (
    <>
      <View style={{ gap: spacing.xxs }}>
        <Text variant="title">{entry.foodName}</Text>
        <Text tone="muted">
          {formatTime(entry.loggedAt)} · {MEAL_LABEL_NAMES[entry.meal]}
        </Text>
      </View>

      <Card>
        <Row label="Calories" value={formatKcal(entry.totals.calories)} />
        <Divider />
        <Row label="Protein" value={formatGrams(entry.totals.proteinG)} />
        <Row label="Carbs" value={formatGrams(entry.totals.carbsG)} />
        <Row label="Fat" value={formatGrams(entry.totals.fatG)} />
        {micros.length > 0 ? <Divider /> : null}
        {micros.map(([key, amount]) => {
          const { name, value } = formatMicronutrient(key, amount);
          return <Row key={key} label={name} value={value} />;
        })}
        <Text variant="caption" tone="muted">
          Saved as logged. Changing the amount scales these numbers.
        </Text>
      </Card>

      <TextField
        label="Amount (× the serving you logged)"
        value={quantity}
        onChangeText={setQuantity}
        keyboardType="decimal-pad"
        error={quantityError}
      />
      <SegmentedControl
        accessibilityLabel="Meal"
        options={MEAL_OPTIONS}
        value={meal}
        onChange={setMeal}
      />
      {updateLog.error ? <Text tone="danger">{updateLog.error.message}</Text> : null}
      <Button title="Save changes" onPress={handleSave} loading={updateLog.isPending} />
      <Button title="Delete entry" variant="ghost" onPress={handleDelete} />
    </>
  );
}

export default function LogEntryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const log = useLog(id);
  return (
    <Screen scroll edges={['bottom', 'left', 'right']}>
      <QueryStatus loading={log.isPending} error={log.error} onRetry={() => void log.refetch()} />
      {log.data === null ? <Text tone="muted">This entry no longer exists.</Text> : null}
      {log.data ? <EntryEditor entry={log.data} /> : null}
    </Screen>
  );
}
