/**
 * Normalizes extracted table records into rows for `foods` + `food_servings` (source
 * 'restaurant', public, no owner). Pure.
 */
import type { RawRecord } from './table';

export type SectionConfig = {
  /** Matched against the PDF's section title (case-insensitive). */
  match: RegExp;
  /** Added to item names, e.g. "Classic Wings" → "Lemon Pepper Classic Wings". */
  noun?: string;
  /** Put the noun before the item name instead of after. */
  nounFirst?: boolean;
  /** What "1 ea" means in this section, e.g. "wing". */
  each?: string;
  /** Extra portions as multiples of the printed serving, e.g. 6 / 8 / 10 wings. */
  multiples?: { label: string; multiplier: number; isDefault?: boolean }[];
  /** Leave the section out entirely. */
  skip?: boolean;
};

export type ChainConfig = {
  /** Stable id used in natural keys and file names. Never change it once uploaded. */
  id: string;
  /** Display name, prefixed to every item ("Wingstop – …"). */
  name: string;
  source: {
    /** Official nutrition PDF (or a local path under scripts/restaurants/pdfs/). */
    url: string;
    /** Anything a reviewer should know (e.g. the PDF's date). */
    note?: string;
  };
  /** 1-based pages to read; all pages when omitted. */
  pages?: number[];
  sections?: SectionConfig[];
  /** Applied to raw item names, e.g. strip "(Supplier S)". */
  cleanName?: (name: string) => string;
  /** Items to leave out (matched against the cleaned name). */
  skipItems?: RegExp[];
};

export type FoodRow = {
  source: 'restaurant';
  visibility: 'public';
  owner_id: null;
  external_id: string;
  barcode: null;
  name: string;
  brand: string;
  base_amount: 1;
  base_unit: 'serving';
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number | null;
  sugar_g: number | null;
  sat_fat_g: number | null;
  sodium_mg: number | null;
  cholesterol_mg: number | null;
  micros: Record<string, number>;
};

export type ServingRow = { label: string; base_multiplier: number; is_default: boolean };

export type NormalizedItem = {
  /** Natural key: `<chain>:<section>:<item>[:<size>]`; also foods.external_id. */
  externalId: string;
  section: string | null;
  sourceName: string;
  servingText: string | null;
  page: number;
  food: FoodRow;
  servings: ServingRow[];
  /** Things a reviewer should look at; non-empty means it isn't uploaded until approved. */
  reasons: string[];
};

const OZ = 28.35;
const FL_OZ = 29.57;

