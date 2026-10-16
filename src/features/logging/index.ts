export { useAddLog, useDayLogs, useDeleteLog, useUpdateLog } from './hooks/useLogs';
export { computeDailySummary, type DailySummary } from './logic/dailySummary';
export { MEAL_LABEL_NAMES, MEAL_LABELS, MEAL_WINDOWS, suggestMealLabel } from './logic/mealLabel';
export { buildLogEntry, type NewLogInput } from './logic/snapshot';
export {
  addLog,
  deleteLog,
  getLogsForDay,
  type LogUpdate,
  mapLogRow,
  updateLog,
} from './services/logService';
