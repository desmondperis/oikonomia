/* The statement screen.
 *
 * Reads however many files a household hands over — nine banks, twelve months
 * each — one at a time on the device, then shows what was understood and waits
 * to be told to keep it. Nothing is imported on the strength of our own reading
 * alone, and one unreadable file never stops the rest.
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
  passwordFile: el('import-password-file'),
  password: el('statement-password'),
  passwordSubmit: el('password-submit'),
  passwordSkip: el('password-skip'),
  working: el('import-working'),
  workingMessage: el('import-working-message'),
  progressBar: el('import-progress-bar'),
  progressList: el('import-progress-list'),
  result: el('import-result'),
  errorStep: el('import-error'),
  errorMessage: el('import-error-message'),
  retry: el('import-retry')
};

let jobs = [];
let onImport = null;

/* Resolved when the person has answered the password prompt. */
let awaitingPassword = null;

/* ---------- steps ---------- */

function showStep(step) {
  for (const node of [ui.choose, ui.passwordStep, ui.working, ui.result, ui.errorStep]) {
    node.hidden = node !== step;
  }
}

function open() {
  jobs = [];
  ui.file.value = '';
  ui.password.value = '';
  ui.home.hidden = true;
  ui.screen.hidden = false;
  showStep(ui.choose);
  ui.back.focus();
}

function close() {
  // Files and any passwords they needed go out of memory with them.
  jobs = [];
  awaitingPassword = null;
  ui.file.value = '';
  ui.password.value = '';
  ui.screen.hidden = true;
  ui.home.hidden = false;
  ui.link.focus();
}

/* ---------- reading, one file at a time ---------- */

function isPdf(file) {
  return file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
}

/** Show the password question and wait for an answer, or for a skip. */
function askForPassword(job, wrong) {
  ui.passwordMessage.textContent = wrong
    ? 'That password did not open it. Try again.'
    : 'This statement is password protected. Enter the password to open it.';
  ui.passwordFile.textContent = job.file.name;
  ui.password.value = '';
  showStep(ui.passwordStep);
  ui.password.focus();

  return new Promise((resolve) => { awaitingPassword = resolve; });
}

async function readOne(job) {
  let password = null;

  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      let table;

      if (isPdf(job.file)) {
        const { items } = await readPdf(job.file, password, (page, total) => {
          ui.workingMessage.textContent = `Reading ${job.file.name} — page ${page} of ${total}…`;
        });
        table = toTable(items);
      } else {
        table = readDelimited(await job.file.text());
      }

      const result = readStatement(table);

      if (result.transactions.length === 0) {
        job.status = 'failed';
        job.error = table.columns
          ? 'No transactions found in this file.'
          : 'I could not find a transaction table. If this is a scanned or photographed statement, I cannot read it yet.';
        return;
      }

      job.status = 'read';
      job.result = result;
      job.bank = identifyBank(table.preamble);
      job.ending = findAccountEnding(table.preamble);
      return;
    } catch (error) {
      if (error instanceof StatementFileError &&
          (error.kind === NEEDS_PASSWORD || error.kind === WRONG_PASSWORD)) {
        const given = await askForPassword(job, error.kind === WRONG_PASSWORD);
        showStep(ui.working);

        if (given === null) {
          job.status = 'skipped';
          job.error = 'Skipped — password not given.';
          return;
        }

        password = given;
        continue;
      }

      job.status = 'failed';
      job.error = error instanceof StatementFileError
        ? error.message
        : `Could not read this file — ${String(error?.message || error).slice(0, 140)}`;
      return;
    }
  }

  job.status = 'skipped';
  job.error = 'Skipped — password not accepted.';
}

