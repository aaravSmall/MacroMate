import {
  baseServingLabel,
  canDeleteFood,
  canEditFood,
  canVerifyFood,
  defaultServing,
  hasMismatchWarning,
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

describe('canDeleteFood', () => {
  it('allows only the owner’s private foods', () => {
    expect(canDeleteFood({ ownerId: me, visibility: 'private' }, me)).toBe(true);
    expect(canDeleteFood({ ownerId: me, visibility: 'public' }, me)).toBe(false);
    expect(canDeleteFood({ ownerId: 'other', visibility: 'private' }, me)).toBe(false);
  });
});

describe('canVerifyFood', () => {
  it('asks about stored public foods someone else added', () => {
    expect(canVerifyFood({ id: 'f', ownerId: 'other', visibility: 'public' }, me)).toBe(true);
    expect(canVerifyFood({ id: 'f', ownerId: null, visibility: 'public' }, me)).toBe(true);
  });

  it('never asks about the user’s own, private, or uncached foods', () => {
    expect(canVerifyFood({ id: 'f', ownerId: me, visibility: 'public' }, me)).toBe(false);
    expect(canVerifyFood({ id: 'f', ownerId: 'other', visibility: 'private' }, me)).toBe(false);
    expect(canVerifyFood({ id: 'off:123', ownerId: null, visibility: 'public' }, me)).toBe(false);
  });
});

describe('hasMismatchWarning', () => {
  it('warns only when mismatches outnumber matches', () => {
    expect(hasMismatchWarning({ verificationCount: 2, mismatchCount: 3 })).toBe(true);
    expect(hasMismatchWarning({ verificationCount: 3, mismatchCount: 3 })).toBe(false);
    expect(hasMismatchWarning({ verificationCount: 0, mismatchCount: 0 })).toBe(false);
  });
});
