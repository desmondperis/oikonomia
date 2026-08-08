/* CSV, TSV and the Excel exports every bank offers.
 *
 * These need no layout recovery — the columns are already columns. They still
 * go through exactly the same reading and balance-checking as a PDF, so a CSV
 * is never trusted more than a statement we had to work harder to read.
 */

import { looksLikeHeader, readColumnRole } from './fields.js';

/** Split one delimited line, respecting quotes. */
function splitLine(line, delimiter) {
  const cells = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < line.length; index++) {
    const char = line[index];

    if (quoted) {
      if (char === '"') {
        if (line[index + 1] === '"') { cell += '"'; index++; }
        else quoted = false;
      } else {
        cell += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === delimiter) {
      cells.push(cell.trim());
      cell = '';
    } else {
      cell += char;
    }
  }

  cells.push(cell.trim());
  return cells;
}

/** Whichever separator produces the most consistent columns wins. */
function detectDelimiter(lines) {
  const candidates = [',', '\t', ';', '|'];
  let best = ',';
  let bestScore = 0;

  for (const delimiter of candidates) {
    const counts = lines
      .slice(0, 40)
      .map((line) => splitLine(line, delimiter).length)
      .filter((count) => count > 1);

    if (counts.length === 0) continue;

    const most = Math.max(...counts);
    const agreeing = counts.filter((count) => count === most).length;
    const score = most * agreeing;

    if (score > bestScore) { bestScore = score; best = delimiter; }
  }

  return best;
}

/** Read delimited text into the same shape a PDF table produces. */
export function readDelimited(text) {
  const lines = String(text)
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .filter((line) => line.trim() !== '');

  if (lines.length === 0) {
    return { columns: null, rows: [], preamble: [] };
  }

  const delimiter = detectDelimiter(lines);
  const table = lines.map((line) => splitLine(line, delimiter));

  // Banks put an account summary above the table, so the heading row is rarely
  // the first line of the file.
  const headerIndex = table.findIndex((cells) => looksLikeHeader(cells));

  if (headerIndex === -1) {
    return {
      columns: null,
      rows: [],
      preamble: table.map((cells) => cells.join(' ').trim())
    };
  }

  const columns = table[headerIndex].map((heading) => ({
    role: readColumnRole(heading),
    heading: String(heading).trim(),
    from: -Infinity,
    to: Infinity
  }));

  const rows = table
    .slice(headerIndex + 1)
    .map((cells) => columns.map((_, index) => (cells[index] ?? '').trim()));

  const preamble = table
    .slice(0, headerIndex)
    .map((cells) => cells.join(' ').trim());

  return { columns, rows, preamble };
}
