import { Pressable, View } from 'react-native';

import { Divider, Text } from '@/components/ui';
import { formatGrams, formatKcal } from '@/lib/format';
import { useTheme } from '@/theme';
import type { MacroTargets } from '@/types/domain';

import type { DailySummary } from '../logic/dailySummary';

/** One habit row for numbers-off mode (see goals/logic/habits). */
export type SummaryHabit = {
  id: string;
  label: string;
  detail: string;
  fraction: number;
  done: boolean;
};

export type SummaryCardProps = {
  summary: DailySummary;
  macroTargets: MacroTargets;
  expanded: boolean;
  onToggle: () => void;
  numbersOff: boolean;
  itemCount: number;
  /** Shown instead of calories in numbers-off mode. */
  habits?: readonly SummaryHabit[];
};

function HabitRow({ habit }: { habit: SummaryHabit }) {
  const { colors, radii, spacing } = useTheme();
  return (
    <View style={{ gap: spacing.xs }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text variant="callout">
          {habit.done ? '✓ ' : ''}
          {habit.label}
        </Text>
        <Text variant="callout" tone="muted">
          {habit.detail}
        </Text>
      </View>
      <View
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: Math.round(habit.fraction * 100) }}
        style={{ height: 6, borderRadius: radii.sm, backgroundColor: colors.surfaceMuted }}
      >
        <View
          style={{
            width: `${Math.round(habit.fraction * 100)}%`,
            height: 6,
            borderRadius: radii.sm,
            backgroundColor: colors.accent,
          }}
        />
      </View>
    </View>
  );
}

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
  habits = [],
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
    // Habits instead of calories. Macros stay available by choice; calories never show here.
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityHint={expanded ? 'Hides macros' : 'Shows macros'}
        onPress={onToggle}
        style={container}
      >
        <Text variant="subheading">Today&apos;s habits</Text>
        {habits.length > 0 ? (
          habits.map((habit) => <HabitRow key={habit.id} habit={habit} />)
        ) : (
          <Text variant="callout" tone="muted">
            {itemCount === 1 ? '1 item logged' : `${itemCount} items logged`}. Pick habits to track
            in Settings.
          </Text>
        )}
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
          </View>
        ) : (
          <Text variant="caption" tone="muted" align="center">
            Tap for macros
          </Text>
        )}
      </Pressable>
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
