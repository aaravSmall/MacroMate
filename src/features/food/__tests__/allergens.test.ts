import { allergenNotice, containsLabel } from '@/features/food/logic/allergens';

describe('allergenNotice', () => {
  it('adds the cross-contact note to dining hall foods', () => {
    expect(allergenNotice({ source: 'dining_hall', provider: 'purdue' })).toBe(
      'Allergen info from Purdue Dining. It may not reflect cross-contact; ask dining staff if you have an allergy.',
    );
  });

  it('has no provider note for other foods', () => {
    expect(allergenNotice({ source: 'open_food_facts', provider: null })).toBeNull();
  });
});

describe('containsLabel', () => {
  it('warns about flagged allergens', () => {
    expect(containsLabel({ allergens: ['gluten', 'soy', 'wheat'] })).toBe(
      'Contains: gluten, soy, wheat',
    );
  });

  it('never claims a food is free of allergens', () => {
    // Nothing flagged means nothing to warn about, not "safe": no label at all.
    expect(containsLabel({ allergens: [] })).toBeNull();
  });
});