async function readAll(files) {
  jobs = [...files].map((file) => ({ file, status: 'waiting', result: null, error: null }));

  showStep(ui.working);
  renderProgress(0);

  for (let index = 0; index < jobs.length; index++) {
    const job = jobs[index];
    job.status = 'reading';
    ui.workingMessage.textContent = jobs.length === 1
      ? `Reading ${job.file.name}…`
      : `Reading ${index + 1} of ${jobs.length} — ${job.file.name}`;
    renderProgress(index);

    await readOne(job);
    renderProgress(index + 1);

    // Let the phone breathe between files rather than locking the screen.
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  showSummary();
}

function renderProgress(done) {
  const percent = jobs.length === 0 ? 0 : Math.round((done / jobs.length) * 100);
  ui.progressBar.style.width = `${percent}%`;

  ui.progressList.replaceChildren();
  if (jobs.length < 2) return;

  for (const job of jobs) {
    const item = document.createElement('li');
    item.className = `file-row file-${job.status}`;
    const name = document.createElement('span');
    name.className = 'file-name';
    name.textContent = job.file.name;
    const state = document.createElement('span');
    state.className = 'file-state';
    state.textContent = {
      waiting: 'waiting', reading: 'reading…', read: 'read',
      failed: 'could not read', skipped: 'skipped'
    }[job.status] || '';
    item.append(name, state);
    ui.progressList.appendChild(item);
  }
}

/* ---------- what we understood, across every file ---------- */

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

function showSummary() {
  const read = jobs.filter((job) => job.status === 'read');
  const broken = jobs.filter((job) => job.status !== 'read');

  ui.result.replaceChildren();

  if (read.length === 0) {
    // Say what happened to each one. A single shared message hides the fact
    // that different files failed for different reasons.
    ui.errorMessage.textContent = jobs.length === 1
      ? jobs[0].error
      : `None of the ${jobs.length} files could be read:\n\n` +
        jobs.map((job) => `• ${job.file.name} — ${job.error}`).join('\n');
    ui.errorMessage.style.whiteSpace = 'pre-line';
    showStep(ui.errorStep);
    return;
  }

  const all = read.flatMap((job) => job.result.transactions);

  let debits = 0;
  let credits = 0;
  let from = null;
  let to = null;

  for (const transaction of all) {
    if (transaction.direction === 'credit') credits += transaction.paise;
    else debits += transaction.paise;
    if (!from || transaction.date < from) from = transaction.date;
    if (!to || transaction.date > to) to = transaction.date;
  }

  const heading = document.createElement('h3');
  heading.className = 'import-title';
  heading.textContent = "Here's what I understood";

  const source = document.createElement('p');
  source.className = 'understood-source';
  const accounts = new Set(read.map((job) => `${job.bank.name}${job.ending ? ` ending ${job.ending}` : ''}`));
  source.textContent =
    `${[...accounts].join(' · ')} — ${readableDate(from)} to ${readableDate(to)}`;

  const figures = document.createElement('dl');
  figures.className = 'understood';
  figures.append(
    figureRow(read.length === 1 ? 'Statement read' : 'Statements read', String(read.length)),
    figureRow('Transactions found', String(all.length)),
    figureRow('Money out', formatPaise(debits)),
    figureRow('Money in', formatPaise(credits))
  );

  ui.result.append(heading, source, figures);

  if (read.length > 1) ui.result.append(perFileList(read));
  ui.result.append(overallVerdict(read));
  if (broken.length > 0) ui.result.append(brokenList(broken));

  const confirm = document.createElement('button');
  confirm.type = 'button';
  confirm.className = 'primary-action';
  confirm.textContent = `Add these ${all.length} transactions`;
  confirm.addEventListener('click', () => {
    // Everything goes in as one batch, so the household is told once what
    // happened rather than watching a message flash per file.
    const batch = read.flatMap((job) =>
      job.result.transactions.map((transaction) => ({
        ...transaction,
        bank: job.bank.name,
        ending: job.ending
      }))
    );
    if (onImport) onImport(batch);
    close();
  });

  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.className = 'secondary-action full';
  cancel.textContent = 'Not now';
  cancel.addEventListener('click', close);

  ui.result.append(confirm, cancel);
  showStep(ui.result);
}

function perFileList(read) {
  const list = document.createElement('ul');
  list.className = 'file-list';

  for (const job of read) {
    const item = document.createElement('li');
    item.className = 'file-row';

    const name = document.createElement('span');
    name.className = 'file-name';
    name.textContent = `${job.bank.name}${job.ending ? ` ···${job.ending}` : ''}`;

    const detail = document.createElement('span');
    detail.className = 'file-state';
    const count = job.result.transactions.length;
    detail.textContent = job.result.verification.confident
      ? `${count} · checked`
      : `${count} · needs a look`;

    item.append(name, detail);
    list.appendChild(item);
  }

  return list;
}

/** Whether every statement agreed with its own running balance. */
function overallVerdict(read) {
  const unchecked = read.filter((job) => job.result.verification.reason === 'no-running-balance');
  const wrong = read.filter((job) => job.result.verification.mismatches.length > 0);

  const box = document.createElement('div');
  const wrapper = document.createElement('div');
  const title = document.createElement('strong');
  const body = document.createElement('span');

  if (wrong.length === 0 && unchecked.length === 0) {
    box.className = 'verdict verdict-good';
    const checks = read.reduce((sum, job) => sum + job.result.verification.checked, 0);
    title.textContent = 'These figures add up';
    body.textContent =
      `Every transaction matches the running balance your bank printed, across ${checks} checks. ` +
      'Please still look them over.';
  } else {
    box.className = 'verdict verdict-warn';
    if (wrong.length > 0) {
      const rows = wrong.reduce((sum, job) => sum + job.result.verification.mismatches.length, 0);
      title.textContent = 'Some rows did not add up';
      body.textContent =
        `${rows} transaction${rows === 1 ? '' : 's'} disagree with the running balance your bank ` +
        'printed, which means I have misread something. You can still add them, but please check ' +
        'them first:';
    } else {
      title.textContent = 'I could not check these';
      body.textContent =
        `${unchecked.length} statement${unchecked.length === 1 ? ' has' : 's have'} no running ` +
        'balance column, so there is nothing to check my reading against. Please look through the ' +
        'figures before adding them.';
    }
  }

  wrapper.append(title, body);

  const mismatches = wrong.flatMap((job) =>
    job.result.verification.mismatches.map((mismatch) => ({ job, mismatch }))
  );

  if (mismatches.length > 0) {
    const list = document.createElement('ul');
    list.className = 'mismatch-list';
    for (const { job, mismatch } of mismatches.slice(0, 6)) {
      const item = document.createElement('li');
      item.textContent =
        `${job.file.name} — ${readableDate(mismatch.date)} — ${mismatch.description || 'transaction'}`;
      list.appendChild(item);
    }
    wrapper.appendChild(list);
  }

  box.appendChild(wrapper);
  return box;
}

function brokenList(broken) {
  const box = document.createElement('div');
  box.className = 'verdict verdict-warn';

  const wrapper = document.createElement('div');
  const title = document.createElement('strong');
  title.textContent = broken.length === 1
    ? 'One file could not be read'
    : `${broken.length} files could not be read`;

  const list = document.createElement('ul');
  list.className = 'mismatch-list';
  for (const job of broken) {
    const item = document.createElement('li');
    item.textContent = `${job.file.name} — ${job.error}`;
    list.appendChild(item);
  }

  wrapper.append(title, list);
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
    const files = ui.file.files;
    if (files && files.length > 0) readAll(files);
  });

  const answerPassword = (value) => {
    const resolve = awaitingPassword;
    awaitingPassword = null;
    if (resolve) resolve(value);
  };

  ui.passwordSubmit.addEventListener('click', () => answerPassword(ui.password.value));
  ui.passwordSkip.addEventListener('click', () => answerPassword(null));

  ui.password.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      answerPassword(ui.password.value);
    }
  });
}
