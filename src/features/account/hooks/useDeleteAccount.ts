import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';

import { useOnboardingStore } from '@/features/onboarding/onboardingStore';
import { cancelWeighInReminders } from '@/features/weighins/services/reminderService';
import { useSelectedDateStore } from '@/store/selectedDateStore';

import { deleteAccount } from '../services/accountService';

/**
 * Deletes the account, then drops everything held for it on this device: cached server data
 * in-memory stores, and scheduled reminders. (The Supabase session is cleared by the service.)
 */
export function useDeleteAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => {
      void cancelWeighInReminders().catch(() => undefined);
      queryClient.clear();
      useOnboardingStore.getState().reset();
      useSelectedDateStore.getState().goToToday();
      router.replace('/sign-in');
    },
  });
}
