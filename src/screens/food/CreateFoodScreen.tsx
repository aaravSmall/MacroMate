import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';

import { QueryStatus } from '@/components/QueryStatus';
import {
  Button,
  Card,
  Screen,
  SegmentedControl,
  SwitchRow,
  Text,
  TextField,
} from '@/components/ui';
import { useAuth } from '@/features/auth';
import {
  canEditFood,
  EMPTY_FOOD_FORM,
  type FoodFormErrors,
  type FoodFormValues,
  foodToFormValues,
  parseFoodForm,
  useCreateFood,
  useFood,
  useLabelScanStore,
  useUpdateFood,
} from '@/features/food';
import { useTheme } from '@/theme';
import type { Food } from '@/types/domain';

type Kind = 'product' | 'recipe';

const KIND_OPTIONS: { value: Kind; label: string }[] = [
  { value: 'product', label: 'Packaged product' },
  { value: 'recipe', label: 'Meal I made' },
];

/** Before saving a public recipe: its label checks reset because the nutrition changed. */
function confirmResetChecks(food: Food): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      'Reset label checks?',
      `${food.name} is shared, and ${food.verificationCount + food.mismatchCount} label checks will reset because the nutrition changed. Past logs don't change.`,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Save changes', onPress: () => resolve(true) },
      ],
    );
  });
}

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

/** Create a food (product, meal, or scanned label), or `?edit=<id>` to edit one of your recipes. */
export default function CreateFoodScreen() {
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  return edit ? <EditRecipe id={edit} /> : <FoodForm />;
}

function EditRecipe({ id }: { id: string }) {
  const food = useFood(id);
  const userId = useAuth().user?.id;
  if (!food.data) {
    return (
      <Screen scroll edges={['bottom', 'left', 'right']}>
        <QueryStatus
          loading={food.isPending}
          error={food.error}
          onRetry={() => void food.refetch()}
        />
        {!food.isPending && !food.error ? (
          <Text tone="muted">We couldn&apos;t find this food.</Text>
        ) : null}
      </Screen>
    );
  }
  if (!userId || !canEditFood(food.data, userId)) {
    return (
      <Screen scroll edges={['bottom', 'left', 'right']}>
        <Text tone="muted">
          Only meals you made can be edited. Packaged and scanned foods keep their label values.
        </Text>
      </Screen>
    );
  }
  return <FoodForm editing={food.data} />;
}

function FoodForm({ editing }: { editing?: Food }) {
  const { spacing } = useTheme();
  const { source } = useLocalSearchParams<{ source?: string }>();
  const scanned = !editing && source === 'label_scan';
  // A scanned label prefills the form once; the photo itself was never kept.
  const [prefill] = useState(() => (scanned ? useLabelScanStore.getState().take() : null));
  const [values, setValues] = useState<FoodFormValues>(() =>
    editing ? foodToFormValues(editing) : (prefill?.values ?? EMPTY_FOOD_FORM),
  );
  const [review, setReview] = useState(() => new Set(prefill?.needsReview ?? []));
  const [errors, setErrors] = useState<FoodFormErrors>({});
  const [kind, setKind] = useState<Kind>(editing ? 'recipe' : 'product');
  const createFood = useCreateFood();
  const updateFood = useUpdateFood();
  const saving = createFood.isPending || updateFood.isPending;
  const saveError = createFood.error ?? updateFood.error;

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
    const source =
      editing || kind === 'recipe' ? 'user_recipe' : scanned ? 'label_scan' : 'user_product';
    const parsed = parseFoodForm(values, { source });
    if (!parsed.ok) {
      setErrors(parsed.errors);
      return;
    }
    setErrors({});
    try {
      if (editing) {
        if (editing.visibility === 'public' && !(await confirmResetChecks(editing))) return;
        await updateFood.mutateAsync({ food: editing, input: parsed.input });
        router.back();
        return;
      }
      const food = await createFood.mutateAsync(parsed.input);
      router.replace({ pathname: '/food-detail/[id]', params: { id: food.id } });
    } catch {
      // Shown from the mutation's error state.
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

  const recipe = !!editing || kind === 'recipe';
  return (
    <Screen scroll edges={['bottom', 'left', 'right']}>
      {editing ? <Stack.Screen options={{ title: 'Edit meal' }} /> : null}
      {!editing && !scanned ? (
        <SegmentedControl
          accessibilityLabel="What are you adding?"
          options={KIND_OPTIONS}
          value={kind}
          onChange={setKind}
        />
      ) : null}
      {scanned && prefill ? (
        <Card>
          <Text variant="subheading">Check the scan</Text>
          <Text variant="callout" tone="muted">
            We read your label on this device. Highlighted fields were hard to read or missing, so
            compare them with the package. Add a name, then save.
          </Text>
        </Card>
      ) : recipe ? (
        <Text tone="muted">
          {editing
            ? 'Update this meal. Entries you already logged keep the nutrition they had.'
            : 'Something you cooked or put together. Enter nutrition for one serving; you can edit it later.'}
        </Text>
      ) : (
        <Text tone="muted">
          Saved privately to your My Foods. Enter nutrition per serving, as printed on the label.
          Packaged foods keep their label values, so they can&apos;t be edited later.
        </Text>
      )}
      <TextField
        label="Name"
        placeholder={recipe ? 'e.g. Chicken stir-fry' : 'e.g. Greek yogurt'}
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

      {saveError ? <Text tone="danger">{saveError.message}</Text> : null}
      <Button
        title={editing ? 'Save changes' : recipe ? 'Save meal' : 'Save food'}
        onPress={handleSave}
        loading={saving}
      />
    </Screen>
  );
}
