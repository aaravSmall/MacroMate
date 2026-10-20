/**
 * Extract: download (or read) each chain's official nutrition PDF, parse its tables, normalize,
 * validate, and write a reviewable JSON file to scripts/restaurants/output/<chain>.json.
 * Nothing is uploaded. Usage: npm run restaurants:extract [-- wingstop chipotle …]
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { CHAINS } from './chains';
import { normalizeRecords } from './lib/normalize';
import { readPdfRows } from './lib/pdfRows';
import { extractRecords } from './lib/table';
import { validateItems } from './lib/validate';

const HERE = dirname(fileURLToPath(import.meta.url));
const CACHE = join(HERE, '.cache');
const OUTPUT = join(HERE, 'output');
const USER_AGENT = 'MacroMate-restaurant-import/0.1 (https://github.com/aaravSmall/MacroMate)';

async function loadPdf(url: string, chainId: string): Promise<Uint8Array> {
  if (!/^https?:/i.test(url)) return new Uint8Array(readFileSync(resolve(HERE, url)));
  mkdirSync(CACHE, { recursive: true });
  const cached = join(CACHE, `${chainId}.pdf`);
  if (existsSync(cached) && !process.argv.includes('--refresh')) {
    return new Uint8Array(readFileSync(cached));
  }
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!response.ok) throw new Error(`${chainId}: download failed (${response.status}) ${url}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  writeFileSync(cached, bytes);
  return bytes;
}

async function extractChain(chainId: string) {
  const config = CHAINS[chainId];
  if (!config)
    throw new Error(`Unknown chain "${chainId}". Known: ${Object.keys(CHAINS).join(', ')}`);
  const pdf = await loadPdf(config.source.url, chainId);
  const rows = await readPdfRows(pdf, config.pages);
  const records = extractRecords(rows);
  const { ready, flagged } = validateItems(normalizeRecords(config, records));

  mkdirSync(OUTPUT, { recursive: true });
  const out = {
    chain: config.id,
    name: config.name,
    source: {
      url: config.source.url,
      note: config.source.note ?? null,
      sha256: createHash('sha256').update(pdf).digest('hex'),
    },
    extractedAt: new Date().toISOString(),
    counts: { items: ready.length, flagged: flagged.length },
    review:
      'Check items against the PDF. Flagged items are not uploaded unless you set "approved": true on them.',
    items: ready,
    flagged,
  };
  const file = join(OUTPUT, `${config.id}.json`);
  writeFileSync(file, `${JSON.stringify(out, null, 2)}\n`);
  console.log(`${config.name}: ${ready.length} items ready, ${flagged.length} flagged → ${file}`);
  for (const item of flagged) console.log(`  ⚑ ${item.food.name}: ${item.reasons.join(' ')}`);
}

const requested = process.argv.slice(2).filter((a) => !a.startsWith('--'));
for (const chainId of requested.length ? requested : Object.keys(CHAINS)) {
  await extractChain(chainId);
}
