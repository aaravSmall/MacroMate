export { CareNotice, type CareNoticeProps } from './components/CareNotice';
export { DayFeedbackCard } from './components/DayFeedbackCard';
export {
  NEAR_GOAL_CELEBRATION,
  paceCautionCopy,
  targetRecommendationCopy,
  UNDER_GOAL_NUDGE,
} from './copy';
export {
  assessDayStatus,
  assessPace,
  endOfDayFeedback,
  type DayFeedback,
  type DayStatus,
  feedbackForDayStatus,
  type PaceAssessment,
} from './logic/assessments';
export {
  ACTIVITY_MULTIPLIERS,
  type BodyStats,
  calculateBMR,
  calculateDailyTarget,
  calculateTDEE,
  calorieFloorFor,
  type DailyTarget,
  isBelowRecommendedFloor,
  KCAL_PER_LB,
} from './logic/energy';
export { buildGoalChange, type GoalChange, type GoalChangeInput } from './logic/goalChange';
export {
  allHabitsMet,
  HABIT_CELEBRATION,
  type HabitProgress,
  habitProgress,
  MEALS_LOGGED_TARGET,
} from './logic/habits';
export { DEFAULT_MACRO_SPLIT, defaultMacroTargets, KCAL_PER_GRAM } from './logic/macros';
export {
  ageFromBirthDate,
  cmToIn,
  inToCm,
  kgToLb,
  lbToKg,
  type WeeklyRate,
  weeklyRateInKg,
  weeklyRateInLb,
} from './logic/units';
export { SNACK_IDEAS, type SnackIdea, snackIdeasFor } from './snackIdeas';
export { useActiveGoal, useChangeGoal } from './hooks/useGoal';
export {
  changeGoal,
  type ChangeGoalArgs,
  getActiveGoal,
  goalToChangeGoalArgs,
  mapGoalRow,
  type NewGoal,
} from './services/goalService';
