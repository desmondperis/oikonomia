/* Which bank sent this statement, and what its account number is.
 *
 * The reader does not depend on knowing the bank — it works from the statement's
 * own column headings, which is why it can cope with a bank we have never seen.
 * Recognising the bank is for telling the household what we opened, and for
 * masking the account number so the full number never travels anywhere.
 */

const BANKS = [
  { id: 'sbi',   name: 'State Bank of India', patterns: [/state bank of india/i, /\bsbi\b/i, /onlinesbi/i] },
  { id: 'hdfc',  name: 'HDFC Bank',           patterns: [/hdfc\s*bank/i, /\bhdfc\b/i] },
  { id: 'icici', name: 'ICICI Bank',          patterns: [/icici\s*bank/i, /\bicici\b/i] },
  { id: 'pnb',   name: 'Punjab National Bank',patterns: [/punjab national bank/i, /\bpnb\b/i] },
  { id: 'bob',   name: 'Bank of Baroda',      patterns: [/bank of baroda/i, /\bbobibn\b/i, /\bbaroda\b/i] },
  { id: 'axis',  name: 'Axis Bank',           patterns: [/axis\s*bank/i] },
  { id: 'kotak', name: 'Kotak Mahindra Bank', patterns: [/kotak/i] }
];

/* Some exports never name the bank anywhere — ICICI's does not — but the exact
   wording of its column headings is as good as a signature. */
const BY_HEADINGS = [
  {
    id: 'icici',
    name: 'ICICI Bank',
    needs: [/transaction remarks/i, /withdrawal amount/i, /deposit amount/i]
  },
  {
    id: 'hdfc',
    name: 'HDFC Bank',
    needs: [/narration/i, /withdrawal amt/i, /closing balance/i]
  },
  {
    id: 'sbi',
    name: 'State Bank of India',
    needs: [/txn date/i, /ref no\.?\/cheque/i]
  },
  {
    id: 'bob',
    name: 'Bank of Baroda',
    needs: [/transaction date/i, /cheque number/i, /^description$/i]
  }
];

/**
 * Identify the bank.
 *
 * From whatever is printed above the table where possible; otherwise from the
 * headings themselves, since a household should not be told "your bank" about a
 * statement that plainly came from somewhere in particular.
 */
export function identifyBank(preambleLines, columns = null) {
  const text = (preambleLines || []).join('\n');

  for (const bank of BANKS) {
    if (bank.patterns.some((pattern) => pattern.test(text))) {
      return { id: bank.id, name: bank.name };
    }
  }

  if (columns) {
    const headings = columns.map((column) => String(column.heading || ''));

    for (const bank of BY_HEADINGS) {
      const matches = bank.needs.every((pattern) =>
        headings.some((heading) => pattern.test(heading))
      );
      if (matches) return { id: bank.id, name: bank.name };
    }
  }

  return { id: 'unknown', name: 'your bank' };
}

/**
 * Find the account number and keep only its last four digits.
 *
 * The full number is deliberately never returned. Nothing in this product needs
 * it, and a number that is never held cannot leak.
 */
export function findAccountEnding(preambleLines) {
  const text = (preambleLines || []).join('\n');

  const labelled =
    /(?:account\s*(?:no|number|#)?|a\/c\s*(?:no|number)?)\s*[:.\-]?\s*([xX*\d\s-]{6,25})/.exec(text);

  const candidate = labelled ? labelled[1] : null;
  if (candidate) {
    const digits = candidate.replace(/\D/g, '');
    if (digits.length >= 4) return digits.slice(-4);
  }

  // Failing a label, a long run of digits or masked characters will do.
  const masked = /[xX*]{2,}\s*(\d{4})\b/.exec(text);
  if (masked) return masked[1];

  const bare = /\b\d{9,18}\b/.exec(text.replace(/\s/g, ''));
  if (bare) return bare[0].slice(-4);

  return null;
}

/** A statement period, where the statement states one. */
export function findPeriod(preambleLines) {
  const text = (preambleLines || []).join(' ');
  const match =
    /(?:from|period|statement period)\s*[:\-]?\s*(\d{1,2}[-/][A-Za-z0-9]{2,9}[-/]\d{2,4})\s*(?:to|–|-)\s*(\d{1,2}[-/][A-Za-z0-9]{2,9}[-/]\d{2,4})/i
      .exec(text);

  return match ? { from: match[1], to: match[2] } : null;
}
