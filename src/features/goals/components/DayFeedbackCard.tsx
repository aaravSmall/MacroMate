import Ionicons from '@expo/vector-icons/Ionicons';
import { type ReactNode, useEffect, useState } from 'react';
import { AccessibilityInfo, Animated } from 'react-native';

import { Text } from '@/components/ui';
import type { DietaryPrefs } from '@/lib/dietary';
import { useTheme } from '@/theme';

import { NEAR_GOAL_CELEBRATION, UNDER_GOAL_NUDGE } from '../copy';
import type { DayFeedback } from '../logic/assessments';
import { snackIdeasFor } from '../snackIdeas';
import { CareNotice } from './CareNotice';

/**
 * End-of-day feedback. Near goal: a small celebration with a gentle entrance (skipped with
 * Reduce Motion). Under: a caring nudge with snack ideas filtered by the user's
 * allergies and restrictions. Nothing otherwise; over target never gets negative copy.
 */
export function DayFeedbackCard({
  feedback,
  prefs,
  celebration = NEAR_GOAL_CELEBRATION,
}: {
  feedback: DayFeedback;
  prefs: DietaryPrefs;
  /** Celebration copy; numbers-off mode celebrates habits instead of the calorie goal. */
  celebration?: { title: string; message: string };
}) {
  const { colors, spacing } = useTheme();

  if (feedback === 'celebrate') {
    return (
      <Celebration>
        <CareNotice {...celebration} showHelpLink={false}>
          <Ionicons
            name="sparkles"
            size={20}
            color={colors.accent}
            accessibilityElementsHidden
            style={{ marginTop: spacing.xs }}
          />
        </CareNotice>
      </Celebration>
    );
  }

  if (feedback === 'gentle_nudge') {
    const ideas = snackIdeasFor(prefs);
    return (
      <CareNotice {...UNDER_GOAL_NUDGE} showHelpLink={false}>
        {ideas.map((idea) => (
          <Text key={idea.name} variant="callout" tone="muted">
            • {idea.name} (~{idea.approxCalories} cal)
          </Text>
        ))}
        {prefs.allergies.length > 0 ? (
          <Text variant="caption" tone="muted">
            Ingredients vary by brand, so check labels for your allergies.
          </Text>
        ) : null}
      </CareNotice>
    );
  }

  return null;
}

/** Fades and gently scales its children in once. Skipped when Reduce Motion is on. */
function Celebration({ children }: { children: ReactNode }) {
  const [progress] = useState(() => new Animated.Value(0));
  useEffect(() => {
    let cancelled = false;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled) return;
      if (reduce) progress.setValue(1);
      else Animated.spring(progress, { toValue: 1, friction: 6, useNativeDriver: true }).start();
    });
    return () => {
      cancelled = true;
    };
  }, [progress]);
  return (
    <Animated.View
      style={{
        opacity: progress,
        transform: [
          { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}
