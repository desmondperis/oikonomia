/* Run a real bank statement through the reader, locally.
 *
 *   node scripts/inspect-real.mjs "path/to/statement.xls"
 *
 * Nothing is uploaded and nothing is written out. It reports only counts and
 * whether the figures reconcile — never the transactions themselves — so it can
 * be run against somebody's actual statement without their spending appearing
 * in a terminal, a log, or a chat.
 */

import * as XLSX from 'xlsx';
import { readFileSync } from 'node:fs';

import { tableFromRows } from '../public/statements/csv.js';
import { readStatement } from '../public/statements/statement.js';
import { identifyBank, findAccountEnding } from '../public/statements/banks.js';

const path = process.argv[2];
if (!path) {
  console.error('Give it a statement to read.');
  process.exit(1);
}

const book = XLSX.read(readFileSync(path), {
  type: 'buffer', raw: false, dateNF: 'dd/mm/yyyy'
});

const rupees = (paise) => `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

for (const name of book.SheetNames) {
  const grid = XLSX.utils.sheet_to_json(book.Sheets[name], {
    header: 1, raw: false, defval: '', blankrows: false, dateNF: 'dd/mm/yyyy'
  });

  const table = tableFromRows(grid.map((row) => row.map((cell) => String(cell ?? ''))));
  if (!table.columns) {
    console.log(`sheet "${name}": no transaction table found`);
    continue;
  }

  const result = readStatement(table);
  const { verification: check, summary } = result;

  console.log(`\n=== ${identifyBank(table.preamble, table.columns).name}, account ending ${findAccountEnding(table.preamble)} ===`);
  console.log('columns read     :', table.columns.filter((c) => c.role).map((c) => `${c.heading} → ${c.role}`).join('\n                   '));
  console.log('rows in sheet    :', grid.length);
  console.log('transactions     :', summary.count);
  console.log('rows set aside   :', result.skipped.length);
  console.log('period           :', summary.from, 'to', summary.to);
  console.log('money out        :', rupees(summary.debits));
  console.log('money in         :', rupees(summary.credits));
  console.log('opening balance  :', summary.openingPaise === null ? 'not known' : rupees(summary.openingPaise));
  console.log('closing balance  :', summary.closingPaise === null ? 'not known' : rupees(summary.closingPaise));
  console.log('balance checks   :', `${check.matched}/${check.checked}`);
  console.log('reconciles       :', check.confident ? 'yes' : 'NO');

  if (check.mismatches.length > 0) {
    console.log('\nrows that do not add up (dates only, no detail):');
    for (const bad of check.mismatches.slice(0, 10)) {
      console.log('  ', bad.date, ' expected movement', rupees(bad.expectedMovement),
        ' actual', rupees(bad.actualMovement));
    }
  }
}
