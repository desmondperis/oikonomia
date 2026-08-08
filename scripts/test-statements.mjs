/* Tests for reading bank statements.
 *
 * The fixtures below are built to match the shape of each bank's real export —
 * their column headings, date formats and the way they mark debits and credits.
 * They are not real statements, so when a genuine HDFC or SBI file first goes
 * through, expect to add cases here. That is the point: every real file that
 * reads wrongly becomes a test before it is fixed.
 */

import { readAmount, readDate, readColumnRole } from '../public/statements/fields.js';
import { readDelimited } from '../public/statements/csv.js';
import { toTable } from '../public/statements/table.js';
import { readStatement } from '../public/statements/statement.js';
import { identifyBank, findAccountEnding } from '../public/statements/banks.js';

let failed = 0;
let checks = 0;

function check(label, actual, expected) {
  checks++;
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    failed++;
    console.error(`  ✗ ${label}`);
    console.error(`      got      ${a}`);
    console.error(`      expected ${e}`);
  }
}

/* ---------- amounts ---------- */

check('plain amount',        readAmount('620.00'),        { paise: 62000, direction: null });
check('grouped amount',      readAmount('1,20,250.50'),   { paise: 12025050, direction: null });
check('western grouping',    readAmount('120,250.50'),    { paise: 12025050, direction: null });
check('rupee sign',          readAmount('₹1,250'),        { paise: 125000, direction: null });
check('debit marker',        readAmount('1,250.00 Dr'),   { paise: 125000, direction: 'debit' });
check('credit marker',       readAmount('1,250.00 Cr'),   { paise: 125000, direction: 'credit' });
check('parenthesised',       readAmount('(1,250.00)'),    { paise: 125000, direction: 'debit' });
check('trailing minus',      readAmount('1250.00-'),      { paise: 125000, direction: 'debit' });
check('whole rupees',        readAmount('1250'),          { paise: 125000, direction: null });
check('one decimal place',   readAmount('12.5'),          { paise: 1250,   direction: null });
check('not money',           readAmount('SWIGGY'),        null);
check('empty cell',          readAmount(''),              null);
check('date is not money',   readAmount('04/07/2026'),    null);

/* ---------- dates ---------- */

check('day first slash',     readDate('04/07/2026'), '2026-07-04');
check('day first dash',      readDate('04-07-2026'), '2026-07-04');
check('two digit year',      readDate('04/07/26'),   '2026-07-04');
check('spelled month',       readDate('4 Jul 2026'), '2026-07-04');
check('spelled month dash',  readDate('04-JUL-2026'),'2026-07-04');
check('long month',          readDate('4 July 2026'),'2026-07-04');
check('iso',                 readDate('2026-07-04'), '2026-07-04');
check('impossible day',      readDate('31/02/2026'), null);
check('not a date',          readDate('SWIGGY'),     null);

/* ---------- column headings ---------- */

check('narration is description',  readColumnRole('Narration'), 'description');
check('particulars',               readColumnRole('PARTICULARS'), 'description');
check('withdrawal is debit',       readColumnRole('Withdrawal Amt.'), 'debit');
check('deposit is credit',         readColumnRole('Deposit Amt.'), 'credit');
check('closing balance',           readColumnRole('Closing Balance'), 'balance');
check('value date is not date',    readColumnRole('Value Date'), 'valueDate');
check('txn date is date',          readColumnRole('Txn Date'), 'date');

/* ---------- HDFC, split debit and credit columns ---------- */

const hdfc = `HDFC BANK LTD
Statement of Accounts
Account No : 50100123456789
Date,Narration,Chq./Ref.No.,Value Dt,Withdrawal Amt.,Deposit Amt.,Closing Balance
04/07/26,UPI-SWIGGY-SWIGGY@YBL-YESB-418512345678,0000418512345678,04/07/26,620.00,,45380.00
05/07/26,SALARY JULY 2026,NEFT0000123,05/07/26,,72000.00,117380.00
07/07/26,UPI-RENT-LANDLORD@OKAXIS,0000418598765432,07/07/26,18000.00,,99380.00`;

