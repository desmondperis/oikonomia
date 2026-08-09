/* Generate the three things Indian banks mean when they say "Excel".
 *
 * Not real statements — invented figures, in the shapes the real files take:
 * a modern .xlsx, a genuine old-format .xls, and an HTML table wearing an .xls
 * name, which is what SBI's download often is.
 */

import * as XLSX from 'xlsx';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'public', 'test-fixtures');
mkdirSync(out, { recursive: true });

/* A preamble above the table, as every bank puts there. */
const GRID = [
  ['HDFC BANK LTD'],
  ['Statement of Accounts'],
  ['Account No : 50100123456789'],
  [],
  ['Date', 'Narration', 'Chq./Ref.No.', 'Value Dt', 'Withdrawal Amt.', 'Deposit Amt.', 'Closing Balance'],
  ['04/07/2026', 'UPI-SWIGGY-SWIGGY@YBL-YESB', '0000418512345678', '04/07/2026', '620.00', '', '45380.00'],
  ['05/07/2026', 'SALARY JULY 2026', 'NEFT0000123', '05/07/2026', '', '72000.00', '117380.00'],
  ['07/07/2026', 'UPI-RENT-LANDLORD@OKAXIS', '0000418598765432', '07/07/2026', '18000.00', '', '99380.00'],
  ['09/07/2026', 'ATM WDL SELF', 'ATM00912', '09/07/2026', '5000.00', '', '94380.00'],
  ['12/07/2026', 'UPI-BIGBASKET-BB@OKICICI', '0000418511111111', '12/07/2026', '3250.50', '', '91129.50']
];

const sheet = XLSX.utils.aoa_to_sheet(GRID);
const book = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(book, sheet, 'Statement');

// 1. A modern spreadsheet, as ICICI and Axis provide.
XLSX.writeFile(book, join(out, 'sample.xlsx'), { bookType: 'xlsx' });

// 2. A genuine old-format Excel file, as HDFC provides.
XLSX.writeFile(book, join(out, 'sample.xls'), { bookType: 'biff8' });

// 3. An HTML table with an .xls name, as SBI often provides.
const html = `<html><head><meta charset="utf-8"></head><body>
<table border="1">
${GRID.map((row) => `<tr>${row.map((cell) => `<td>${cell ?? ''}</td>`).join('')}</tr>`).join('\n')}
</table>
</body></html>`;

writeFileSync(join(out, 'sample-html.xls'), html, 'utf8');

console.log('✓ three spreadsheet fixtures written to public/test-fixtures');
