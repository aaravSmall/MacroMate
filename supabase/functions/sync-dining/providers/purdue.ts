/**
 * Purdue Dining provider (Purdue HFS menus API v2, public, no auth). Endpoints are documented
 * in docs/PURDUE_DINING.md. Mapping lives in purdueMapping.ts (pure, tested).
 */
import { createPoliteFetcher, HttpError } from '../lib/politeFetch.ts';
import {
  mapPurdueItem,
  mapPurdueLocations,
  mapPurdueMenu,
  PURDUE_PROVIDER,
} from './purdueMapping.ts';
import type { DiningProvider } from './types.ts';

const BASE = 'https://api.hfs.purdue.edu/menus/v2';
const USER_AGENT =
  'Tally/0.1 (calorie tracker; daily menu sync; https://github.com/aaravSmall/MacroMate)';

export function createPurdueProvider(fetchImpl: typeof fetch = fetch): DiningProvider {
  const http = createPoliteFetcher({ userAgent: USER_AGENT, delayMs: 300, retries: 3, fetchImpl });
  return {
    id: PURDUE_PROVIDER,
    timeZone: 'America/Indiana/Indianapolis',
    async listLocations() {
      return mapPurdueLocations(await http.getJson(`${BASE}/locations`));
    },
    async getMenu(location, date) {
      try {
        const json = await http.getJson(
          `${BASE}/locations/${encodeURIComponent(location.name)}/${date}`,
        );
        return mapPurdueMenu(json, date);
      } catch (error) {
        if (error instanceof HttpError && error.status === 404) return null;
        throw error;
      }
    },
    async getItem(itemId) {
      try {
        return mapPurdueItem(await http.getJson(`${BASE}/items/${encodeURIComponent(itemId)}`));
      } catch (error) {
        if (error instanceof HttpError && error.status === 404) return null;
        throw error;
      }
    },
  };
}
