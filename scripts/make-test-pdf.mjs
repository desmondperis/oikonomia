/* Generate a statement PDF shaped like a real bank export, for testing the
 * reader end to end in a browser. Not a real statement — invented figures.
 *
 *   node scripts/make-test-pdf.mjs [rows] [outputPath] [password]
 */

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const rowCount = Number(process.argv[2] || 60);
const output = process.argv[3] || resolve(root, 'public', 'test-fixtures', 'hdfc-sample.pdf');

const COLUMNS = [
  { title: 'Date',            x: 40,  align: 'left'  },
  { title: 'Narration',       x: 100, align: 'left'  },
  { title: 'Chq./Ref.No.',    x: 300, align: 'left'  },
  { title: 'Withdrawal Amt.', x: 390, align: 'right' },
  { title: 'Deposit Amt.',    x: 465, align: 'right' },
  { title: 'Closing Balance', x: 555, align: 'right' }
];

const MERCHANTS = [
  'UPI-SWIGGY-SWIGGY@YBL-YESB', 'UPI-ZOMATO-ZOMATO@PAYTM', 'UPI-BIGBASKET-BB@OKICICI',
  'ATM WDL SELF', 'UPI-JIO RECHARGE-JIO@IBL', 'NEFT-LIC PREMIUM',
  'UPI-AUTO RICKSHAW-Q123@YBL', 'UPI-APOLLO PHARMACY-APOLLO@HDFCBANK',
  'IMPS-SCHOOL FEES', 'UPI-ELECTRICITY BILL-BESCOM@SBI', 'UPI-KIRANA STORE-RAJU@OKAXIS'
];

function money(paise) {
  const rupees = (paise / 100).toFixed(2);
  const [whole, fraction] = rupees.split('.');
  // Indian grouping: last three, then pairs.
  const last3 = whole.slice(-3);
  const rest = whole.slice(0, -3);
  const grouped = rest ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3 : last3;
  return `${grouped}.${fraction}`;
}

const document = await PDFDocument.create();
const font = await document.embedFont(StandardFonts.Helvetica);
const bold = await document.embedFont(StandardFonts.HelveticaBold);

let page = null;
let y = 0;
let balance = 4600000; // ₹46,000 opening
let day = 1;
let month = 7;
let year = 26;

function newPage() {
  page = document.addPage([612, 792]);
  y = 750;

  page.drawText('HDFC BANK LTD', { x: 40, y, size: 12, font: bold });
  y -= 16;
  page.drawText('Statement of Accounts', { x: 40, y, size: 9, font });
  y -= 14;
  page.drawText('Account No : 50100123456789', { x: 40, y, size: 9, font });
  y -= 14;
  page.drawText('Statement Period : 01/07/2026 to 31/08/2026', { x: 40, y, size: 9, font });
  y -= 26;

  for (const column of COLUMNS) {
    const width = bold.widthOfTextAtSize(column.title, 8);
    page.drawText(column.title, {
      x: column.align === 'right' ? column.x - width : column.x,
      y, size: 8, font: bold
    });
  }

  y -= 6;
  page.drawLine({
    start: { x: 40, y }, end: { x: 570, y },
    thickness: 0.5, color: rgb(0.7, 0.7, 0.7)
  });
  y -= 14;
}

newPage();

for (let index = 0; index < rowCount; index++) {
  if (y < 60) newPage();

  const isCredit = index % 9 === 0;
  const amount = isCredit
    ? 7200000
    : (Math.floor(Math.random() * 4000) + 50) * 100;

  balance += isCredit ? amount : -amount;

  const merchant = isCredit ? 'SALARY CREDIT' : MERCHANTS[index % MERCHANTS.length];
  const date = `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${String(year).padStart(2, '0')}`;

  const cells = [
    date,
    merchant,
    String(400000000000 + index),
    isCredit ? '' : money(amount),
    isCredit ? money(amount) : '',
    money(balance)
  ];

  cells.forEach((text, position) => {
    if (!text) return;
    const column = COLUMNS[position];
    const width = font.widthOfTextAtSize(text, 8);
    page.drawText(text, {
      x: column.align === 'right' ? column.x - width : column.x,
      y, size: 8, font
    });
  });

  y -= 13;

  day += 1;
  if (day > 28) { day = 1; month += 1; }
  if (month > 12) { month = 1; year += 1; }
}

const bytes = await document.save();

mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, bytes);

console.log(`✓ ${rowCount} transactions written to ${output.replace(root, '.')} (${Math.round(bytes.length / 1024)} KB)`);
