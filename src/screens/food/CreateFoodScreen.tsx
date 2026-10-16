import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, Card, Screen, SwitchRow, Text, TextField } from '@/components/ui';
import {
  EMPTY_FOOD_FORM,
  type FoodFormErrors,
  type FoodFormValues,
  parseFoodForm,
  useCreateUserFood,
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
  { field: 'sugar', label: 'Sugar (g)' },
  { field: 'saturatedFat', label: 'Saturated fat (g)' },
  { field: 'sodium', label: 'Sodium (mg)' },
  { field: 'cholesterol', label: 'Cholesterol (mg)' },
];

export default function CreateFoodScreen() {
  const { spacing } = useTheme();
  const [values, setValues] = useState<FoodFormValues>(EMPTY_FOOD_FORM);
  const [errors, setErrors] = useState<FoodFormErrors>({});
  const createFood = useCreateUserFood();

  const set = (field: keyof FoodFormValues) => (text: string) =>
    setValues((v) => ({ ...v, [field]: text }));

  async function handleSave() {
    const parsed = parseFoodForm(values);
    if (!parsed.ok) {
      setErrors(parsed.errors);
      return;
    }
    setErrors({});
    const food = await createFood.mutateAsync(parsed.input);
    router.replace({ pathname: '/food-detail/[id]', params: { id: food.id, kind: 'userFood' } });
  }

  const numberField = ({ field, label, placeholder }: FieldConfig) => (
    <View key={field} style={{ flexBasis: '47%', flexGrow: 1 }}>
      <TextField
        label={label}
        placeholder={placeholder ?? '0'}
        value={values[field]}
        onChangeText={set(field)}
        keyboardType="decimal-pad"
        error={errors[field]}
      />
    </View>
  );

  return (
    <Screen scroll edges={['bottom', 'left', 'right']}>
      <Text tone="muted">Saved to your My Foods. Nutrition is per serving.</Text>
      <TextField
        label="Name"
        placeholder="e.g. Homemade granola"
        value={values.name}
        onChangeText={set('name')}
        error={errors.name}
      />
      <TextField label="Brand (optional)" value={values.brand} onChangeText={set('brand')} />
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <View style={{ flex: 1 }}>
          <TextField
            label="Serving size"
            value={values.servingSize}
            onChangeText={set('servingSize')}
            keyboardType="decimal-pad"
            error={errors.servingSize}
          />
        </View>
        <View style={{ flex: 1 }}>
          <TextField
            label="Unit"
            placeholder="g, cup, piece"
            value={values.servingUnit}
            onChangeText={set('servingUnit')}
            autoCapitalize="none"
            error={errors.servingUnit}
          />
        </View>
      </View>

      <Text variant="subheading">Nutrition</Text>
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
