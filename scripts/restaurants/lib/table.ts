/**
 * Turns positioned PDF text into table records. Pure (no PDF library), so it's unit-tested with
 * row fixtures captured from the real PDFs.
 *
 * Nutrition PDFs put a multi-line header above numeric columns ("Total / Fat / g"). We find the
 * header block by its nutrient keywords, cluster header words by x into columns, and map each
 * data row's numbers to those columns in order (falling back to nearest x when counts differ).
 */

export type Cell = { x: number; text: string };
export type Row = { page: number; y: number; cells: Cell[] };

export type Field =
  | 'serving'
  | 'calories'
  | 'calories_from_fat'
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
  | 'potassium_mg';

export type Column = { field: Field; x: number; unit: 'g' | 'ml' | 'mg' | 'mcg' | null };

export type RawRecord = {
  page: number;
  section: string | null;
  name: string;
  /** Text serving ("1ea (38.77g)", "4 oz", "Regular"). */
  serving: string | null;
  /** A numeric serving-size column ("Serving Size (g)" / "(ml)"). */
  servingAmount: { value: number; unit: 'g' | 'ml' } | null;
  values: Partial<Record<Exclude<Field, 'serving'>, string>>;
  /** True when the row's numbers didn't line up with the header and were placed by x. */
  layoutMismatch: boolean;
  /** True when the row had no name and inherited the previous row's (e.g. a size variant). */
  continued: boolean;
};

/** Field patterns, most specific first; a matched span is blanked so "fat" can't re-match it. */
const FIELD_PATTERNS: [Field, RegExp][] = [
  ['calories_from_fat', /calories\s*from\s*fat|from\s*fat/],
  ['calories', /calories|energy/],
  ['sat_fat_g', /saturated(\s*fats?)?|sat\.?\s*fat/],
  ['trans_fat_g', /trans(\s*fat)?/],
  ['added_sugar_g', /add(ed)?\.?\s*sugars?/],
  ['fat_g', /total\s*fat|\bfat\b/],
  ['cholesterol_mg', /cholest(erol)?\.?/],
  ['sodium_mg', /sodium/],
  ['carbs_g', /(total\s*)?carb(ohydrate)?s?\.?/],
  ['fiber_g', /(dietary\s*)?fib(er|re)/],
  ['sugar_g', /(total\s*)?sugars?/],
  ['protein_g', /protein/],
  ['vitamin_d_mcg', /vitamin\s*d|vit\.?\s*d/],
  ['calcium_mg', /calcium/],
  ['iron_mg', /\biron\b/],
  ['potassium_mg', /potassium|potas\.?/],
  ['serving', /serving(\s*size)?|portion|\bsize\b/],
];

/** Fields found in a header label, in left-to-right order. */
export function fieldsInLabel(label: string): Field[] {
  let text = label.toLowerCase();
  const found: { index: number; field: Field }[] = [];
  for (const [field, pattern] of FIELD_PATTERNS) {
    const re = new RegExp(pattern.source, 'g');
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      if (m[0].length === 0) {
        re.lastIndex += 1;
        continue;
      }
      found.push({ index: m.index, field });
      text = text.slice(0, m.index) + ' '.repeat(m[0].length) + text.slice(m.index + m[0].length);
      re.lastIndex = m.index + m[0].length;
    }
  }
  return found.sort((a, b) => a.index - b.index).map((f) => f.field);
}

const UNIT_ONLY = /^\(?(g|ml|mg|mcg|kcal)\)?$/i;

function unitOf(label: string): Column['unit'] {
  const m = /\((mcg|mg|ml|g)\)|\b(mcg|mg|ml|g)\b/i.exec(label);
  const unit = (m?.[1] ?? m?.[2])?.toLowerCase();
  return unit === 'g' || unit === 'ml' || unit === 'mg' || unit === 'mcg' ? unit : null;
}

