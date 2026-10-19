import { allergenNotice, containsLabel } from '@/features/food/logic/allergens';

const NOTE =
  'Allergen info from Purdue Dining. It may not reflect cross-contact; ask dining staff if you have an allergy.';
const dining = (allergens: string[] | null) =>
  ({ source: 'dining_hall', provider: 'purdue', allergens }) as const;

describe('allergenNotice (dining hall foods always show a section)', () => {
  it('lists flagged allergens with the cross-contact note', () => {
    expect(allergenNotice(dining(['gluten', 'soy', 'wheat']))).toEqual({
      status: 'Contains: gluten, soy, wheat',
      note: NOTE,
    });
  });

  it('says none were listed when Purdue listed none', () => {
    expect(allergenNotice(dining([]))).toEqual({
      status: 'No allergens listed by Purdue Dining',
      note: NOTE,
    });
  });

  it('says Purdue gave no info when there is no allergen data', () => {
    expect(allergenNotice(dining(null))).toEqual({
      status: "Purdue Dining didn't provide allergen info for this item",
      note: NOTE,
    });
  });

  it('never says free, safe, or contains no allergens', () => {
    for (const allergens of [['milk'], [], null]) {
      const section = allergenNotice(dining(allergens));
      const text = `${section?.status} ${section?.note}`.toLowerCase();
      expect(text).not.toMatch(/free|safe|contains no|no allergens(?! listed)/);
    }
  });
});

describe('non-dining foods (unchanged)', () => {
  it('have no provider section', () => {
    expect(
      allergenNotice({ source: 'open_food_facts', provider: null, allergens: null }),
    ).toBeNull();
    expect(allergenNotice({ source: 'user_product', provider: null, allergens: [] })).toBeNull();
  });

  it('only show flagged allergens, and nothing otherwise', () => {
    expect(containsLabel({ allergens: ['peanuts'] })).toBe('Contains: peanuts');
    expect(containsLabel({ allergens: [] })).toBeNull();
    expect(containsLabel({ allergens: null })).toBeNull();
  });
});
