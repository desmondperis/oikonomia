/* Show the shape of a statement file — headings and structure only.
 *
 * Cell contents are truncated hard so that somebody's transactions cannot end
 * up in a terminal or a chat. This is for working out why a file will not read,
 * not for reading it.
 */

import * as XLSX from 'xlsx';
import { readFileSync } from 'node:fs';
import { extname, basename } from 'node:path';

const path = process.argv[2];
const rows = Number(process.argv[3] || 12);
const bytes = readFileSync(path);
const kind = extname(path).toLowerCase();

console.log('file :', basename(path));
console.log('size :', Math.round(bytes.length / 1024), 'KB');

const head = bytes.subarray(0, 300).toString('utf8');
console.log('starts with:', JSON.stringify(head.slice(0, 60)));

const short = (cell) => String(cell ?? '').slice(0, 22);

if (kind === '.xls' || kind === '.xlsx') {
  const book = XLSX.read(bytes, { type: 'buffer', raw: false });
  console.log('sheets:', book.SheetNames);

  for (const name of book.SheetNames) {
    const grid = XLSX.utils.sheet_to_json(book.Sheets[name], {
      header: 1, raw: false, defval: '', blankrows: false
    });
    console.log(`\n-- sheet "${name}" (${grid.length} rows) --`);
    grid.slice(0, rows).forEach((row, index) =>
      console.log(String(index).padStart(3), JSON.stringify(row.map(short))));
  }
} else {
  const text = bytes.toString('utf8').replace(/\r\n?/g, '\n');
  const lines = text.split('\n');
  console.log('lines:', lines.length);
  lines.slice(0, rows).forEach((line, index) =>
    console.log(String(index).padStart(3), JSON.stringify(line.slice(0, 150))));
}
