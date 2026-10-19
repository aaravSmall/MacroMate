import {
  baseServingLabel,
  canDeleteFood,
  canEditFood,
  canShareFood,
  canVerifyFood,
  defaultServing,
  hasMismatchWarning,
  matchServing,
  needsLabelCheck,
  verificationSummary,
} from '@/features/food/logic/foodRules';

const me = 'user-me';

describe('baseServingLabel', () => {
  it('labels weights, volumes, and servings', () => {
    expect(baseServingLabel(100, 'g')).toBe('100 g');
    expect(baseServingLabel(100, 'ml')).toBe('100 ml');
    expect(baseServingLabel(1, 'serving')).toBe('1 serving');
    expect(baseServingLabel(2, 'serving')).toBe('2 servings');
  });
});

describe('defaultServing', () => {
  it('prefers the default, else the first', () => {
    const a = { id: 'a', label: 'a', baseMultiplier: 1, isDefault: false };
    const b = { id: 'b', label: 'b', baseMultiplier: 2, isDefault: true };
    expect(defaultServing({ servings: [a, b] })).toBe(b);
    expect(defaultServing({ servings: [a] })).toBe(a);
  });
});

describe('canEditFood', () => {
  it('allows only the owner’s recipes', () => {
    expect(canEditFood({ ownerId: me, source: 'user_recipe' }, me)).toBe(true);
    expect(canEditFood({ ownerId: me, source: 'user_product' }, me)).toBe(false);
    expect(canEditFood({ ownerId: me, source: 'label_scan' }, me)).toBe(false);
    expect(canEditFood({ ownerId: 'other', source: 'user_recipe' }, me)).toBe(false);
    expect(canEditFood({ ownerId: null, source: 'open_food_facts' }, me)).toBe(false);
  });
});

describe('canShareFood', () => {
  it('allows only the owner’s private user-created foods', () => {
    for (const source of ['user_product', 'user_recipe', 'label_scan'] as const) {
      expect(canShareFood({ ownerId: me, visibility: 'private', source }, me)).toBe(true);
    }
    expect(canShareFood({ ownerId: me, visibility: 'public', source: 'user_recipe' }, me)).toBe(
      false,
    );
    expect(
      canShareFood({ ownerId: 'other', visibility: 'private', source: 'user_product' }, me),
    ).toBe(false);
    expect(canShareFood({ ownerId: me, visibility: 'private', source: 'restaurant' }, me)).toBe(
      false,
    );
  });
});

describe('canDeleteFood', () => {
  it('allows only the owner’s private foods', () => {
    expect(canDeleteFood({ ownerId: me, visibility: 'private' }, me)).toBe(true);
    expect(canDeleteFood({ ownerId: me, visibility: 'public' }, me)).toBe(false);
    expect(canDeleteFood({ ownerId: 'other', visibility: 'private' }, me)).toBe(false);
  });
});

describe('canVerifyFood', () => {
  it('asks about stored public foods someone else added', () => {
    expect(
      canVerifyFood(
        { id: 'f', ownerId: 'other', visibility: 'public', source: 'user_product' },
        me,
      ),
    ).toBe(true);
    expect(
      canVerifyFood(
        { id: 'f', ownerId: null, visibility: 'public', source: 'open_food_facts' },
        me,
      ),
    ).toBe(true);
  });

  it('never asks about dining hall food (there is no package label)', () => {
    expect(
      canVerifyFood({ id: 'f', ownerId: null, visibility: 'public', source: 'dining_hall' }, me),
    ).toBe(false);
  });

  it('never asks about the user’s own, private, or uncached foods', () => {
    expect(
      canVerifyFood({ id: 'f', ownerId: me, visibility: 'public', source: 'user_product' }, me),
    ).toBe(false);
    expect(
      canVerifyFood(
        { id: 'f', ownerId: 'other', visibility: 'private', source: 'user_product' },
        me,
      ),
    ).toBe(false);
    expect(
      canVerifyFood(
        { id: 'off:123', ownerId: null, visibility: 'public', source: 'open_food_facts' },
        me,
      ),
    ).toBe(false);
  });
});

describe('hasMismatchWarning', () => {
  it('warns only when mismatches outnumber matches', () => {
    expect(hasMismatchWarning({ verificationCount: 2, mismatchCount: 3 })).toBe(true);
    expect(hasMismatchWarning({ verificationCount: 3, mismatchCount: 3 })).toBe(false);
    expect(hasMismatchWarning({ verificationCount: 0, mismatchCount: 0 })).toBe(false);
  });
});

describe('matchServing', () => {
  const servings = [
    { id: 's1', label: '1 portion (15 g)', baseMultiplier: 0.15, isDefault: true },
    { id: 's2', label: '100 g', baseMultiplier: 1, isDefault: false },
    { id: 's3', label: '1 oz', baseMultiplier: 0.2835, isDefault: false },
  ];

  it('finds the same-size portion, tolerating column rounding', () => {
    expect(matchServing(servings, { baseMultiplier: 1 }).id).toBe('s2');
    expect(matchServing(servings, { baseMultiplier: 0.283495 }).id).toBe('s3');
  });

  it('falls back to the default', () => {
    expect(matchServing(servings, { baseMultiplier: 2.5 }).id).toBe('s1');
  });
});

describe('needsLabelCheck', () => {
  it('asks only about foods that come from a package label', () => {
    expect(needsLabelCheck({ source: 'open_food_facts' })).toBe(true);
    expect(needsLabelCheck({ source: 'user_product' })).toBe(true);
    expect(needsLabelCheck({ source: 'label_scan' })).toBe(true);
    expect(needsLabelCheck({ source: 'user_recipe' })).toBe(false);
    expect(needsLabelCheck({ source: 'restaurant' })).toBe(false);
    expect(needsLabelCheck({ source: 'dining_hall' })).toBe(false);
  });

  it('keeps public restaurant food out of the label prompt', () => {
    expect(
      canVerifyFood({ id: 'f', ownerId: null, visibility: 'public', source: 'restaurant' }, me),
    ).toBe(false);
    expect(
      canVerifyFood(
        { id: 'f', ownerId: null, visibility: 'public', source: 'open_food_facts' },
        me,
      ),
    ).toBe(true);
  });
});

describe('verificationSummary', () => {
  const food = {
    id: 'f1',
    visibility: 'public' as const,
    source: 'user_product' as const,
    verificationCount: 24,
    mismatchCount: 2,
  };

  it('shows compact counts like review counts', () => {
    expect(verificationSummary(food)).toEqual({
      text: '✓ 24 · ✗ 2',
      accessibilityLabel: "24 people say it matches their label, 2 say it doesn't",
    });
    expect(
      verificationSummary({ ...food, verificationCount: 1, mismatchCount: 1 })?.accessibilityLabel,
    ).toBe("1 person says it matches their label, 1 says it doesn't");
  });

  it('shows nothing without votes, for private foods, or for non-label sources', () => {
    expect(verificationSummary({ ...food, verificationCount: 0, mismatchCount: 0 })).toBeNull();
    expect(verificationSummary({ ...food, visibility: 'private' })).toBeNull();
    expect(verificationSummary({ ...food, source: 'restaurant' })).toBeNull();
    expect(verificationSummary({ ...food, source: 'user_recipe' })).toBeNull();
    expect(verificationSummary({ ...food, id: 'off:123', source: 'open_food_facts' })).toBeNull();
  });
});
