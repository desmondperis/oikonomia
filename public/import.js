/* The statement screen.
 *
 * Reads a file on the device, then shows the household what was understood and
 * asks them to confirm it before a single figure is kept. Nothing is imported
 * on the strength of our own reading alone.
 */

import { formatPaise } from './money.js';
import { readDelimited } from './statements/csv.js';
import { toTable } from './statements/table.js';
import { readStatement } from './statements/statement.js';
import { identifyBank, findAccountEnding } from './statements/banks.js';
import { readPdf, StatementFileError, NEEDS_PASSWORD, WRONG_PASSWORD } from './statements/pdf.js';

const el = (id) => document.getElementById(id);

const ui = {
  screen: el('import'),
  home: el('home'),
  link: el('import-link'),
  back: el('import-back'),
  choose: el('import-choose'),
  file: el('statement-file'),
  passwordStep: el('import-password'),
  passwordMessage: el('import-password-message'),
  password: el('statement-password'),
  passwordSubmit: el('password-submit'),
  working: el('import-working'),
  workingMessage: el('import-working-message'),
  result: el('import-result'),
  errorStep: el('import-error'),
  errorMessage: el('import-error-message'),
  retry: el('import-retry')
};

let pendingFile = null;
let onImport = null;

/* ---------- moving between the steps ---------- */

function showStep(step) {
  for (const node of [ui.choose, ui.passwordStep, ui.working, ui.result, ui.errorStep]) {
    node.hidden = node !== step;
  }
}

function open() {
  pendingFile = null;
  ui.file.value = '';
  ui.password.value = '';
  ui.home.hidden = true;
  ui.screen.hidden = false;
  showStep(ui.choose);
  ui.back.focus();
}

function close() {
  // The file and any password it needed go out of memory with it.
  pendingFile = null;
  ui.file.value = '';
  ui.password.value = '';
  ui.screen.hidden = true;
  ui.home.hidden = false;
  ui.link.focus();
}

function showError(message) {
  ui.errorMessage.textContent = message;
  showStep(ui.errorStep);
}

/* ---------- reading ---------- */

function isPdf(file) {
  return file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
}

async function readFile(file, password = null) {
  showStep(ui.working);
  ui.workingMessage.textContent = 'Reading your statement…';

  let table;

  if (isPdf(file)) {
    const { items } = await readPdf(file, password, (page, total) => {
      ui.workingMessage.textContent = `Reading page ${page} of ${total}…`;
    });
    table = toTable(items);
  } else {
    table = readDelimited(await file.text());
  }

  return { table, result: readStatement(table) };
}

async function handleFile(file, password = null) {
  try {
    const { table, result } = await readFile(file, password);
    showUnderstanding(table, result);
  } catch (error) {
    if (error instanceof StatementFileError) {
      if (error.kind === NEEDS_PASSWORD || error.kind === WRONG_PASSWORD) {
        pendingFile = file;
        ui.passwordMessage.textContent =
          error.kind === WRONG_PASSWORD
            ? 'That password did not open the statement. Try again.'
            : 'This statement is password protected. Enter the password to open it.';
        ui.password.value = '';
        showStep(ui.passwordStep);
        ui.password.focus();
        return;
      }
      showError(error.message);
      return;
    }

    showError('Something went wrong reading that file. Try another one.');
  }
}

/* ---------- what we understood ---------- */

function figureRow(label, value) {
  const row = document.createElement('div');
  row.className = 'figure-row';

  const term = document.createElement('dt');
  term.textContent = label;

  const detail = document.createElement('dd');
  detail.textContent = value;

  row.append(term, detail);
  return row;
}

