import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth';
import { queryKeys } from '@/lib/queryKeys';

import {
  getUserSettings,
  updateUserSettings,
  type UserSettings,
} from '../services/userSettingsService';

export function useUserSettings() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.userSettings.detail(user?.id ?? ''),
    queryFn: () => getUserSettings(user?.id ?? ''),
    enabled: !!user,
  });
}

/**
 * Saves reminder settings. Reminders aren't scheduled yet; settings are only stored.
 * TODO(reminders): schedule local notifications from these settings.
 */
export function useUpdateUserSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (update: Partial<UserSettings>) => {
      if (!user) throw new Error('Not signed in.');
      return updateUserSettings(user.id, update);
    },
    onSuccess: (settings) => {
      if (user) queryClient.setQueryData(queryKeys.userSettings.detail(user.id), settings);
    },
  });
}
