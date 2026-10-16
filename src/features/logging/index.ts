export { LoggingCalendar, type LoggingCalendarProps } from './components/LoggingCalendar';
export { SummaryCard, type SummaryCardProps } from './components/SummaryCard';
export { TimelineRow, type TimelineRowProps } from './components/TimelineRow';
export {
  useAddLog,
  useDayLogs,
  useDeleteLog,
  useLog,
  useLoggedDays,
  useUpdateLog,
} from './hooks/useLogs';
export { computeDailySummary, type DailySummary } from './logic/dailySummary';
export { groupByMeal } from './logic/groupByMeal';
export { MEAL_LABEL_NAMES, MEAL_LABELS, MEAL_WINDOWS, suggestMealLabel } from './logic/mealLabel';
export { buildLogEntry, type NewLogInput } from './logic/snapshot';
export { currentStreak } from './logic/streak';
export {
  addLog,
  deleteLog,
  getLog,
  getLoggedDateKeys,
  getLogsForDay,
  type LogUpdate,
  mapLogRow,
  updateLog,
} from './services/logService';
