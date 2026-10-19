import { useMemo, useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { EmptyState, SegmentedControl, SwitchRow, Text } from '@/components/ui';
import { formatWeight } from '@/lib/format';
import { useTheme } from '@/theme';
import type { UnitSystem, WeighIn } from '@/types/domain';

import {
  chartScale,
  linePath,
  movingAverage,
  pointsInRange,
  TREND_RANGES,
  TREND_WINDOW_DAYS,
  type TrendRange,
} from '../logic/trend';

const CHART_HEIGHT = 180;

const formatDate = (time: number) =>
  new Date(time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

/**
 * Weigh-ins over time with range toggles, an optional moving-average trend line, and the goal
 * weight as a dashed reference line. Neutral colors only: no up/down good/bad styling.
 */
export function WeightTrendChart({
  weighIns,
  goalKg,
  units,
  onAddFirst,
}: {
  weighIns: readonly WeighIn[];
  goalKg: number | null;
  units: UnitSystem;
  onAddFirst: () => void;
}) {
  const { colors, spacing } = useTheme();
  const [range, setRange] = useState<TrendRange>('3M');
  const [showTrend, setShowTrend] = useState(true);
  const [width, setWidth] = useState(0);

  const now = useMemo(() => new Date(), []);
  const points = useMemo(() => pointsInRange(weighIns, range, now), [weighIns, range, now]);
  // Average over all weigh-ins, then trim, so a range's first points still use the days before it.
  const trend = useMemo(() => {
    const first = points[0];
    if (!first) return [];
    return movingAverage(pointsInRange(weighIns, 'All', now)).filter((p) => p.time >= first.time);
  }, [weighIns, points, now]);

  if (weighIns.length === 0) {
    return (
      <EmptyState
        icon="analytics-outline"
        title="Your trend starts with one weigh-in"
        description="Add your weight whenever it suits you. Over time you'll see a gentle trend here, not the daily ups and downs."
        actionLabel="Add a weigh-in"
        onAction={onAddFirst}
      />
    );
  }

  const scale = width > 0 ? chartScale(points, { width, height: CHART_HEIGHT, goalKg }) : null;
  const first = points[0];
  const last = points[points.length - 1];

  return (
    <View style={{ gap: spacing.sm }}>
      <SegmentedControl
        accessibilityLabel="Time range"
        options={TREND_RANGES.map((r) => ({ value: r, label: r }))}
        value={range}
        onChange={(value) => setRange(value as TrendRange)}
      />

      {points.length === 0 ? (
        <Text variant="callout" tone="muted">
          No weigh-ins in this range. Try a longer one.
        </Text>
      ) : (
        <View
          onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
          accessible
          accessibilityLabel={`Weight chart, ${points.length} weigh-ins from ${
            first ? formatDate(first.time) : ''
          } to ${last ? formatDate(last.time) : ''}. Latest ${
            last ? formatWeight(last.weightKg, units) : ''
          }.`}
        >
          {scale ? (
            <>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text variant="caption" tone="muted">
                  {formatWeight(scale.maxKg, units)}
                </Text>
              </View>
              <Svg width={width} height={CHART_HEIGHT}>
                {goalKg !== null ? (
                  <Line
                    x1={0}
                    x2={width}
                    y1={scale.y(goalKg)}
                    y2={scale.y(goalKg)}
                    stroke={colors.textMuted}
                    strokeWidth={1}
                    strokeDasharray="6 4"
                  />
                ) : null}
                {showTrend ? null : (
                  <Path
                    d={linePath(points, scale)}
                    stroke={colors.border}
                    strokeWidth={1.5}
                    fill="none"
                  />
                )}
                {points.map((p) => (
                  <Circle
                    key={p.time}
                    cx={scale.x(p.time)}
                    cy={scale.y(p.weightKg)}
                    r={3}
                    fill={colors.logged}
                  />
                ))}
                {showTrend && trend.length > 1 ? (
                  <Path
                    d={linePath(trend, scale)}
                    stroke={colors.accent}
                    strokeWidth={2.5}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : null}
              </Svg>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text variant="caption" tone="muted">
                  {formatWeight(scale.minKg, units)}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text variant="caption" tone="muted">
                  {formatDate(scale.minTime)}
                </Text>
                <Text variant="caption" tone="muted">
                  {formatDate(scale.maxTime)}
                </Text>
              </View>
            </>
          ) : (
            <View style={{ height: CHART_HEIGHT }} />
          )}
        </View>
      )}

      {goalKg !== null ? (
        <Text variant="caption" tone="muted">
          Dashed line: goal weight, {formatWeight(goalKg, units)}
        </Text>
      ) : null}
      <SwitchRow
        label="Show trend line"
        description={`A ${TREND_WINDOW_DAYS}-day average, so daily ups and downs don't dominate.`}
        value={showTrend}
        onValueChange={setShowTrend}
      />
    </View>
  );
}
