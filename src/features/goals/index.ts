export { CareNotice, type CareNoticeProps } from './components/CareNotice';
export {
  NEAR_GOAL_CELEBRATION,
  paceCautionCopy,
  refuelCopy,
  targetRecommendationCopy,
  UNDER_GOAL_NUDGE,
} from './copy';
export {
  assessDayStatus,
  assessPace,
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
export { SNACK_IDEAS, type SnackIdea } from './snackIdeas';
export { useActiveGoal, useChangeGoal } from './hooks/useGoal';
export {
  changeGoal,
  type ChangeGoalArgs,
  getActiveGoal,
  goalToChangeGoalArgs,
  mapGoalRow,
  type NewGoal,
} from './services/goalService';