export function slug(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/®|™|©/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** "<1" and "< 1" mean less than 1; recorded as 0.5. */
export function parseValue(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  const t = raw.trim();
  if (/^<\s*\d/.test(t)) return Number(t.replace(/[<\s]/g, '')) / 2;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Title-cases a SHOUTED section title: "CLASSIC WINGS" → "Classic Wings". */
function titleCase(text: string): string {
  return text.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

export type ParsedServing = { label: string; grams: number | null; ml: number | null };

/**
 * Serving text and/or a numeric serving column → a readable label with standard units, plus
 * grams or ml when known. "1ea (38.77g)" → "1 wing (39 g)"; "4 oz" → "4 oz" (113 g);
 * "2 fl oz" → 59 ml; 14 g + "Bacon (2 pieces)" → "2 pieces (14 g)"; "Regular" + 600 ml →
 * "Regular (600 ml)".
 */
export function parseServing(
  text: string | null,
  amount: { value: number; unit: 'g' | 'ml' } | null,
  each = 'each',
  itemName = '',
): ParsedServing {
  const count = /\((\d+)\s*(pieces?|pcs?|slices?)\)/i.exec(itemName);
  const countLabel = count ? `${count[1]} ${count[2]}` : null;
  const t = text?.trim() ?? '';

  const ea = /^(\d+(?:\.\d+)?)\s*ea\b\s*(?:\((\d+(?:\.\d+)?)\s*g\))?/i.exec(t);
  if (ea) {
    const n = Number(ea[1]);
    const grams = ea[2] ? Number(ea[2]) : amount?.unit === 'g' ? amount.value : null;
    const unit = n === 1 || each === 'each' ? each : `${each}s`;
    return { label: `${n} ${unit}${grams ? ` (${Math.round(grams)} g)` : ''}`, grams, ml: null };
  }
  const floz = /^(\d+(?:\.\d+)?)\s*fl\.?\s*oz/i.exec(t);
  if (floz) {
    const ml = amount?.unit === 'ml' ? amount.value : Math.round(Number(floz[1]) * FL_OZ * 10) / 10;
    return { label: `${floz[1]} fl oz`, grams: null, ml };
  }
  const oz = /^(\d+(?:\.\d+)?)\s*oz\b/i.exec(t);
  if (oz && !/cup/i.test(t)) {
    const grams = amount?.unit === 'g' ? amount.value : Math.round(Number(oz[1]) * OZ * 10) / 10;
    return { label: `${oz[1]} oz`, grams, ml: null };
  }

  // Grams or ml printed inside the text ("5 Sticks (56g)", "3.25oz Cup (85g)") or in a column.
  const inText = /\((\d+(?:\.\d+)?)\s*(g|ml)\)/i.exec(t) ?? /^(\d+(?:\.\d+)?)\s*(g|ml)$/i.exec(t);
  const metric = inText
    ? { value: Number(inText[1]), unit: (inText[2] ?? 'g').toLowerCase() as 'g' | 'ml' }
    : amount;
  const grams = metric?.unit === 'g' ? metric.value : null;
  const ml = metric?.unit === 'ml' ? metric.value : null;
  const metricText = metric ? `${Math.round(metric.value * 10) / 10} ${metric.unit}` : null;

  let label: string;
  if (t && !/^\d+(\.\d+)?\s*(g|ml)$/i.test(t)) {
    label = inText || !metricText ? t : `${t} (${metricText})`;
  } else if (countLabel && metricText) {
    label = `${countLabel} (${metricText})`;
  } else {
    label = metricText ?? countLabel ?? '1 serving';
  }
  return { label, grams, ml };
}

function sectionConfig(config: ChainConfig, section: string | null): SectionConfig | undefined {
  if (!section) return undefined;
  return config.sections?.find((s) => s.match.test(section));
}

/** Records → normalized items. Doesn't validate nutrition; see validate.ts. */
export function normalizeRecords(config: ChainConfig, records: RawRecord[]): NormalizedItem[] {
  const items: NormalizedItem[] = [];
  const seen = new Map<string, NormalizedItem>();

  for (const record of records) {
    const sectionCfg = sectionConfig(config, record.section);
    if (sectionCfg?.skip) continue;
    const cleaned = (config.cleanName ?? ((n: string) => n))(record.name)
      .replace(/\s+/g, ' ')
      .trim();
    if (!cleaned || config.skipItems?.some((re) => re.test(cleaned))) continue;

    const serving = parseServing(
      record.serving,
      record.servingAmount,
      sectionCfg?.each,
      record.name,
    );
    const noun = sectionCfg?.noun;
    let core = noun
      ? sectionCfg?.nounFirst
        ? `${noun}: ${cleaned}`
        : `${cleaned} ${noun}`
      : cleaned;
    if (record.continued) core = `${core} (${serving.label})`;
    const name = `${config.name} – ${core}`;

    const sectionKey = record.section
      ? slug(sectionCfg?.noun ?? titleCase(record.section))
      : 'menu';
    const externalId = [
      config.id,
      sectionKey,
      slug(cleaned),
      record.continued ? slug(serving.label) : null,
    ]
      .filter(Boolean)
      .join(':');

    const v = (k: keyof RawRecord['values']) => parseValue(record.values[k]);
    const reasons: string[] = [];
    if (record.layoutMismatch)
      reasons.push('Columns didn’t line up with the header; values were placed by position.');
    const calories = v('calories');
    if (calories === null) reasons.push('No calories found.');

    const micros: Record<string, number> = {};
    const add = (key: string, value: number | null) => {
      if (value !== null) micros[key] = value;
    };
    add('trans_fat_g', v('trans_fat_g'));
    add('added_sugar_g', v('added_sugar_g'));
    add('vitamin_d_mcg', v('vitamin_d_mcg'));
    add('calcium_mg', v('calcium_mg'));
    add('iron_mg', v('iron_mg'));
    add('potassium_mg', v('potassium_mg'));

    const servings: ServingRow[] = [{ label: serving.label, base_multiplier: 1, is_default: true }];
    for (const extra of sectionCfg?.multiples ?? []) {
      servings.push({ label: extra.label, base_multiplier: extra.multiplier, is_default: false });
    }
    if (sectionCfg?.multiples?.some((m) => m.isDefault)) {
      for (const s of servings)
        s.is_default = sectionCfg.multiples.some((m) => m.isDefault && m.label === s.label);
    }
    if (serving.grams) {
      servings.push({
        label: '1 oz',
        base_multiplier: round4(OZ / serving.grams),
        is_default: false,
      });
      servings.push({
        label: '100 g',
        base_multiplier: round4(100 / serving.grams),
        is_default: false,
      });
    }

    const item: NormalizedItem = {
      externalId,
      section: record.section,
      sourceName: record.name,
      servingText: record.serving,
      page: record.page,
      food: {
        source: 'restaurant',
        visibility: 'public',
        owner_id: null,
        external_id: externalId,
        barcode: null,
        name,
        brand: config.name,
        base_amount: 1,
        base_unit: 'serving',
        calories: calories ?? 0,
        protein_g: v('protein_g') ?? 0,
        carbs_g: v('carbs_g') ?? 0,
        fat_g: v('fat_g') ?? 0,
        fiber_g: v('fiber_g'),
        sugar_g: v('sugar_g'),
        sat_fat_g: v('sat_fat_g'),
        sodium_mg: v('sodium_mg'),
        cholesterol_mg: v('cholesterol_mg'),
        micros,
      },
      servings,
      reasons,
    };

    let duplicate = seen.get(externalId);
    if (duplicate && sameNutrition(duplicate, item)) {
      // Repeated verbatim (e.g. the same table for Coke and Pepsi locations): keep one.
      continue;
    }
    if (duplicate && duplicate.servings[0]?.label !== item.servings[0]?.label) {
      // Same name, different portion ("1 ea" vs "2 ea"): a separate item, keyed by its serving.
      const sized = `${externalId}:${slug(serving.label)}`;
      item.externalId = sized;
      item.food.external_id = sized;
      item.food.name = `${name} (${serving.label})`;
      const existing = seen.get(sized);
      if (existing && sameNutrition(existing, item)) continue;
      duplicate = existing;
      if (!existing) {
        seen.set(sized, item);
        items.push(item);
        continue;
      }
    }
    if (duplicate) {
      // Same item listed twice (e.g. per supplier): keep the first, flag the repeat.
      item.reasons.push(`Duplicate of "${duplicate.sourceName}" (same natural key); first kept.`);
      item.externalId = `${externalId}:dup-${items.filter((i) => i.externalId.startsWith(externalId)).length}`;
      item.food.external_id = item.externalId;
    } else {
      seen.set(externalId, item);
    }
    items.push(item);
  }
  return items;
}

function sameNutrition(a: NormalizedItem, b: NormalizedItem): boolean {
  return (
    JSON.stringify(a.food) === JSON.stringify({ ...b.food, external_id: a.food.external_id }) &&
    JSON.stringify(a.servings) === JSON.stringify(b.servings)
  );
}

function round4(n: number): number {
  return Math.round(n * 10_000) / 10_000;
}
