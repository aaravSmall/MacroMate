/**
 * Turns OCR text from a printed US Nutrition Facts panel into structured values. Pure.
 *
 * Product rule: this reads a printed label only. It never estimates nutrition from a photo of
 * food.
 *
 * How it works:
 * - Each field is found by its label anywhere in the text (not by line), so vertical,
 *   dual-column, and linear ("Serv. size: …, Calories 230, Total Fat 8g (10% DV), …") layouts
 *   all parse. The first amount after a label is the per-serving column.
 * - % Daily Value numbers are never read as amounts (a number must carry a unit and must not be
 *   followed by %).
 * - It parses the lightly cleaned text first (high confidence); a field that only parses after
 *   OCR repairs (O→0, l/I→1, "m g"→"mg", "9"→"g") gets medium confidence. Inferred units,
 *   "less than" amounts, and amounts converted from %DV get low confidence.
 */

export type Confidence = 'high' | 'medium' | 'low';

export type ParsedValue<T> = { value: T; confidence: Confidence };

export type ParsedServing = {
  /** Household amount and unit as printed, e.g. 2/3 cup → 0.67 "cup"; 1 can → 1 "can". */
  amount: number;
  unit: string;
  /** Metric weight or volume in parentheses (or as the whole serving), when printed. */
  grams: number | null;
  ml: number | null;
  text: string;
};

/** Nutrients in canonical units: grams, except the `_mg` / `_mcg` ones. */
export type LabelNutrient =
  | 'fat_g'
  | 'sat_fat_g'
  | 'trans_fat_g'
  | 'cholesterol_mg'
  | 'sodium_mg'
  | 'carbs_g'
  | 'fiber_g'
  | 'sugar_g'
  | 'added_sugar_g'
  | 'protein_g'
  | 'vitamin_d_mcg'
  | 'calcium_mg'
  | 'iron_mg'
  | 'potassium_mg'
  | 'magnesium_mg'
  | 'zinc_mg';

export type ParsedLabel = {
  servingSize: ParsedValue<ParsedServing> | null;
  servingsPerContainer: ParsedValue<number> | null;
  calories: ParsedValue<number> | null;
  nutrients: Partial<Record<LabelNutrient, ParsedValue<number>>>;
};

type Unit = 'g' | 'mg' | 'mcg';

type NutrientSpec = {
  key: LabelNutrient;
  unit: Unit;
  /** Label patterns; the amount follows the label. */
  labels: RegExp[];
  /** Text just before a match that means it's a different nutrient (e.g. "saturated " fat). */
  notAfter?: RegExp;
  /** FDA Daily Value (2016 rule) in `unit`, to convert a %DV-only line (low confidence). */
  dailyValue?: number;
};

const NUTRIENTS: NutrientSpec[] = [
  {
    key: 'sat_fat_g',
    unit: 'g',
    labels: [/saturated\s*fat/, /sat\.?\s*fat/],
  },
  { key: 'trans_fat_g', unit: 'g', labels: [/trans\s*fat/] },
  {
    key: 'fat_g',
    unit: 'g',
    labels: [/total\s*fat/, /\bfat\b/],
    notAfter: /(saturated|sat\.?|trans|from|poly\w*|mono\w*)\s*$/,
  },
  { key: 'cholesterol_mg', unit: 'mg', labels: [/cholesterol/, /cholest\.?/] },
  { key: 'sodium_mg', unit: 'mg', labels: [/sodium/] },
  {
    key: 'carbs_g',
    unit: 'g',
    labels: [/total\s*carbohydrates?/, /total\s*carbs?\.?/, /carbohydrates?/, /\bcarbs?\b\.?/],
  },
  { key: 'fiber_g', unit: 'g', labels: [/dietary\s*fib(er|re)/, /\bfib(er|re)\b/] },
  { key: 'added_sugar_g', unit: 'g', labels: [/added\s*sugars?/] },
  {
    key: 'sugar_g',
    unit: 'g',
    labels: [/total\s*sugars?/, /\bsugars?\b/],
    notAfter: /(added|incl\.?|includes)\s*(\d+(\.\d+)?\s*g\s*)?$/,
  },
  { key: 'protein_g', unit: 'g', labels: [/protein/] },
  {
    key: 'vitamin_d_mcg',
    unit: 'mcg',
    labels: [/vitamin\s*d\d?\b/, /vit\.?\s*d\b/],
    dailyValue: 20,
  },
  { key: 'calcium_mg', unit: 'mg', labels: [/calcium/], dailyValue: 1300 },
  { key: 'iron_mg', unit: 'mg', labels: [/\biron\b/], dailyValue: 18 },
  { key: 'potassium_mg', unit: 'mg', labels: [/potassium/, /potas\.?/], dailyValue: 4700 },
  { key: 'magnesium_mg', unit: 'mg', labels: [/magnesium/], dailyValue: 420 },
  { key: 'zinc_mg', unit: 'mg', labels: [/\bzinc\b/], dailyValue: 11 },
];

