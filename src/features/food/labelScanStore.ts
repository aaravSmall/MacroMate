import { create } from 'zustand';

import type { LabelFormPrefill } from './logic/labelForm';

type LabelScanStore = {
  /** A parsed label waiting to prefill the create-food form. UI state; never persisted. */
  prefill: LabelFormPrefill | null;
  setPrefill: (prefill: LabelFormPrefill) => void;
  /** Returns the prefill once and clears it. */
  take: () => LabelFormPrefill | null;
};

export const useLabelScanStore = create<LabelScanStore>((set, get) => ({
  prefill: null,
  setPrefill: (prefill) => set({ prefill }),
  take: () => {
    const { prefill } = get();
    set({ prefill: null });
    return prefill;
  },
}));
