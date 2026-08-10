/* Run real bank statements through the reader, locally.
 *
 *   node scripts/inspect-real.mjs "path/to/statement.pdf" ...
 *   node scripts/inspect-real.mjs "path/to/folder"
 *
 * Nothing is uploaded and nothing is written out. It reports counts, the columns
 * it recognised, and whether the figures reconcile — never the transactions
 * themselves — so it can be run against somebody's actual statement without
 * their spending appearing in a terminal, a log, or a chat.
 */

import * as XLSX from 'xlsx';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname, basename } from 'node:path';

import { tableFromRows, readDelimited } from '../public/statements/csv.js';
import { readFixedWidth } from '../public/statements/fixed.js';
import { toTable } from '../public/statements/table.js';
import { readStatement } from '../public/statements/statement.js';
import { identifyBank, findAccountEnding } from '../public/statements/banks.js';

const rupees = (paise) =>
  paise === null ? 'not known'
    : `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

/* ---------- getting a table out of each kind of file ---------- */

function fromSpreadsheet(bytes) {
  const book = XLSX.read(bytes, { type: 'buffer', raw: false, dateNF: 'dd/mm/yyyy' });

  let best = null;
  for (const name of book.SheetNames) {
    const grid = XLSX.utils.sheet_to_json(book.Sheets[name], {
      header: 1, raw: false, defval: '', blankrows: false, dateNF: 'dd/mm/yyyy'
    });
    const table = tableFromRows(grid.map((row) => row.map((cell) => String(cell ?? ''))));
    if (table.columns && (!best || table.rows.length > best.rows.length)) best = table;
  }
  return best || { columns: null, rows: [], preamble: [] };
}

/** An HTML table wearing a spreadsheet's name, read as written. */
function fromHtml(text) {
  const rows = [];
  const tableMatch = [...text.matchAll(/<tr[\s\S]*?<\/tr>/gi)];

  for (const [row] of tableMatch) {
    const cells = [...row.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)]
      .map(([, cell]) => cell
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/\s+/g, ' ')
        .trim());
    if (cells.length > 0) rows.push(cells);
  }

  return tableFromRows(rows);
}

async function fromPdf(bytes, password) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');

  const pdf = await pdfjs.getDocument({
    data: new Uint8Array(bytes),
    password,
    useSystemFonts: false,
    isEvalSupported: false
  }).promise;

  const items = [];
  let pageTop = 0;

  for (let number = 1; number <= pdf.numPages; number++) {
    const page = await pdf.getPage(number);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();

    for (const item of content.items) {
      if (typeof item.str !== 'string' || item.str.trim() === '') continue;
      items.push({
        text: item.str,
        x: item.transform[4],
        y: pageTop + (viewport.height - item.transform[5]),
        width: item.width || 0
      });
    }

    pageTop += viewport.height;
    page.cleanup();
  }

  const pages = pdf.numPages;
  try { await pdf.cleanup(); } catch { /* nothing to tidy */ }
  return { table: toTable(items), pages, scraps: items.length };
}

async function tableFor(path) {
  const bytes = readFileSync(path);
  const kind = extname(path).toLowerCase();
  const head = bytes.subarray(0, 512).toString('utf8').trim().toLowerCase();

  if (kind === '.pdf') {
    const { table, pages, scraps } = await fromPdf(bytes, process.env.PDF_PASSWORD || undefined);
    return { table, note: `${pages} pages, ${scraps} scraps of text` };
  }

  if (head.startsWith('<') && (head.includes('<table') || head.includes('<html'))) {
    return { table: fromHtml(bytes.toString('utf8')), note: 'HTML wearing a spreadsheet name' };
  }

  if (kind === '.xls' || kind === '.xlsx' || kind === '.xlsm') {
    return { table: fromSpreadsheet(bytes), note: 'spreadsheet' };
  }

  const text = bytes.toString('utf8');

  const delimited = readDelimited(text);
  if (delimited.columns) return { table: delimited, note: 'delimited text' };

  // Some banks mean fixed-width columns when they say "text".
  const fixed = readFixedWidth(text);
  if (fixed.columns) return { table: fixed, note: 'fixed-width text' };

  return { table: delimited, note: 'text, no table recognised' };
}

/* ---------- reporting ---------- */

async function examine(path) {
  const name = basename(path);
  console.log(`\n──────── ${name}`);

  let table;
  let note;
  try {
    ({ table, note } = await tableFor(path));
  } catch (error) {
    console.log('  could not open   :', String(error?.message || error).slice(0, 120));
    return { name, ok: false };
  }

  console.log('  kind             :', note);

  if (!table.columns) {
    console.log('  RESULT           : no transaction table found');
    return { name, ok: false };
  }

  const result = readStatement(table);
  const { verification: check, summary } = result;
  const bank = identifyBank(table.preamble, table.columns);

  console.log('  bank             :', bank.name, '· account ending', findAccountEnding(table.preamble) || '?');
  console.log('  columns          :', table.columns.filter((c) => c.role).map((c) => `${c.heading.trim()}→${c.role}`).join('  '));
  console.log('  transactions     :', summary.count, '· set aside', result.skipped.length);
  console.log('  period           :', summary.from, 'to', summary.to);
  console.log('  money out / in   :', rupees(summary.debits), '/', rupees(summary.credits));
  console.log('  opening / closing:', rupees(summary.openingPaise), '/', rupees(summary.closingPaise));
  console.log('  balance checks   :', `${check.matched}/${check.checked}`,
    check.reason ? `(${check.reason})` : '');
  console.log('  RESULT           :', check.confident ? 'reconciles' : 'DOES NOT RECONCILE');

  if (check.mismatches.length > 0) {
    console.log('  rows that disagree (dates and amounts only):');
    for (const bad of check.mismatches.slice(0, 6)) {
      console.log('   ', bad.date, 'expected', rupees(bad.expectedMovement), 'actual', rupees(bad.actualMovement));
    }
  }

  return { name, ok: check.confident, count: summary.count, bank: bank.name };
}

/* ---------- go ---------- */

const given = process.argv.slice(2);
const paths = [];

for (const path of given) {
  if (statSync(path).isDirectory()) {
    for (const entry of readdirSync(path)) paths.push(join(path, entry));
  } else {
    paths.push(path);
  }
}

const summary = [];
for (const path of paths.sort()) summary.push(await examine(path));

console.log('\n════════ summary ════════');
for (const item of summary) {
  console.log(' ', item.ok ? '✓' : '✗', item.name.padEnd(50),
    item.count !== undefined ? `${item.count} transactions · ${item.bank}` : '');
}