/** Lowercase, unify whitespace and lookalike characters, but don't change any digits. */
function clean(text: string): string {
  return text
    .toLowerCase()
    .replace(/[µμ]g/g, 'mcg')
    .replace(/[‐-―−]/g, '-')
    .replace(/[“”"]/g, '')
    .replace(/(\d),(?=\d{3}(?!\d))/g, '$1') // 1,200mg → 1200mg
    .replace(/(\d),(\d)/g, '$1.$2') // 2,5g → 2.5g
    .replace(/[ \t]+/g, ' ');
}

/** Common OCR misreads around numbers. Only applied in the second, medium-confidence pass. */
function repairOcr(text: string): string {
  return (
    text
      // split units first, so the digit fixes below can see the unit: "Om g", "190m g", "2 mc g"
      .replace(/([\dol|])\s*m\s+g\b/g, '$1mg')
      .replace(/([\dol|])\s*mc\s+g\b/g, '$1mcg')
      // O/o read for 0 next to digits or before a unit: "1Og", "12O", "O g", "Omg"
      .replace(/(\d)o(?=[\d.]|\s?(mcg|mg|g)\b|\b)/g, '$10')
      .replace(/\bo(?=[\d.]|\s?(mcg|mg|g|%)\b)/g, '0')
      // l / I / | read for 1 next to digits or before a unit: "l2g", "1l0mg", "l g"
      .replace(/(\d)[li|](?=[\d.]|\s?(mcg|mg|g)\b)/g, '$11')
      .replace(/\b[li|](?=\d|\s?(mcg|mg|g)\b)/g, '1')
      // "9" read for a trailing "g": "129 " after a gram nutrient is handled per field
      .replace(/(\d)\s+9\b(?!\s*%)/g, '$1g')
  );
}

const NUMBER = String.raw`(\d+(?:\.\d+)?)`;

function toUnit(amount: number, from: Unit, to: Unit): number {
  const mg = from === 'g' ? amount * 1000 : from === 'mcg' ? amount / 1000 : amount;
  const out = to === 'g' ? mg / 1000 : to === 'mcg' ? mg * 1000 : mg;
  return Math.round(out * 100) / 100;
}

type Hit = { value: number; confidence: Confidence; end: number };

/**
 * The amount for one nutrient: the first "<label> … <number><unit>" whose number isn't a %DV.
 * Falls back to a unitless number (low) or a %DV conversion (low).
 */
function findNutrient(text: string, spec: NutrientSpec, base: Confidence): Hit | null {
  for (const label of spec.labels) {
    const re = new RegExp(label.source, 'g');
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
      const before = text.slice(Math.max(0, match.index - 24), match.index);
      if (spec.notAfter?.test(before)) continue;
      const after = text.slice(match.index + match[0].length, match.index + match[0].length + 40);

      const amount = new RegExp(
        String.raw`^[^\d%<]{0,12}?(less than|<)?\s*${NUMBER}\s*(mcg|mg|g)\b(?!\s*%)`,
      ).exec(after);
      if (amount) {
        const lessThan = !!amount[1];
        const value = toUnit(Number(amount[2]), amount[3] as Unit, spec.unit);
        return {
          value,
          confidence: lessThan ? 'low' : base,
          end: match.index + match[0].length + amount[0].length,
        };
      }

      // A bare number not followed by % (unit lost in OCR): assume the usual unit.
      const bare = new RegExp(
        String.raw`^[^\d%]{0,6}?${NUMBER}(?!\s*[%\d.])(?!\s*(mcg|mg|g))`,
      ).exec(after);
      if (bare && spec.dailyValue === undefined) {
        return {
          value: Number(bare[1]),
          confidence: 'low',
          end: match.index + match[0].length + bare[0].length,
        };
      }

      // Old-style vitamin/mineral lines print only %DV: "Calcium 20%".
      const percent = new RegExp(String.raw`^[^\d]{0,6}?${NUMBER}\s*%`).exec(after);
      if (percent && spec.dailyValue !== undefined) {
        return {
          value: Math.round((Number(percent[1]) / 100) * spec.dailyValue * 100) / 100,
          confidence: 'low',
          end: match.index + match[0].length + percent[0].length,
        };
      }
    }
  }
  return null;
}

function findAddedSugarsInclusive(text: string, base: Confidence): Hit | null {
  // "Includes 10g Added Sugars" puts the amount before the label.
  const m = new RegExp(
    String.raw`incl(?:udes|\.)?\s*${NUMBER}\s*g\s*(?:of\s*)?added\s*sugars?`,
  ).exec(text);
  return m ? { value: Number(m[1]), confidence: base, end: m.index + m[0].length } : null;
}

function findCalories(text: string, base: Confidence): ParsedValue<number> | null {
  const re = /ca[l1i]or[i1l]es(?!\s*from)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const after = text.slice(match.index + match[0].length, match.index + match[0].length + 30);
    // A whole number, not glued to letters ("12O" is an OCR error), and not a %DV or an amount.
    const m = new RegExp(
      String.raw`^[^\d%]{0,14}?(\d{1,4})(?![\d.a-z])(?![ \t]*(%|g\b|mg\b))`,
    ).exec(after);
    if (m) return { value: Number(m[1]), confidence: base };
  }
  // Column-split OCR (Apple Vision reads the label column, then the value column): the number
  // is on its own line after "Calories". Take the first bare number line after the label.
  const label = /ca[l1i]or[i1l]es(?!\s*from)/.exec(text);
  if (label) {
    const rest = text.slice(label.index).split('\n').slice(1);
    for (const line of rest) {
      const bare = /^\s*(\d{1,4})\s*$/.exec(line);
      if (bare) return { value: Number(bare[1]), confidence: lower(base) };
    }
  }
  return null;
}

