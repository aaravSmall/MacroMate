/** Display info for dining providers synced by the sync-dining Edge Function. */
export const DINING_PROVIDERS: Record<string, { label: string; timeZone: string }> = {
  purdue: { label: 'Purdue Dining', timeZone: 'America/Indiana/Indianapolis' },
};

export function diningProviderLabel(provider: string | null): string | null {
  return provider ? (DINING_PROVIDERS[provider]?.label ?? null) : null;
}
