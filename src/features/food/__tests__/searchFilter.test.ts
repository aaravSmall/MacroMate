import { buildIlikeOrFilter } from '@/features/food/services/searchFilter';

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