function lower(c: Confidence): Confidence {
  return c === 'high' ? 'medium' : 'low';
}

const UNICODE_FRACTIONS: Record<string, string> = {
  '½': '1/2',
  '⅓': '1/3',
  '⅔': '2/3',
  '¼': '1/4',
  '¾': '3/4',
};

function parseAmount(raw: string): number | null {
  const s = raw.replace(/[½⅓⅔¼¾]/g, (c) => ` ${UNICODE_FRACTIONS[c] ?? ''}`).trim();
  const mixed = /^(\d+)\s+(\d+)\/(\d+)$/.exec(s);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  const frac = /^(\d+)\/(\d+)$/.exec(s);
  if (frac) return Number(frac[1]) / Number(frac[2]);
  const n = Number(s);
  return Number.isFinite(n) && s !== '' ? n : null;
}

function findServingSize(text: string, base: Confidence): ParsedValue<ParsedServing> | null {
  const m = /serv(?:ing)?\.?\s*size:?[ \t]*([^\n,]*(?:\([^)]*\))?)/.exec(text);
  if (!m) return null;
  let servingText = (m[1] ?? '').replace(/\s+/g, ' ').trim();
  let confidence = base;
  if (!servingText) {
    // Column-split OCR: the measure is on its own line later, e.g. "2/3 cup (55g)".
    const measure = text
      .slice(m.index)
      .split('\n')
      .slice(1)
      .map((line) => line.trim())
      .find((line) =>
        /^(about\s*)?[\d½⅓⅔¼¾][\d/ .]*\s*([a-z][a-z .]*)?\(?\s*\d+(\.\d+)?\s*(g|ml)\s*\)?$/.test(
          line,
        ),
      );
    if (!measure) return null;
    servingText = measure;
    confidence = lower(base);
  }

  const metric = /(\d+(?:\.\d+)?)\s*(g|ml)\b/.exec(servingText);
  const grams = metric?.[2] === 'g' ? Number(metric[1]) : null;
  const ml = metric?.[2] === 'ml' ? Number(metric[1]) : null;

  // Household measure before any parentheses: "2/3 cup", "1 bar", "about 9 crackers", "8 fl oz".
  const household =
    /^(?:about\s*)?([\d½⅓⅔¼¾]+(?:\s*[\d]+\/\d+|\/\d+)?)\s*([a-z][a-z .]*?)?\s*(?:\(|$)/.exec(
      servingText,
    );
  let amount = household?.[1] ? parseAmount(household[1]) : null;
  let unit = household?.[2]?.trim().replace(/\.$/, '') ?? '';
  if (amount === null && metric) {
    amount = Number(metric[1]);
    unit = metric[2] ?? '';
  }
  if (amount === null || amount <= 0) return null;
  if (unit === '' && metric) unit = metric[2] ?? '';

  return {
    value: {
      amount: Math.round(amount * 100) / 100,
      unit: unit || 'serving',
      grams,
      ml,
      text: servingText,
    },
    confidence: unit ? confidence : 'low',
  };
}

