/**
 * Builds a PostgREST `or` filter that matches `query` anywhere in any of `columns`
 * (case-insensitive). Characters with special meaning to LIKE or PostgREST filter syntax are
 * dropped rather than escaped; food searches don't need them. Returns null for empty input.
 */
export function buildIlikeOrFilter(columns: string[], query: string): string | null {
  const clean = query
    .replace(/[%_\\"(),*]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (clean === '') return null;
  return columns.map((column) => `${column}.ilike."%${clean}%"`).join(',');
}
