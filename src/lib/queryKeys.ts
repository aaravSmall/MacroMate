/**
 * All TanStack Query keys, in one place. Keys are hierarchical so that invalidating a prefix
 * (e.g. `queryKeys.logs.all`) refreshes everything beneath it. The cache is cleared on
 * sign-out, so keys don't need to include the user id.
 */
export const queryKeys = {
  foods: {
    all: ['foods'] as const,
    search: (query: string) => ['foods', 'search', query] as const,
    detail: (id: string) => ['foods', 'detail', id] as const,
  },
  userFoods: {
    all: ['userFoods'] as const,
    list: () => ['userFoods', 'list'] as const,
  },
  logs: {
    all: ['logs'] as const,
    day: (dateKey: string) => ['logs', 'day', dateKey] as const,
    detail: (id: string) => ['logs', 'detail', id] as const,
    loggedDaysAll: ['logs', 'loggedDays'] as const,
    loggedDays: (fromKey: string, toKey: string) => ['logs', 'loggedDays', fromKey, toKey] as const,
  },
  exercise: {
    all: ['exercise'] as const,
    day: (dateKey: string) => ['exercise', 'day', dateKey] as const,
  },
  weighIns: {
    all: ['weighIns'] as const,
    list: () => ['weighIns', 'list'] as const,
  },
  userSettings: {
    all: ['userSettings'] as const,
    detail: (userId: string) => ['userSettings', userId] as const,
  },
  profile: {
    all: ['profile'] as const,
    detail: (userId: string) => ['profile', userId] as const,
  },
} as const;