function findServingsPerContainer(text: string, base: Confidence): ParsedValue<number> | null {
  const before = new RegExp(
    String.raw`(about\s*)?${NUMBER}\s*servings?\s*per\s*(container|package|pkg)`,
  ).exec(text);
  const after = new RegExp(
    String.raw`servings?\s*per\s*(container|package|pkg)\.?:?\s*(about\s*)?${NUMBER}`,
  ).exec(text);
  const linear = new RegExp(String.raw`\bservings:\s*(about\s*)?${NUMBER}`).exec(text);
  const hit = before
    ? { value: Number(before[2]), about: !!before[1] }
    : after
      ? { value: Number(after[3]), about: !!after[2] }
      : linear
        ? { value: Number(linear[2]), about: !!linear[1] }
        : null;
  if (!hit) return null;
  return { value: hit.value, confidence: hit.about && base === 'high' ? 'medium' : base };
}

function parsePass(text: string, base: Confidence): ParsedLabel {
  const nutrients: ParsedLabel['nutrients'] = {};
  for (const spec of NUTRIENTS) {
    const hit =
      spec.key === 'added_sugar_g'
        ? (findAddedSugarsInclusive(text, base) ?? findNutrient(text, spec, base))
        : findNutrient(text, spec, base);
    if (hit) nutrients[spec.key] = { value: hit.value, confidence: hit.confidence };
  }
  return {
    servingSize: findServingSize(text, base),
    servingsPerContainer: findServingsPerContainer(text, base),
    calories: findCalories(text, base),
    nutrients,
  };
}

const rank: Record<Confidence, number> = { high: 3, medium: 2, low: 1 };

function better<T>(a: ParsedValue<T> | null | undefined, b: ParsedValue<T> | null | undefined) {
  if (!a) return b ?? null;
  if (!b) return a;
  return rank[b.confidence] > rank[a.confidence] ? b : a;
}

/** Prefer a serving that includes its metric amount, even if OCR repairs were needed for it. */
function betterServing(
  a: ParsedValue<ParsedServing> | null,
  b: ParsedValue<ParsedServing> | null,
): ParsedValue<ParsedServing> | null {
  const hasMetric = (x: ParsedValue<ParsedServing> | null) =>
    !!x && (x.value.grams !== null || x.value.ml !== null);
  if (hasMetric(b) && !hasMetric(a)) return b;
  return better(a, b);
}

/** Calories within 20% of protein×4 + carbs×4 + fat×9 (or close in absolute terms). */
export function caloriesMatchMacros(
  calories: number,
  macros: { proteinG: number; carbsG: number; fatG: number },
): boolean {
  const estimate = macros.proteinG * 4 + macros.carbsG * 4 + macros.fatG * 9;
  if (estimate === 0 && calories === 0) return true;
  return Math.abs(calories - estimate) <= Math.max(15, 0.2 * Math.max(calories, estimate));
}

export function parseNutritionLabel(ocrText: string): ParsedLabel {
  const cleaned = clean(ocrText);
  const first = parsePass(cleaned, 'high');
  const repaired = parsePass(repairOcr(cleaned), 'medium');

  const nutrients: ParsedLabel['nutrients'] = {};
  for (const { key } of NUTRIENTS) {
    const best = better(first.nutrients[key], repaired.nutrients[key]);
    if (best) nutrients[key] = best;
  }
  const result: ParsedLabel = {
    servingSize: betterServing(first.servingSize, repaired.servingSize),
    servingsPerContainer: better(first.servingsPerContainer, repaired.servingsPerContainer),
    calories: better(first.calories, repaired.calories),
    nutrients,
  };

  // Cross-check calories against macros; a mismatch usually means a misread digit.
  const { calories } = result;
  const p = nutrients.protein_g?.value;
  const c = nutrients.carbs_g?.value;
  const f = nutrients.fat_g?.value;
  if (calories && p !== undefined && c !== undefined && f !== undefined) {
    if (!caloriesMatchMacros(calories.value, { proteinG: p, carbsG: c, fatG: f })) {
      result.calories = { value: calories.value, confidence: 'low' };
    }
  }
  return result;
}
