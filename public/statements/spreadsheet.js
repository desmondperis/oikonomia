/* Reading the file a bank calls "Excel".
 *
 * Every Indian bank offers an Excel download and they mean three different
 * things by it:
 *
 *   · a genuine old-format Excel file, from HDFC and most others
 *   · a modern .xlsx, from ICICI and Axis
 *   · an HTML table saved with an .xls name, which SBI is fond of
 *
 * A household should not have to know which of those they have. All three are
 * opened here, on the device, and become the same grid of cells that a CSV
 * becomes — so the columns, the dates, the amounts and the balance check are
 * read by exactly the same code that has already been tested against them.
 */

import { tableFromRows } from './csv.js';

const XLSX_URL = new URL('../vendor/xlsx.mjs', import.meta.url).href;

let library = null;

/** Loaded only when somebody actually opens a spreadsheet. */
async function loadReader() {
  if (library) return library;
  const module = await import(XLSX_URL);
  library = module.default || module;
  return library;
}

export function isSpreadsheet(file) {
  return /\.(xlsx|xls|xlsm|xlsb|ods)$/i.test(file.name) ||
    /spreadsheet|excel/i.test(file.type || '');
}

/**
 * Read a spreadsheet into the same table a CSV produces.
 *
 * Cells are taken as they are displayed rather than as stored, so a date that
 * reads 04/07/2026 on screen arrives here as those characters. Dates are forced
 * day-first, because that is what an Indian bank means and reading it the other
 * way round is silently wrong for eleven days in twelve.
 */
/** Does this file only pretend to be a spreadsheet? */
function looksLikeHtml(bytes) {
  const start = new TextDecoder('utf-8', { fatal: false })
    .decode(bytes.slice(0, 1024))
    .trim()
    .toLowerCase();

  return start.startsWith('<') &&
    (start.includes('<html') || start.includes('<table') || start.includes('<!doctype'));
}

/**
 * Read an HTML table exactly as written.
 *
 * This is done by hand rather than by the spreadsheet reader, and for a reason
 * worth recording: handed an HTML cell reading 04/07/2026, that reader decides
 * it is a date, reads it American-fashion as the seventh of April, and hands
 * back a value already wrong. Nothing downstream could tell. Taking the text
 * exactly as the bank wrote it removes the guess entirely.
 */
function readHtmlTable(bytes) {
  const html = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  const document_ = new DOMParser().parseFromString(html, 'text/html');

  let best = { grid: [], cells: -1 };

  for (const table of document_.querySelectorAll('table')) {
    const grid = [];
    let cells = 0;

    for (const row of table.querySelectorAll('tr')) {
      const values = [];
      for (const cell of row.querySelectorAll('td, th')) {
        values.push((cell.textContent || '').replace(/\s+/g, ' ').trim());
        cells++;
      }
      if (values.length > 0) grid.push(values);
    }

    if (cells > best.cells) best = { grid, cells };
  }

  return tableFromRows(best.grid);
}

export async function readSpreadsheet(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());

  // SBI and others hand out an HTML table with an .xls name.
  if (looksLikeHtml(bytes)) return readHtmlTable(bytes);

  const xlsx = await loadReader();
  const data = bytes;

  const workbook = xlsx.read(data, {
    type: 'array',
    cellDates: false,
    dateNF: 'dd/mm/yyyy',
    // Some bank exports carry the account summary in odd corners of the sheet.
    raw: false
  });

  // A statement is nearly always the first sheet, but some banks put a cover
  // sheet first. Take whichever sheet actually contains a transaction table.
  let best = { table: null, rows: -1 };

  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name];
    if (!sheet) continue;

    const grid = xlsx.utils.sheet_to_json(sheet, {
      header: 1,
      raw: false,
      defval: '',
      blankrows: false,
      dateNF: 'dd/mm/yyyy'
    });

    const table = tableFromRows(grid.map((row) => row.map((cell) => String(cell ?? ''))));

    if (table.columns && table.rows.length > best.rows) {
      best = { table, rows: table.rows.length };
    }

    // Keep something to report even if no sheet has a recognisable table.
    if (!best.table && grid.length > 0) {
      best = { table, rows: -1 };
    }
  }

  return best.table || { columns: null, rows: [], preamble: [] };
}
