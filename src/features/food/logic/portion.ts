import type { PortionGuide } from '@/constants/portionGuides';
import type { Food, FoodServing } from '@/types/domain';

const GRAMS: Record<string, number> = { g: 1, gram: 1, grams: 1, oz: 28.35, lb: 453.6 };
const ML: Record<string, number> = {
  ml: 1,
  l: 1000,
  'fl oz': 29.57,
  cup: 240,
  cups: 240,
  c: 240,
  tbsp: 15,
  tablespoon: 15,
  tablespoons: 15,
  tsp: 5,
  teaspoon: 5,
  teaspoons: 5,
};

function parseAmount(raw: string): number | null {
  const s = raw.trim().replace('½', ' 1/2').replace('¼', ' 1/4').replace('¾', ' 3/4').trim();
  const mixed = /^(\d+)\s+(\d+)\/(\d+)$/.exec(s);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  const frac = /^(\d+)\/(\d+)$/.exec(s);
  if (frac) return Number(frac[1]) / Number(frac[2]);
  const n = Number(s);
  return s !== '' && Number.isFinite(n) && n > 0 ? n : null;
}

/** All measurable amounts printed in a serving label, e.g. "2/3 cup (55 g)" → ml and g. */
export function servingLabelMeasures(label: string): { grams: number | null; ml: number | null } {
  let grams: number | null = null;
  let ml: number | null = null;
  const re =
    /(\d+(?:\.\d+)?(?:\s+\d+\/\d+)?|\d+\/\d+|[½¼¾])\s*(fl\.?\s?oz|grams?|tablespoons?|teaspoons?|cups?|tbsp|tsp|ml|lb|oz|g|l|c)\b/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(label)) !== null) {
    const amount = parseAmount(m[1] ?? '');
    const unit = (m[2] ?? '').toLowerCase().replace(/\.\s?/, ' ').replace(/\s+/g, ' ');
    if (amount === null) continue;
    const unitKey = unit === 'fl oz' || unit === 'floz' ? 'fl oz' : unit;
    if (unitKey in ML && ml === null) ml = amount * (ML[unitKey] ?? 0);
    else if (unitKey in GRAMS && grams === null) grams = amount * (GRAMS[unitKey] ?? 0);
  }
  return { grams, ml };
}

/** How much one serving is, in grams and/or ml, when that can be known. */
export function servingMeasures(
  food: Pick<Food, 'baseAmount' | 'baseUnit'>,
  serving: Pick<FoodServing, 'label' | 'baseMultiplier'>,
): { grams: number | null; ml: number | null } {
  const fromLabel = servingLabelMeasures(serving.label);
  const base = serving.baseMultiplier * food.baseAmount;
  return {
    grams: food.baseUnit === 'g' ? base : fromLabel.grams,
    ml: food.baseUnit === 'ml' ? base : fromLabel.ml,
  };
}

/** Rounds to an amount someone would type: quarters at 1 and above, tenths below. */
export function friendlyQuantity(q: number): number {
  return q >= 1 ? Math.round(q * 4) / 4 : Math.max(0.1, Math.round(q * 10) / 10);
}

/**
 * The number of servings a visual reference stands for, or null if it can't be converted
 * honestly (e.g. a cup of something whose serving is only known by weight).
 */
export function quantityForGuide(
  guide: Pick<PortionGuide, 'measure'>,
  food: Pick<Food, 'baseAmount' | 'baseUnit'>,
  serving: Pick<FoodServing, 'label' | 'baseMultiplier'>,
): number | null {
  const { grams, ml } = servingMeasures(food, serving);
  if (guide.measure.kind === 'weight') {
    return grams && grams > 0 ? friendlyQuantity(guide.measure.grams / grams) : null;
  }
  return ml && ml > 0 ? friendlyQuantity(guide.measure.ml / ml) : null;
}

/** The references that make sense for this food and serving, with the quantity each fills in. */
export function applicableGuides<G extends Pick<PortionGuide, 'measure'>>(
  guides: readonly G[],
  food: Pick<Food, 'baseAmount' | 'baseUnit'>,
  serving: Pick<FoodServing, 'label' | 'baseMultiplier'>,
): { guide: G; quantity: number }[] {
  return guides.flatMap((guide) => {
    const quantity = quantityForGuide(guide, food, serving);
    return quantity === null ? [] : [{ guide, quantity }];
  });
}