function readableDate(iso) {
  if (!iso) return 'not known';
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day))
    .toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function showUnderstanding(table, result) {
  const { transactions, verification, summary } = result;

  ui.result.replaceChildren();

  if (transactions.length === 0) {
    showError(
      "I couldn't find any transactions in that file. If it's a scanned or " +
      'photographed statement, I cannot read it yet — a CSV export from your ' +
      'bank would work.'
    );
    return;
  }

  const bank = identifyBank(table.preamble);
  const ending = findAccountEnding(table.preamble);

  const heading = document.createElement('h3');
  heading.className = 'import-title';
  heading.textContent = "Here's what I understood";

  const source = document.createElement('p');
  source.className = 'understood-source';
  source.textContent = ending
    ? `${bank.name}, account ending ${ending} · ${readableDate(summary.from)} to ${readableDate(summary.to)}`
    : `${bank.name} · ${readableDate(summary.from)} to ${readableDate(summary.to)}`;

  const figures = document.createElement('dl');
  figures.className = 'understood';
  figures.append(
    figureRow('Transactions found', String(summary.count)),
    figureRow('Money out', formatPaise(summary.debits)),
    figureRow('Money in', formatPaise(summary.credits))
  );
  if (summary.openingPaise !== null) {
    figures.append(figureRow('Opening balance', formatPaise(summary.openingPaise)));
  }
  if (summary.closingPaise !== null) {
    figures.append(figureRow('Closing balance', formatPaise(summary.closingPaise)));
  }

  ui.result.append(heading, source, figures, verdictFor(verification));

  const confirm = document.createElement('button');
  confirm.type = 'button';
  confirm.className = 'primary-action';
  confirm.textContent = verification.confident
    ? `Add these ${summary.count} transactions`
    : 'Add them anyway';
  confirm.addEventListener('click', () => {
    if (onImport) onImport(transactions, { bank: bank.name, ending });
    close();
  });

  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.className = 'secondary-action';
  cancel.style.width = '100%';
  cancel.style.marginTop = '.75rem';
  cancel.textContent = 'Not now';
  cancel.addEventListener('click', close);

  ui.result.append(confirm, cancel);
  showStep(ui.result);
}

/** Whether the bank's own running balance agreed with what we read. */
function verdictFor(verification) {
  const box = document.createElement('div');
  const title = document.createElement('strong');
  const body = document.createElement('span');

  if (verification.confident && verification.checked > 0) {
    box.className = 'verdict verdict-good';
    title.textContent = 'These figures add up';
    body.textContent =
      `Every transaction matches the running balance your bank printed, across ` +
      `${verification.checked} checks. Please still look them over.`;
    box.append(document.createElement('div'));
    box.firstChild.append(title, body);
    return box;
  }

  box.className = 'verdict verdict-warn';

  if (verification.reason === 'no-running-balance') {
    title.textContent = 'I could not check these';
    body.textContent =
      'This statement has no running balance column, so there is nothing to check ' +
      'my reading against. Please look through the figures carefully before adding them.';
  } else {
    title.textContent = 'Some rows did not add up';
    body.textContent =
      `${verification.mismatches.length} of ${verification.checked} transactions ` +
      'disagree with the running balance your bank printed, which means I have ' +
      'misread something. You can still add them, but please check these first:';
  }

  const wrapper = document.createElement('div');
  wrapper.append(title, body);

  if (verification.mismatches.length > 0) {
    const list = document.createElement('ul');
    list.className = 'mismatch-list';
    for (const mismatch of verification.mismatches.slice(0, 5)) {
      const item = document.createElement('li');
      item.textContent = `${readableDate(mismatch.date)} — ${mismatch.description || 'transaction'}`;
      list.appendChild(item);
    }
    wrapper.appendChild(list);
  }

  box.appendChild(wrapper);
  return box;
}

/* ---------- wiring ---------- */

export function setUpImport(handler) {
  onImport = handler;

  ui.link.addEventListener('click', (event) => {
    event.preventDefault();
    open();
  });

  ui.back.addEventListener('click', close);
  ui.retry.addEventListener('click', () => showStep(ui.choose));

  ui.file.addEventListener('change', () => {
    const file = ui.file.files?.[0];
    if (file) handleFile(file);
  });

  ui.passwordSubmit.addEventListener('click', () => {
    if (pendingFile) handleFile(pendingFile, ui.password.value);
  });

  ui.password.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && pendingFile) {
      event.preventDefault();
      handleFile(pendingFile, ui.password.value);
    }
  });
}
