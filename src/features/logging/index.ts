export { LoggingCalendar, type LoggingCalendarProps } from './components/LoggingCalendar';
export { SummaryCard, type SummaryCardProps } from './components/SummaryCard';
export { TimelineRow, type TimelineRowProps } from './components/TimelineRow';
export {
  useAddLog,
  useDailyTotals,
  useDayLogs,
  useDeleteLog,
  useLog,
  useLoggedDays,
  useLongestStreak,
  useStreak,
  useUpdateLog,
} from './hooks/useLogs';
export { computeDailySummary, type DailySummary } from './logic/dailySummary';
export { groupByMeal } from './logic/groupByMeal';
export { MEAL_LABEL_NAMES, MEAL_LABELS, MEAL_WINDOWS, suggestMealType } from './logic/mealLabel';
export {
  buildLogEntry,
  buildLogInsert,
  type NewLogInput,
  portionNutrition,
  rescaleTotals,
} from './logic/snapshot';
export { currentStreak, longestStreak } from './logic/streak';
export {
  addLog,
  deleteLog,
  getCurrentStreak,
  getLongestStreak,
  getDailyTotals,
  getLog,
  getLoggedDateKeys,
  getLogsForDay,
  type LogUpdate,
  mapDailyTotalsRow,
  mapLogRow,
  updateLog,
} from './services/logService';
