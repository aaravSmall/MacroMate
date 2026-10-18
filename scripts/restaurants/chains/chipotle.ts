import type { ChainConfig } from '../lib/normalize';

/** Chipotle's US nutrition PDF: page 1 is a calorie-only menu; the full table is on pages 2–3. */
export const chipotle: ChainConfig = {
  id: 'chipotle',
  name: 'Chipotle',
  source: {
    url: 'https://www.chipotle.com/content/dam/chipotle/menu/nutrition/US-Nutrition-Facts-Paper-Menu-3-2025.pdf',
    note: 'US Nutrition Facts, March 2025 (official, chipotle.com).',
  },
  pages: [2, 3],
};
