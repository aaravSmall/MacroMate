import {
  buildIlikeOrFilter,
  buildTermFilters,
  rankFoods,
  searchTerms,
} from '@/features/food/services/searchFilter';

describe('buildIlikeOrFilter', () => {
  it('matches the query in every column', () => {
    expect(buildIlikeOrFilter(['name', 'brand'], 'greek yogurt')).toBe(
      'name.ilike."%greek yogurt%",brand.ilike."%greek yogurt%"',
    );
  });

  it('trims and collapses whitespace', () => {
    expect(buildIlikeOrFilter(['name'], '  oat   milk ')).toBe('name.ilike."%oat milk%"');
  });

  it('drops LIKE wildcards and filter-syntax characters', () => {
    expect(buildIlikeOrFilter(['name'], '50% "lean", (beef)*_\\')).toBe(
      'name.ilike."%50 lean beef%"',
    );
  });

  it('returns null for empty input', () => {
    expect(buildIlikeOrFilter(['name'], '')).toBeNull();
    expect(buildIlikeOrFilter(['name'], ' %% ')).toBeNull();
  });
});

describe('searchTerms / buildTermFilters', () => {
  it('splits on spaces and menu separators, dropping 1-letter words', () => {
    expect(searchTerms('Wingstop – Lemon-Pepper (6 pc)')).toEqual([
      'wingstop',
      'lemon',
      'pepper',
      'pc',
    ]);
  });

  it('makes one name-or-brand filter per word', () => {
    expect(buildTermFilters(['name', 'brand'], 'wingstop lemon')).toEqual([
      'name.ilike."%wingstop%",brand.ilike."%wingstop%"',
      'name.ilike."%lemon%",brand.ilike."%lemon%"',
    ]);
    expect(buildTermFilters(['name'], ' %% ')).toEqual([]);
  });
});

describe('rankFoods', () => {
  const foods = [
    { name: 'Wingstop – Lemon Pepper Boneless Wings', brand: 'Wingstop' },
    { name: 'Lemon pepper seasoning', brand: 'McCormick' },
    { name: 'Wingstop – Lemon Pepper Classic Wings', brand: 'Wingstop' },
    { name: 'Wingstop – Seasoned Fries Regular', brand: 'Wingstop' },
    { name: 'Lemon Pepper Chicken', brand: null },
  ];

  it('puts chain + item matches first when the query names the chain', () => {
    expect(
      rankFoods('wingstop lemon pepper', foods)
        .map((f) => f.name)
        .slice(0, 2),
    ).toEqual(['Wingstop – Lemon Pepper Classic Wings', 'Wingstop – Lemon Pepper Boneless Wings']);
  });

  it('prefers item-name matches over brand-only matches', () => {
    expect(rankFoods('wingstop fries', foods)[0]?.name).toBe('Wingstop – Seasoned Fries Regular');
  });

  it('handles item-first queries and ties by shorter name', () => {
    expect(
      rankFoods('lemon pepper', foods)
        .map((f) => f.name)
        .slice(0, 2),
    ).toEqual(['Lemon Pepper Chicken', 'Lemon pepper seasoning']);
  });
});
