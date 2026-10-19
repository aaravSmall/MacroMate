import { dietaryConflicts, ingredientsFromAllergens, withoutConflicts } from '@/lib/dietary';

describe('ingredientsFromAllergens', () => {
  it('reads Open Food Facts tags and plain names', () => {
    expect(ingredientsFromAllergens(['en:milk', 'en:gluten', 'en:soybeans'])).toEqual([
      'milk',
      'wheat',
      'soy',
    ]);
    expect(ingredientsFromAllergens(['Tree Nuts', 'Crustacean shellfish', 'Eggs'])).toEqual([
      'tree_nuts',
      'shellfish',
      'eggs',
    ]);
  });

  it('does not treat peanuts as tree nuts', () => {
    expect(ingredientsFromAllergens(['en:peanuts'])).toEqual(['peanuts']);
  });

  it('ignores unknown strings', () => {
    expect(ingredientsFromAllergens(['en:celery', 'mustard'])).toEqual([]);
  });
});

describe('dietaryConflicts', () => {
  it('reports allergies and restrictions in the user’s own words', () => {
    expect(
      dietaryConflicts(['milk', 'peanuts'], { allergies: ['Peanuts'], restrictions: ['Vegan'] }),
    ).toEqual([
      { kind: 'allergy', label: 'Peanuts' },
      { kind: 'restriction', label: 'Vegan' },
    ]);
  });

  it('never flags restrictions it cannot judge', () => {
    expect(
      dietaryConflicts(['meat', 'milk'], { allergies: [], restrictions: ['Halal', 'Kosher'] }),
    ).toEqual([]);
  });

  it('maps restrictions to what they exclude', () => {
    const conflicts = (ingredients: Parameters<typeof dietaryConflicts>[0], r: string) =>
      dietaryConflicts(ingredients, { allergies: [], restrictions: [r] }).length > 0;
    expect(conflicts(['fish'], 'Pescatarian')).toBe(false);
    expect(conflicts(['meat'], 'Pescatarian')).toBe(true);
    expect(conflicts(['eggs'], 'Vegetarian')).toBe(false);
    expect(conflicts(['eggs'], 'Vegan')).toBe(true);
    expect(conflicts(['wheat'], 'Gluten-free')).toBe(true);
    expect(conflicts(['milk'], 'Dairy-free')).toBe(true);
  });
});

describe('withoutConflicts', () => {
  it('drops conflicting items and keeps the rest in order', () => {
    const items = [
      { id: 1, contains: ['milk' as const] },
      { id: 2, contains: [] },
    ];
    expect(withoutConflicts(items, { allergies: ['Milk'], restrictions: [] })).toEqual([items[1]]);
  });
});
