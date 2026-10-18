import Ionicons from '@expo/vector-icons/Ionicons';
import { Modal, Pressable, ScrollView, View } from 'react-native';

import { Button, Text } from '@/components/ui';
import { PORTION_GROUP_TITLES, PORTION_GUIDES, type PortionGuide } from '@/constants/portionGuides';
import { useTheme } from '@/theme';
import type { Food, FoodServing } from '@/types/domain';

import { applicableGuides } from '../logic/portion';

export type PortionGuideSheetProps = {
  visible: boolean;
  food: Pick<Food, 'baseAmount' | 'baseUnit' | 'name'>;
  serving: Pick<FoodServing, 'label' | 'baseMultiplier'>;
  onPick: (quantity: number) => void;
  onClose: () => void;
};

const GROUPS: PortionGuide['group'][] = ['weight', 'volume', 'plate'];

/** Visual references for estimating an amount without a scale. A guide, not a measurement. */
export function PortionGuideSheet({
  visible,
  food,
  serving,
  onPick,
  onClose,
}: PortionGuideSheetProps) {
  const { colors, radii, spacing } = useTheme();
  const options = applicableGuides(PORTION_GUIDES, food, serving);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}
      >
        <View style={{ gap: spacing.xs }}>
          <Text variant="title">Not sure how much?</Text>
          <Text tone="muted">
            Pick what your portion looks like. It&apos;s a rough guide (hands and plates vary), and
            you can adjust the amount after.
          </Text>
        </View>

        {options.length === 0 ? (
          <Text tone="muted">
            We can&apos;t convert visual guides for “{serving.label}”. Estimate the number of
            servings instead.
          </Text>
        ) : null}

        {GROUPS.map((group) => {
          const items = options.filter((o) => o.guide.group === group);
          if (items.length === 0) return null;
          return (
            <View key={group} style={{ gap: spacing.xs }}>
              <Text variant="label" tone="muted">
                {PORTION_GROUP_TITLES[group]}
              </Text>
              {items.map(({ guide, quantity }) => (
                <Pressable
                  key={guide.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${guide.label}, ${guide.amountText}, about ${quantity} × ${serving.label}`}
                  onPress={() => onPick(quantity)}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.md,
                    padding: spacing.md,
                    borderRadius: radii.md,
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: radii.pill,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: colors.accentMuted,
                    }}
                  >
                    <Ionicons name={guide.icon} size={22} color={colors.accent} />
                  </View>
                  <View style={{ flex: 1, gap: spacing.xxs }}>
                    <Text variant="callout">{guide.label}</Text>
                    <Text variant="caption" tone="muted">
                      {guide.amountText}
                    </Text>
                  </View>
                  <Text variant="callout" tone="accent">
                    ≈ {quantity} ×
                  </Text>
                </Pressable>
              ))}
            </View>
          );
        })}

        <Text variant="caption" tone="muted">
          References from NIH (NHLBI), the Academy of Nutrition and Dietetics, and USDA MyPlate.
          Amounts are approximate.
        </Text>
        <Button title="Close" variant="ghost" onPress={onClose} />
      </ScrollView>
    </Modal>
  );
}
