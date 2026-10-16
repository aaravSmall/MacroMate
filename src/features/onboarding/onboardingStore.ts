import { create } from 'zustand';

import type { UnitSystem } from '@/types/domain';

import { convertUnits, INITIAL_ONBOARDING_FORM, type OnboardingForm } from './logic/onboardingForm';

type OnboardingStore = {
  form: OnboardingForm;
  update: (patch: Partial<OnboardingForm>) => void;
  setUnits: (units: UnitSystem) => void;
  toggleListItem: (list: 'dietaryRestrictions' | 'allergies', item: string) => void;
  reset: () => void;
};

/** Answers shared across onboarding steps. Kept in memory until onboarding is saved. */
export const useOnboardingStore = create<OnboardingStore>((set) => ({
  form: INITIAL_ONBOARDING_FORM,
  update: (patch) => set((s) => ({ form: { ...s.form, ...patch } })),
  setUnits: (units) => set((s) => ({ form: convertUnits(s.form, units) })),
  toggleListItem: (list, item) =>
    set((s) => {
      const current = s.form[list];
      const next = current.includes(item) ? current.filter((i) => i !== item) : [...current, item];
      return { form: { ...s.form, [list]: next } };
    }),
  reset: () => set({ form: INITIAL_ONBOARDING_FORM }),
}));
