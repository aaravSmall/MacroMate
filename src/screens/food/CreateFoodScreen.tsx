import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, Card, Screen, SwitchRow, Text, TextField } from '@/components/ui';
import {
  EMPTY_FOOD_FORM,
  type FoodFormErrors,
  type FoodFormValues,
  parseFoodForm,
  useCreateFood,
  useLabelScanStore,
} from '@/features/food';
import { useTheme } from '@/theme';

type FieldConfig = { field: keyof FoodFormValues; label: string; placeholder?: string };

const NUTRITION_FIELDS: FieldConfig[] = [
  { field: 'calories', label: 'Calories' },
  { field: 'protein', label: 'Protein (g)' },
  { field: 'carbs', label: 'Carbs (g)' },
  { field: 'fat', label: 'Fat (g)' },
];

const MICRO_FIELDS: FieldConfig[] = [
  { field: 'fiber', label: 'Fiber (g)' },
  { field: 'sugar', label: 'Total sugars (g)' },
  { field: 'addedSugar', label: 'Added sugars (g)' },
  { field: 'saturatedFat', label: 'Saturated fat (g)' },
  { field: 'transFat', label: 'Trans fat (g)' },
  { field: 'sodium', label: 'Sodium (mg)' },
  { field: 'cholesterol', label: 'Cholesterol (mg)' },
  { field: 'vitaminD', label: 'Vitamin D (mcg)' },
  { field: 'calcium', label: 'Calcium (mg)' },
  { field: 'iron', label: 'Iron (mg)' },
  { field: 'potassium', label: 'Potassium (mg)' },
  { field: 'magnesium', label: 'Magnesium (mg)' },
  { field: 'zinc', label: 'Zinc (mg)' },
];

const CHECK_HINT = 'Check this against your label.';

export default function CreateFoodScreen() {
  const { spacing } = useTheme();
  const { source } = useLocalSearchParams<{ source?: string }>();
  const scanned = source === 'label_scan';
  // A scanned label prefills the form once; the photo itself was never kept.
  const [prefill] = useState(() => (scanned ? useLabelScanStore.getState().take() : null));
  const [values, setValues] = useState<FoodFormValues>(prefill?.values ?? EMPTY_FOOD_FORM);
  const [review, setReview] = useState(() => new Set(prefill?.needsReview ?? []));
  const [errors, setErrors] = useState<FoodFormErrors>({});
  const createFood = useCreateFood();

  const set = (field: keyof FoodFormValues) => (text: string) => {
    setValues((v) => ({ ...v, [field]: text }));
    // Editing a highlighted field counts as checking it.
    setReview((r) => {
      if (!r.has(field)) return r;
      const next = new Set(r);
      next.delete(field);
      return next;
    });
  };

  async function handleSave() {
    const parsed = parseFoodForm(values, { source: scanned ? 'label_scan' : 'user_product' });
    if (!parsed.ok) {
      setErrors(parsed.errors);
      return;
    }
    setErrors({});
    try {
      const food = await createFood.mutateAsync(parsed.input);
      router.replace({ pathname: '/food-detail/[id]', params: { id: food.id } });
    } catch {
      // Shown from createFood.error.
    }
  }

  const fieldProps = (field: keyof FoodFormValues) => ({
    value: values[field],
    onChangeText: set(field),
    error: errors[field],
    highlight: review.has(field),
    hint: review.has(field) && field !== 'name' ? CHECK_HINT : undefined,
  });

  const numberField = ({ field, label, placeholder }: FieldConfig) => (
    <View key={field} style={{ flexBasis: '47%', flexGrow: 1 }}>
      <TextField
        label={label}
        placeholder={placeholder ?? '0'}
        keyboardType="decimal-pad"
        {...fieldProps(field)}
      />
    </View>
  );

  return (
    <Screen scroll edges={['bottom', 'left', 'right']}>
      {scanned && prefill ? (
        <Card>
          <Text variant="subheading">Check the scan</Text>
          <Text variant="callout" tone="muted">
            We read your label on this device. Highlighted fields were hard to read or missing, so
            compare them with the package. Add a name, then save.
          </Text>
        </Card>
      ) : (
        <Text tone="muted">
          Saved privately to your My Foods. Enter nutrition per serving, as printed on the label.
        </Text>
      )}
      <TextField
        label="Name"
        placeholder="e.g. Homemade granola"
        autoFocus={scanned}
        {...fieldProps('name')}
      />
      <TextField label="Brand (optional)" {...fieldProps('brand')} />
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <View style={{ flex: 1 }}>
          <TextField
            label="Serving size"
            keyboardType="decimal-pad"
            {...fieldProps('servingSize')}
          />
        </View>
        <View style={{ flex: 1 }}>
          <TextField
            label="Unit"
            placeholder="g, cup, piece"
            autoCapitalize="none"
            {...fieldProps('servingUnit')}
          />
        </View>
      </View>

      <Text variant="subheading">Nutrition per serving</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
        {NUTRITION_FIELDS.map(numberField)}
      </View>
      <Text variant="subheading">More from the label (optional)</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
        {MICRO_FIELDS.map(numberField)}
      </View>

      <Card>
        <SwitchRow
          label="Share to global database"
          description="Coming soon: let others find this food too."
          value={false}
          onValueChange={() => {}}
          disabled
        />
      </Card>

      {createFood.error ? <Text tone="danger">{createFood.error.message}</Text> : null}
      <Button title="Save food" onPress={handleSave} loading={createFood.isPending} />
    </Screen>
  );
}