/** All-caps words in a header that aren't column labels: the rest of a split section title. */
function sectionWords(headerRows: Row[]): string[] {
  return headerRows
    .flatMap((r) => r.cells)
    .map((c) => c.text)
    .filter(
      (t) => /^[A-Z][A-Z&'’-]{2,}$/.test(t) && fieldsInLabel(t).length === 0 && !UNIT_ONLY.test(t),
    );
}

function isHeaderRow(row: Row): boolean {
  const fields = new Set(row.cells.flatMap((c) => fieldsInLabel(c.text)));
  fields.delete('serving');
  return fields.size >= 3;
}

/** Could this row be part of a multi-line header? (Short labels; not prose, banners, or data.) */
function isHeaderLine(row: Row): boolean {
  if (row.cells.some((c) => isNumericCell(c.text) || c.text.length > 40)) return false;
  const joined = row.cells.map((c) => c.text).join(' ');
  if (looksLikeSection(joined) && !isHeaderRow(row)) return false;
  return true;
}

/** Columns from a block of header rows (top first). */
export function buildColumns(headerRows: Row[], gap = 14): Column[] {
  const tokens = headerRows
    .flatMap((row) => row.cells.map((c) => ({ ...c, y: row.y })))
    .sort((a, b) => a.x - b.x);
  const clusters: (typeof tokens)[] = [];
  for (const token of tokens) {
    const last = clusters[clusters.length - 1];
    const lastX = last?.[last.length - 1]?.x;
    if (last && lastX !== undefined && token.x - lastX <= gap) last.push(token);
    else clusters.push([token]);
  }
  // A cluster that's only a unit ("mg", "(g)") belongs to the column on its left.
  const merged: (typeof tokens)[] = [];
  for (const cluster of clusters) {
    const prev = merged[merged.length - 1];
    if (prev && cluster.every((t) => UNIT_ONLY.test(t.text))) prev.push(...cluster);
    else merged.push(cluster);
  }

  const columns: Column[] = [];
  for (const cluster of merged) {
    const label = [...cluster]
      .sort((a, b) => b.y - a.y || a.x - b.x)
      .map((t) => t.text)
      .join(' ');
    const fields = fieldsInLabel(label);
    if (fields.length === 0) continue;
    const xs = cluster.map((t) => t.x);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    fields.forEach((field, i) => {
      // Several fields in one cell ("Sugars (g) Protein (g)"): spread them across its width.
      const x = fields.length === 1 ? (minX + maxX) / 2 : minX + i * 25;
      columns.push({ field, x, unit: unitOf(label) });
    });
  }
  return columns;
}

const NUMERIC = /^<?\s*\d+(\.\d+)?$/;

export function isNumericCell(text: string): boolean {
  return NUMERIC.test(text.trim());
}

function looksLikeSection(text: string): boolean {
  // Document codes and dates ("OCT-2024-US-CK") aren't section titles.
  if (/\b(19|20)\d{2}\b/.test(text) || /^[A-Z]{2,}-[A-Z0-9-]+$/.test(text.trim())) return false;
  const letters = text.replace(/[^a-z]/gi, '');
  if (letters.length < 3 || text.length > 70) return false;
  const upper = letters.replace(/[^A-Z]/g, '').length;
  return upper / letters.length > 0.7;
}

/**
 * Extracts records from rows (all pages, top-to-bottom within a page). Rows before the first
 * header are ignored; the last header's columns carry over to following pages without one.
 */
export function extractRecords(rows: Row[]): RawRecord[] {
  const records: RawRecord[] = [];
  let columns: Column[] | null = null;
  let section: string | null = null;
  let lastName: string | null = null;
  /** Where item names start on the current table (the first text cell of named rows). */
  let nameX: number | null = null;

  const pages = [...new Set(rows.map((r) => r.page))].sort((a, b) => a - b);
  for (const page of pages) {
    const pageRows = rows.filter((r) => r.page === page).sort((a, b) => b.y - a.y);
    for (let i = 0; i < pageRows.length; i++) {
      const row = pageRows[i];
      if (!row) continue;

      if (isHeaderRow(row)) {
        // Merge neighbouring header lines (multi-line headers), but not prose (disclaimers
        // mentioning "sodium"), banners, or section titles.
        const block: Row[] = [row];
        let j = i - 1;
        while (j >= 0 && block.length < 4) {
          const prev = pageRows[j] as Row;
          if (prev.y - (block[0] as Row).y > 16 || !isHeaderLine(prev)) break;
          block.unshift(prev);
          j -= 1;
        }
        let k = i + 1;
        while (k < pageRows.length && block.length < 5) {
          const next = pageRows[k] as Row;
          if ((block[block.length - 1] as Row).y - next.y > 16 || !isHeaderLine(next)) break;
          block.push(next);
          k += 1;
        }
        columns = buildColumns(block);
        // "BONELESS" above the table + "WINGS" inside the header → "BONELESS WINGS".
        const extra = sectionWords(block).filter((w) => !(section ?? '').split(' ').includes(w));
        if (section && extra.length) section = `${section} ${extra.join(' ')}`;
        i = k - 1;
        lastName = null;
        continue;
      }
      const text = row.cells.filter((c) => !isNumericCell(c.text));
      if (!row.cells.some((c) => isNumericCell(c.text))) {
        // Section titles ("CLASSIC WINGS", "FRIES") can sit above a table's header.
        const joined = text
          .map((c) => c.text)
          .join(' ')
          .trim();
        if (looksLikeSection(joined)) {
          section = joined;
          lastName = null;
        }
        continue;
      }
      if (!columns) continue;

      const maxX = Math.max(...columns.map((c) => c.x)) + 30;
      const numeric = row.cells.filter((c) => isNumericCell(c.text) && c.x <= maxX);
      if (numeric.length === 0) continue;

      const servingColumns = columns.filter((c) => c.field === 'serving');
      const servingNumericColumn = servingColumns.find((c) => c.unit === 'g' || c.unit === 'ml');
      const servingTextColumn = servingColumns.find((c) => c !== servingNumericColumn);
      const valueColumns = columns.filter(
        (c) => c.field !== 'serving' || c === servingNumericColumn,
      );
      const firstNumericX = Math.min(...numeric.map((c) => c.x));

      // Name: text left of the numbers; serving text: the text cell nearest a serving column.
      let servingText: string | null = null;
      let nameCells = text.filter((c) => c.x < firstNumericX);
      const servingAnchor = servingTextColumn ?? servingNumericColumn;
      if (servingAnchor && nameCells.length > 0) {
        // A lone cell counts as a serving only if it sits at the serving column, right of where
        // names start (a size variant like "32 fl oz" under the item above).
        const loneIsServing =
          nameCells.length === 1 && nameX !== null && (nameCells[0]?.x ?? 0) > nameX + 40;
        const candidates = nameCells.filter(
          (c) => c.x >= servingAnchor.x - 60 && (c !== nameCells[0] || loneIsServing),
        );
        const nearest = candidates.sort(
          (a, b) => Math.abs(a.x - servingAnchor.x) - Math.abs(b.x - servingAnchor.x),
        )[0];
        if (nearest) {
          servingText = nearest.text;
          nameCells = nameCells.filter((c) => c !== nearest);
        }
      }
      let name = nameCells
        .map((c) => c.text)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      let continued = false;
      if (!name && lastName) {
        name = lastName;
        continued = true;
      }
      if (!name) continue;
      if (!continued) nameX = nameCells[0]?.x ?? nameX;
      lastName = name;

      const values: RawRecord['values'] = {};
      let servingAmount: RawRecord['servingAmount'] = null;
      const assign = (column: Column, cell: Cell) => {
        if (column.field === 'serving') {
          const value = Number(cell.text.replace(/[<\s]/g, ''));
          if (Number.isFinite(value) && (column.unit === 'g' || column.unit === 'ml')) {
            servingAmount = { value, unit: column.unit };
          }
        } else if (values[column.field] === undefined) {
          values[column.field] = cell.text;
        }
      };
      let layoutMismatch = false;
      if (numeric.length === valueColumns.length) {
        numeric.forEach((cell, idx) => {
          const column = valueColumns[idx];
          if (column) assign(column, cell);
        });
      } else {
        layoutMismatch = true;
        for (const cell of numeric) {
          const column = [...valueColumns].sort(
            (a, b) => Math.abs(a.x - cell.x) - Math.abs(b.x - cell.x),
          )[0];
          if (column) assign(column, cell);
        }
      }

      records.push({
        page,
        section,
        name,
        serving: servingText,
        servingAmount,
        values,
        layoutMismatch,
        continued,
      });
    }
  }
  return records;
}
