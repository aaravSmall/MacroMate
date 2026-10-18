import type { ChainConfig } from '../lib/normalize';

/** Five Guys' US Nutrition & Allergen Guide. Allergen columns are ignored. */
export const fiveguys: ChainConfig = {
  id: 'fiveguys',
  name: 'Five Guys',
  source: {
    url: 'https://www.fiveguys.com/wp-content/uploads/2026/09/Five-Guys-US-Nutrition-Allergen-Guide-English-September-2026.pdf',
    note: 'US Nutrition & Allergen Guide, September 2026 (official, fiveguys.com).',
  },
  sections: [{ match: /^fries/i, noun: 'Fries' }],
  // Items listed per supplier ("(Supplier S)") are the same menu item; the first is kept.
  cleanName: (name) => name.replace(/\s*\(supplier [a-z]\)/i, '').trim(),
};
