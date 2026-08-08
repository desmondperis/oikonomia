/* Setting up without a bank statement.
 *
 * Plenty of households cannot produce a year of PDFs — statements come by post,
 * or scanned, or there is no net banking at all. Their money is no less worth
 * planning, so what the engine would have read from records is asked for
 * instead: one short question at a time, nothing compulsory, and no figure ever
 * invented on their behalf.
 *
 * The answers are theirs. Anything skipped stays unknown rather than becoming a
 * guess dressed up as a fact.
 */

import { formatPaise, readRupees } from './money.js';

const STORE = 'oikonomia.profile.v1';

/* Asked in the order a household thinks about its own money: what comes in,
   then the roof, then the things that must be paid, then the rest. */
const QUESTIONS = [
  {
    id: 'income',
    category: 'Income',
    ask: 'How much money comes into your household in a month?',
    help: 'Everything together — salary, wages, business, rent received, help from family. A rough figure is fine.',
    placeholder: '72000',
    required: true
  },
  {
    id: 'rent',
    category: 'Rent',
    ask: 'What do you pay for your home each month?',
    help: 'Rent, or a home loan payment. Skip if you own it outright.'
  },
  {
    id: 'groceries',
    category: 'Groceries',
    ask: 'About how much goes on food and groceries in a month?',
    help: 'Ration, vegetables, milk, the kirana shop.'
  },
  {
    id: 'bills',
    category: 'Bills',
    ask: 'And on bills?',
    help: 'Electricity, water, gas, phone and internet together.'
  },
  {
    id: 'transport',
    category: 'Transport',
    ask: 'Getting to work and around?',
    help: 'Bus, train, auto, petrol, whatever you use.'
  },
  {
    id: 'education',
    category: 'Education',
    ask: 'School or college fees each month?',
    help: 'If fees are paid once or twice a year, divide by twelve — Oikonomia will set that much aside monthly.'
  },
  {
    id: 'loan',
    category: 'Loan payment',
    ask: 'Any loan or EMI payments?',
    help: 'Bank loan, gold loan, buy-now-pay-later, or money being repaid to family.'
  },
  {
    id: 'health',
    category: 'Health',
    ask: 'Medicines or regular treatment?',
    help: 'Ongoing medicine, doctor visits, anything regular.'
  },
  {
    id: 'insurance',
    category: 'Insurance',
    ask: 'Insurance premiums?',
    help: 'Life, health or vehicle. Again, a yearly premium divided by twelve.'
  },
  {
    id: 'giving',
    category: 'Giving',
    ask: 'Do you give regularly?',
    help: 'Church, charity, helping family or neighbours. Entirely your own decision — Oikonomia only makes room for it.'
  },
  {
    id: 'saved',
    category: null,
    ask: 'Do you have anything set aside already?',
    help: 'Savings, a fixed deposit, cash kept at home. This only helps judge how much of a cushion you still need.'
  }
];

const el = (id) => document.getElementById(id);

let onFinish = () => {};
let step = 0;
let answers = {};

/* ---------- keeping it ---------- */

