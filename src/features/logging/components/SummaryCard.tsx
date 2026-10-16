import { Pressable, View } from 'react-native';

import { Divider, Text } from '@/components/ui';
import { formatGrams, formatKcal } from '@/lib/format';
import { useTheme } from '@/theme';
import type { MacroTargets } from '@/types/domain';

import type { DailySummary } from '../logic/dailySummary';

export type SummaryCardProps = {
  summary: DailySummary;
  macroTargets: MacroTargets;
  expanded: boolean;
  onToggle: () => void;
  numbersOff: boolean;
  itemCount: number;
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text variant="heading">{value}</Text>
      <Text variant="caption" tone="muted">
        {label}
      </Text>
    </View>
  );
}

function MacroRow({
  label,
  value,
  target,
}: {
  label: string;
  value: number;
  target: number | null;
}) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text variant="callout">{label}</Text>
      <Text variant="callout" tone="muted">
        {formatGrams(value)}
        {target !== null ? ` / ${formatGrams(target)}` : ''}
      </Text>
    </View>
  );
}

/** Eaten / remaining / burned, expanding to macros. Colors stay neutral whatever the numbers. */
export function SummaryCard({
  summary,
  macroTargets,
  expanded,
  onToggle,
  numbersOff,
  itemCount,
}: SummaryCardProps) {
  const { colors, radii, spacing } = useTheme();
  const container = {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
  };

  if (numbersOff) {
    return (
      <View style={container}>
        <Text variant="subheading">Numbers are off</Text>
        <Text variant="callout" tone="muted">
          {itemCount === 1 ? '1 item logged' : `${itemCount} items logged`}. Turn numbers back on in
          Settings anytime.
        </Text>
      </View>
    );
  }

  const over = summary.remaining < 0;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded }}
      accessibilityHint={expanded ? 'Hides macros' : 'Shows macros'}
      onPress={onToggle}
      style={container}
    >
      <View style={{ flexDirection: 'row' }}>
        <Stat label="Eaten" value={formatKcal(summary.eaten)} />
        <Stat
          label={over ? 'Over budget' : 'Remaining'}
          value={formatKcal(Math.abs(summary.remaining))}
        />
        <Stat label="Burned" value={formatKcal(summary.burned)} />
      </View>
      {expanded ? (
        <View style={{ gap: spacing.sm }}>
          <Divider />
          <MacroRow
            label="Protein"
            value={summary.macros.proteinG}
            target={macroTargets.proteinG}
          />
          <MacroRow label="Carbs" value={summary.macros.carbsG} target={macroTargets.carbsG} />
          <MacroRow label="Fat" value={summary.macros.fatG} target={macroTargets.fatG} />
          <Text variant="caption" tone="muted">
            Budget {formatKcal(summary.budget)} = target {formatKcal(summary.target)} + burned{' '}
            {formatKcal(summary.burned)}
          </Text>
        </View>
      ) : (
        <Text variant="caption" tone="muted" align="center">
          Tap for macros
        </Text>
      )}
    </Pressable>
  );
}
