/**
 * All TanStack Query keys, in one place. Keys are hierarchical so that invalidating a prefix
 * (e.g. `queryKeys.logs.all`) refreshes everything beneath it. The cache is cleared on
 * sign-out, so keys don't need to include the user id.
 */
export const queryKeys = {
  foods: {
    all: ['foods'] as const,
    searchAll: ['foods', 'search'] as const,
    search: (query: string) => ['foods', 'search', query] as const,
    detail: (id: string) => ['foods', 'detail', id] as const,
    verification: (id: string) => ['foods', 'verification', id] as const,
  },
  logs: {
    all: ['logs'] as const,
    day: (dateKey: string) => ['logs', 'day', dateKey] as const,
    detail: (id: string) => ['logs', 'detail', id] as const,
    totals: (dateKey: string) => ['logs', 'totals', dateKey] as const,
    streak: (timezone: string) => ['logs', 'streak', timezone] as const,
    streakAll: ['logs', 'streak'] as const,
    loggedDaysAll: ['logs', 'loggedDays'] as const,
    loggedDays: (fromKey: string, toKey: string) => ['logs', 'loggedDays', fromKey, toKey] as const,
  },
  exercise: {
    all: ['exercise'] as const,
    day: (dateKey: string) => ['exercise', 'day', dateKey] as const,
  },
  health: {
    connection: (userId: string) => ['health', 'connection', userId] as const,
  },
  reminders: {
    state: (userId: string) => ['reminders', 'state', userId] as const,
  },
  weighIns: {
    all: ['weighIns'] as const,
    list: () => ['weighIns', 'list'] as const,
  },
  profile: {
    all: ['profile'] as const,
    detail: (userId: string) => ['profile', userId] as const,
  },
  goals: {
    all: ['goals'] as const,
    active: (userId: string) => ['goals', 'active', userId] as const,
  },
} as const;