export function loadProfile() {
  try {
    const raw = localStorage.getItem(STORE);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveProfile(profile) {
  try { localStorage.setItem(STORE, JSON.stringify(profile)); } catch { /* fine */ }
}

export function clearProfile() {
  try { localStorage.removeItem(STORE); } catch { /* fine */ }
}

/** What the household said, in the shape the budget engine wants. */
function toProfile() {
  const commitments = [];

  for (const question of QUESTIONS) {
    if (!question.category || question.id === 'income') continue;
    const paise = answers[question.id];
    if (!paise) continue;
    commitments.push({ label: question.ask, category: question.category, paise, everyMonth: true });
  }

  return {
    incomePaise: answers.income || 0,
    savedPaise: answers.saved || 0,
    commitments,
    answeredAt: Date.now()
  };
}

/* ---------- the screen ---------- */

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function render(body) {
  body.replaceChildren();

  if (step >= QUESTIONS.length) {
    renderSummary(body);
    return;
  }

  const question = QUESTIONS[step];

  const progress = node('div', 'progress');
  const bar = node('div', 'progress-bar');
  bar.style.width = `${Math.round((step / QUESTIONS.length) * 100)}%`;
  progress.append(bar);

  const heading = node('h3', 'survey-ask', question.ask);
  const help = node('p', 'survey-help', question.help);

  const field = node('label', 'field');
  field.append(node('span', 'field-label', 'Amount each month'));

  const wrap = node('div', 'amount-input');
  wrap.append(node('span', 'amount-prefix', '₹'));

  const input = document.createElement('input');
  input.type = 'text';
  input.inputMode = 'decimal';
  input.autocomplete = 'off';
  input.placeholder = question.placeholder || '0';
  if (answers[question.id]) input.value = String(answers[question.id] / 100);
  wrap.append(input);
  field.append(wrap);

  const problem = node('p', 'form-error');
  problem.hidden = true;

  const next = node('button', 'primary-action', step === QUESTIONS.length - 1 ? 'Finish' : 'Next');
  next.type = 'button';

  const accept = () => {
    const typed = input.value.trim();

    if (!typed) {
      if (question.required) {
        problem.textContent = 'Oikonomia cannot plan without this one. A rough figure is fine.';
        problem.hidden = false;
        input.focus();
        return;
      }
      delete answers[question.id];
    } else {
      const paise = readRupees(typed);
      if (paise === null) {
        problem.textContent = 'Please enter an amount, like 5000.';
        problem.hidden = false;
        input.focus();
        return;
      }
      answers[question.id] = paise;
    }

    step++;
    render(body);
  };

  next.addEventListener('click', accept);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') { event.preventDefault(); accept(); }
  });

  const skip = node('button', 'secondary-action full', question.required ? 'Back' : 'Not this one');
  skip.type = 'button';
  skip.addEventListener('click', () => {
    if (question.required) { if (step > 0) step--; }
    else { delete answers[question.id]; step++; }
    render(body);
  });

  body.append(progress, heading, help, field, problem, next);
  if (step > 0 || !question.required) body.append(skip);

  input.focus();
}

function renderSummary(body) {
  const profile = toProfile();
  const committed = profile.commitments.reduce((sum, item) => sum + item.paise, 0);
  const left = profile.incomePaise - committed;

  body.append(node('h3', 'survey-ask', 'This is what you told me'));
  body.append(node('p', 'survey-help',
    'Nothing here is estimated — these are your own figures. Change anything that looks wrong.'));

  const figures = node('dl', 'understood');
  const row = (label, value) => {
    const line = node('div', 'figure-row');
    line.append(node('dt', null, label));
    line.append(node('dd', null, value));
    figures.append(line);
  };

  row('Money coming in', formatPaise(profile.incomePaise));
  row('What you must pay', formatPaise(committed));
  row(left >= 0 ? 'Left over' : 'Short by', formatPaise(Math.abs(left)));
  body.append(figures);

  if (left < 0) {
    const warn = node('div', 'verdict verdict-warn');
    const wrapper = node('div');
    wrapper.append(node('strong', null, 'This does not balance yet'));
    wrapper.append(node('span', null,
      'What you have told me comes to more than what comes in. That is worth looking at ' +
      'together — and it is a gap in income, not a lapse in discipline.'));
    warn.append(wrapper);
    body.append(warn);
  }

  const make = node('button', 'primary-action', 'Make my plan');
  make.type = 'button';
  make.addEventListener('click', () => {
    saveProfile(profile);
    onFinish(profile);
  });

  const again = node('button', 'secondary-action full', 'Change my answers');
  again.type = 'button';
  again.addEventListener('click', () => { step = 0; render(body); });

  body.append(make, again);
}

/* ---------- starting ---------- */

export function startSurvey(body, finished) {
  onFinish = finished || (() => {});
  step = 0;

  const existing = loadProfile();
  answers = {};

  if (existing) {
    answers.income = existing.incomePaise;
    answers.saved = existing.savedPaise;
    for (const commitment of existing.commitments || []) {
      const question = QUESTIONS.find((item) => item.category === commitment.category);
      if (question) answers[question.id] = commitment.paise;
    }
  }

  render(body);
}
