/* Turning a statement table into transactions — and proving it was read right.
 *
 * The proof matters more than the reading. Every statement carries a running
 * balance, which means the bank has already told us what each transaction did
 * to the account. If our transactions do not reproduce that balance line by
 * line, we have misread something, and the household is told so rather than
 * handed numbers that merely look plausible.
 */

import { readAmount, readDate } from './fields.js';

/* Rows that are summaries rather than transactions. */
const NOT_A_TRANSACTION =
  /^(opening balance|closing balance|balance b\/?f|balance c\/?f|b\/?f|c\/?f|total|totals|grand total|statement summary|continued)\b/i;

function cellFor(cells, columns, role) {
  const index = columns.findIndex((column) => column.role === role);
  return index === -1 ? '' : (cells[index] ?? '');
}

/**
 * Read the table into transactions.
 *
 * Rows that carry no date are treated as continuations of the row above, since
 * long UPI descriptions routinely wrap onto a second and third line.
 */
export function readTransactions(table) {
  if (!table.columns) {
    return { transactions: [], skipped: [], reason: 'no-table' };
  }

  const { columns, rows } = table;
  const hasSplitColumns =
    columns.some((c) => c.role === 'debit') && columns.some((c) => c.role === 'credit');

  const transactions = [];
  const skipped = [];

  for (const cells of rows) {
    const joined = cells.join(' ').trim();
    if (!joined) continue;

    const date = readDate(cellFor(cells, columns, 'date'));
    const description = cellFor(cells, columns, 'description');

    if (!date) {
      const previous = transactions[transactions.length - 1];
      const looksLikeSummary = NOT_A_TRANSACTION.test(joined);

      // A wrapped description line: no date, no money, but words.
      if (previous && !looksLikeSummary && description) {
        previous.description = `${previous.description} ${description}`
          .replace(/\s+/g, ' ')
          .trim();
        continue;
      }

      skipped.push(joined);
      continue;
    }

    if (NOT_A_TRANSACTION.test(joined)) {
      skipped.push(joined);
      continue;
    }

    const balance = readAmount(cellFor(cells, columns, 'balance'));

    let paise = null;
    let direction = null;

    if (hasSplitColumns) {
      const debit = readAmount(cellFor(cells, columns, 'debit'));
      const credit = readAmount(cellFor(cells, columns, 'credit'));

      if (debit && debit.paise > 0) {
        paise = debit.paise;
        direction = 'debit';
      } else if (credit && credit.paise > 0) {
        paise = credit.paise;
        direction = 'credit';
      }
    } else {
      const amount = readAmount(cellFor(cells, columns, 'amount'));
      if (amount && amount.paise > 0) {
        paise = amount.paise;
        direction = amount.direction; // may be null; the balance settles it later
      }
    }

    if (paise === null) {
      skipped.push(joined);
      continue;
    }

    transactions.push({
      date,
      description: description.replace(/\s+/g, ' ').trim(),
      reference: cellFor(cells, columns, 'reference').trim(),
      paise,
      direction,
      balancePaise: balance ? balance.paise : null,
      line: joined
    });
  }

  return { transactions, skipped, reason: null };
}

/**
 * Use the bank's own running balance to decide direction where the statement
 * did not say, and to check every row we read.
 */
export function verifyAgainstBalance(transactions) {
  const withBalance = transactions.filter((t) => t.balancePaise !== null);

  if (transactions.length === 0) {
    return { checked: 0, matched: 0, mismatches: [], confident: false, reason: 'no-transactions' };
  }

  if (withBalance.length < transactions.length || withBalance.length < 2) {
    return {
      checked: 0,
      matched: 0,
      mismatches: [],
      confident: false,
      reason: 'no-running-balance'
    };
  }

  const mismatches = [];
  let matched = 0;

  for (let index = 1; index < transactions.length; index++) {
    const previous = transactions[index - 1];
    const current = transactions[index];
    const movement = current.balancePaise - previous.balancePaise;

    // Where the statement had one amount column and no Dr/Cr marker, the
    // balance itself says which way the money went.
    if (current.direction === null) {
      if (movement === current.paise) current.direction = 'credit';
      else if (movement === -current.paise) current.direction = 'debit';
    }

    const signed = current.direction === 'credit' ? current.paise : -current.paise;

    if (movement === signed) {
      matched++;
    } else {
      mismatches.push({
        index,
        date: current.date,
        description: current.description,
        expectedMovement: signed,
        actualMovement: movement
      });
    }
  }

  const checked = transactions.length - 1;

  return {
    checked,
    matched,
    mismatches,
    confident: mismatches.length === 0,
    reason: null
  };
}

/** What the household is shown before anything is imported. */
export function summarise(transactions) {
  let debits = 0;
  let credits = 0;
  let earliest = null;
  let latest = null;

  for (const transaction of transactions) {
    if (transaction.direction === 'credit') credits += transaction.paise;
    else debits += transaction.paise;

    if (!earliest || transaction.date < earliest) earliest = transaction.date;
    if (!latest || transaction.date > latest) latest = transaction.date;
  }

  const first = transactions[0];
  const last = transactions[transactions.length - 1];

  const opening =
    first && first.balancePaise !== null
      ? first.balancePaise - (first.direction === 'credit' ? first.paise : -first.paise)
      : null;

  return {
    count: transactions.length,
    debits,
    credits,
    from: earliest,
    to: latest,
    openingPaise: opening,
    closingPaise: last ? last.balancePaise : null
  };
}

/** The whole job: a table in, a checked statement out. */
export function readStatement(table) {
  const { transactions, skipped, reason } = readTransactions(table);
  const verification = verifyAgainstBalance(transactions);
  const summary = summarise(transactions);

  return { transactions, skipped, verification, summary, reason };
}
