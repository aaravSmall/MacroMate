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

/** Separators people and menus use between brand and item ("Wingstop – Lemon Pepper"). */
const SEPARATORS = /[–—\-/,.:;()]+/g;

/** Lowercased search words (2+ characters), with separators and filter syntax removed. */
export function searchTerms(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[%_\\"*]/g, ' ')
    .replace(SEPARATORS, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2);
}

/**
 * One PostgREST `or` filter per word, so every word must appear in some column ("wingstop lemon
 * pepper" matches "Wingstop – Lemon Pepper Classic Wings", whatever order or separators).
 * Apply each with `.or()`; PostgREST ANDs them. Empty when the query has no usable words.
 */
export function buildTermFilters(columns: string[], query: string): string[] {
  return searchTerms(query).map((term) =>
    columns.map((column) => `${column}.ilike."%${term}%"`).join(','),
  );
}

type Rankable = { name: string; brand: string | null };

/**
 * Orders results so the closest matches come first: the query as a phrase (with brand), words
 * matched in the item name (not just the brand), names starting with a word, then shorter names.
 * Stable for ties.
 */
export function rankFoods<T extends Rankable>(query: string, foods: readonly T[]): T[] {
  const terms = searchTerms(query);
  const phrase = terms.join(' ');
  const normalize = (s: string) =>
    s.toLowerCase().replace(SEPARATORS, ' ').replace(/\s+/g, ' ').trim();
  const score = (food: T) => {
    const brand = normalize(food.brand ?? '');
    // Item part of the name: without a "Brand – " prefix.
    const full = normalize(food.name);
    const item = brand && full.startsWith(brand) ? full.slice(brand.length).trim() : full;
    const all = `${brand} ${item}`.trim();
    let s = 0;
    if (phrase && all.includes(phrase)) s += 8;
    if (phrase && item.startsWith(phrase)) s += 4;
    for (const term of terms) {
      if (item.includes(term)) s += 2;
      else if (brand.includes(term)) s += 1;
      if (item.split(' ').some((w) => w.startsWith(term))) s += 1;
    }
    return s;
  };
  return foods
    .map((food, index) => ({ food, index, s: score(food) }))
    .sort((a, b) => b.s - a.s || a.food.name.length - b.food.name.length || a.index - b.index)
    .map((x) => x.food);
}