{
  const table = readDelimited(hdfc);
  const result = readStatement(table);

  check('hdfc: bank identified', identifyBank(table.preamble).name, 'HDFC Bank');
  check('hdfc: account ending', findAccountEnding(table.preamble), '6789');
  check('hdfc: transaction count', result.transactions.length, 3);
  check('hdfc: first is a debit', result.transactions[0].direction, 'debit');
  check('hdfc: first amount', result.transactions[0].paise, 62000);
  check('hdfc: salary is a credit', result.transactions[1].direction, 'credit');
  check('hdfc: dates are day first', result.transactions[0].date, '2026-07-04');
  check('hdfc: balance reconciles', result.verification.confident, true);
  check('hdfc: rows checked', result.verification.checked, 2);
  check('hdfc: opening balance', result.summary.openingPaise, 4600000);
  check('hdfc: closing balance', result.summary.closingPaise, 9938000);
  check('hdfc: total spent', result.summary.debits, 1862000);
  check('hdfc: total received', result.summary.credits, 7200000);
}

/* ---------- SBI, spelled-out dates ---------- */

const sbi = `State Bank of India
Account Number : XXXXXXXX4321
Txn Date,Value Date,Description,Ref No./Cheque No.,Debit,Credit,Balance
1 Jul 2026,1 Jul 2026,TO TRANSFER-UPI/DR/418512345678/SWIGGY,418512345678,620.00,,45380.00
2 Jul 2026,2 Jul 2026,BY SALARY-JULY,NEFT0000123,,72000.00,117380.00`;

{
  const result = readStatement(readDelimited(sbi));
  check('sbi: transaction count', result.transactions.length, 2);
  check('sbi: date read', result.transactions[0].date, '2026-07-01');
  check('sbi: balance reconciles', result.verification.confident, true);
  check('sbi: account ending', findAccountEnding(readDelimited(sbi).preamble), '4321');
}

/* ---------- ICICI, credit column before debit ---------- */

const icici = `ICICI Bank Limited
Account Number: 001234567890
DATE,MODE,PARTICULARS,DEPOSITS,WITHDRAWALS,BALANCE
04-07-2026,UPI,UPI/418512345678/Payment to SWIGGY,,620.00,45380.00
05-07-2026,NEFT,SALARY FOR JULY,72000.00,,117380.00`;

{
  const result = readStatement(readDelimited(icici));
  check('icici: transaction count', result.transactions.length, 2);
  check('icici: withdrawal is a debit', result.transactions[0].direction, 'debit');
  check('icici: deposit is a credit', result.transactions[1].direction, 'credit');
  check('icici: balance reconciles', result.verification.confident, true);
}

/* ---------- one amount column, direction from the balance ---------- */

const pnb = `Punjab National Bank
Account No. 0123000456789012
Date,Remarks,Amount,Balance
04/07/2026,UPI/SWIGGY/418512345678,620.00,45380.00
05/07/2026,SALARY JULY,72000.00,117380.00
07/07/2026,RENT PAYMENT,18000.00,99380.00`;

{
  const result = readStatement(readDelimited(pnb));
  check('pnb: transaction count', result.transactions.length, 3);
  // The statement never says which way the money went; the balance does.
  check('pnb: salary inferred as credit', result.transactions[1].direction, 'credit');
  check('pnb: rent inferred as debit', result.transactions[2].direction, 'debit');
  check('pnb: balance reconciles', result.verification.confident, true);
}

/* ---------- Bank of Baroda, with a wrapped description ---------- */

const bob = `BANK OF BARODA
A/c No : 12345678901234
Sl. No.,Transaction Date,Value Date,Description,Cheque Number,Debit,Credit,Balance
1,04/07/2026,04/07/2026,UPI/DR/418512345678/SWIGGY BANGALORE,,620.00,,45380.00
,,,ORDER 5512 FOOD DELIVERY,,,,
2,05/07/2026,05/07/2026,SALARY CREDIT,,,72000.00,117380.00`;

