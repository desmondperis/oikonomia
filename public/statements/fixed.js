/* Statements printed as plain text, in columns held apart by spaces.
 *
 * Every bank offers a "text" or "delimited" download and some of them mean this:
 * a page of fixed-width columns with a row of dashes marking where each one
 * begins and ends, exactly as it would look on a printer in 1994.
 *
 * That row of dashes is a gift. It states the column boundaries precisely, so
 * nothing has to be inferred from where the spaces happen to fall — which is
 * what makes reading these reliable rather than a guess.
 */

import { tableFromRows } from './csv.js';

/* A line of dashes with gaps: -------  ----------  -------- */
const RULE = /^[\s-]*-{3,}[\s-]*$/;

/** Where each column starts and ends, from the row of dashes. */
function columnsFromRule(line) {
  const spans = [];
  const pattern = /-+/g;
  let match;

  while ((match = pattern.exec(line)) !== null) {
    spans.push({ from: match.index, to: match.index + match[0].length });
  }

  return spans;
}

/** Cut one line into the columns the dashes describe. */
function slice(line, spans) {
  return spans.map(({ from, to }, index) => {
    // The last column runs to the end, since figures often overflow their rule.
    const end = index === spans.length - 1 ? line.length : to + 2;
    return line.slice(from, end).trim();
  });
}

/**
 * Read a fixed-width statement.
 *
 * Returns the same table a CSV produces, so the columns, dates, amounts and the
 * balance check are all read by the code already tested against them.
 */
export function readFixedWidth(text) {
  const lines = String(text).replace(/\r\n?/g, '\n').split('\n');

  // The first row of dashes with several columns marks the table.
  let ruleAt = -1;
  let spans = [];

  for (let index = 0; index < lines.length; index++) {
    if (!RULE.test(lines[index])) continue;
    const found = columnsFromRule(lines[index]);
    if (found.length >= 4) { ruleAt = index; spans = found; break; }
  }

  if (ruleAt === -1) return { columns: null, rows: [], preamble: [] };

  /* The headings sit next to the rule — above it on some statements, below it
     on others, since HDFC rules the table both over and under its headings.
     They are read by splitting on runs of whitespace rather than by the rule's
     own positions, because banks pad headings with tabs and a tab is not a
     fixed number of columns. */
  let headings = [];
  let headingsAt = -1;

  const nearby = [];
  for (let step = 1; step <= 3; step++) nearby.push(ruleAt - step, ruleAt + step);

  for (const index of nearby) {
    if (index < 0 || index >= lines.length) continue;
    const candidate = lines[index].replace(/\t+/g, '  ').trim().split(/\s{2,}/).filter(Boolean);
    if (candidate.length === spans.length) { headings = candidate; headingsAt = index; break; }
  }

  if (headings.length !== spans.length) return { columns: null, rows: [], preamble: [] };

  // Transactions begin after both the headings and the rule that frames them.
  const startAt = Math.max(ruleAt, headingsAt) + 1;

  const body = [];
  for (let index = startAt; index < lines.length; index++) {
    const line = lines[index];

    // A second rule closes the table on some statements; a third opens a new
    // page's worth of the same one.
    if (RULE.test(line)) continue;
    if (line.trim() === '') continue;

    // Page furniture repeats the headings and the bank's name partway down.
    if (/^\s*(page no|statement of accounts|hdfc bank|state bank|icici|axis bank)/i.test(line)) continue;

    const cells = slice(line, spans);
    if (cells.some((cell) => cell !== '')) body.push(cells);
  }

  const preamble = lines.slice(0, Math.min(ruleAt, headingsAt < 0 ? ruleAt : headingsAt))
    .filter((line) => line.trim() !== '');

  return tableFromRows([headings, ...body], preamble);
}