{
  const result = readStatement(readDelimited(bob));
  check('bob: wrapped line did not become a transaction', result.transactions.length, 2);
  check(
    'bob: wrapped line joined the description above',
    result.transactions[0].description,
    'UPI/DR/418512345678/SWIGGY BANGALORE ORDER 5512 FOOD DELIVERY'
  );
  check('bob: balance reconciles', result.verification.confident, true);
}

/* ---------- a misread amount must be caught, not imported ---------- */

const broken = `HDFC BANK LTD
Account No : 50100123456789
Date,Narration,Withdrawal Amt.,Deposit Amt.,Closing Balance
04/07/26,UPI-SWIGGY,620.00,,45380.00
05/07/26,SALARY JULY,,7200.00,117380.00`;

{
  const result = readStatement(readDelimited(broken));
  check('broken: reading is not trusted', result.verification.confident, false);
  check('broken: the bad row is named', result.verification.mismatches.length, 1);
  check('broken: it points at the salary row', result.verification.mismatches[0].description, 'SALARY JULY');
}

/* ---------- a PDF, recovered from positions ---------- */

/* Scraps of text at coordinates, as pdf.js hands them over. The description
   column is deliberately split into several scraps, as it always is in a real
   statement, and the columns are not evenly spaced. */
const pdfItems = [
  { text: 'HDFC BANK LTD',      x: 40,  y: 40,  width: 90 },
  { text: 'Account No : 50100123456789', x: 40, y: 55, width: 160 },

  { text: 'Date',               x: 40,  y: 100, width: 25 },
  { text: 'Narration',          x: 110, y: 100, width: 55 },
  { text: 'Withdrawal Amt.',    x: 330, y: 100, width: 80 },
  { text: 'Deposit Amt.',       x: 430, y: 100, width: 70 },
  { text: 'Closing Balance',    x: 520, y: 100, width: 80 },

  { text: '04/07/26',           x: 40,  y: 120, width: 45 },
  { text: 'UPI-SWIGGY-SWIGGY@YBL', x: 110, y: 120, width: 120 },
  { text: '620.00',             x: 360, y: 120, width: 35 },
  { text: '45,380.00',          x: 545, y: 120, width: 50 },

  { text: '05/07/26',           x: 40,  y: 140, width: 45 },
  { text: 'SALARY',             x: 110, y: 140, width: 40 },
  { text: 'JULY 2026',          x: 155, y: 140, width: 50 },
  { text: '72,000.00',          x: 450, y: 140, width: 50 },
  { text: '1,17,380.00',        x: 540, y: 140, width: 55 }
];

{
  const table = toTable(pdfItems);
  const result = readStatement(table);

  check('pdf: heading row found', Boolean(table.columns), true);
  check('pdf: bank identified', identifyBank(table.preamble).name, 'HDFC Bank');
  check('pdf: transaction count', result.transactions.length, 2);
  check('pdf: amount landed in the debit column', result.transactions[0].paise, 62000);
  check('pdf: first is a debit', result.transactions[0].direction, 'debit');
  check(
    'pdf: split description scraps rejoined',
    result.transactions[1].description,
    'SALARY JULY 2026'
  );
  check('pdf: lakh grouping in balance', result.transactions[1].balancePaise, 11738000);
  check('pdf: balance reconciles', result.verification.confident, true);
}

/* ---------- a file we cannot read must say so ---------- */

{
  const result = readStatement(readDelimited('this is not a bank statement at all'));
  check('unreadable: no transactions invented', result.transactions.length, 0);
  check('unreadable: says why', result.reason, 'no-table');
}

/* ---------- report ---------- */

if (failed > 0) {
  console.error(`\n${failed} of ${checks} statement checks failed.\n`);
  process.exit(1);
}

console.log(`✓ ${checks} statement checks passed.`);
