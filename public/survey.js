/* Getting to know a household.
 *
 * The rule here, learned the hard way: never ask somebody what they spend on
 * something they have never counted. "About how much goes on groceries?" assumes
 * the answer this tool exists to uncover, and the honest reply is "I don't
 * know" — which is precisely why they are here.
 *
 * So only two kinds of question are asked. Things that arrive as the same figure
 * every month, which people know exactly: rent, the EMI, school fees, the
 * premium. And things about the household itself: who lives there, how they get
 * about, what they are working towards.
 *
 * Everything else — food, transport, the small daily leaks — Oikonomia estimates
 * openly and says so. The month's real spending is what turns those estimates
 * into knowledge. That gap is the whole point.
 */

import { formatPaise, readRupees } from './money.js';
import { t } from './i18n.js';

const STORE = 'oikonomia.profile.v1';

/* Each question is one a household can answer without counting anything. */
const QUESTIONS = [
  {
    id: 'incomePaise',
    kind: 'money',
    ask: 'How much money comes into your household in a month?',
    help: 'Everything together — salary, wages, business, rent received, help from family. If it varies, give a normal month.',
    placeholder: '30000',
    required: true
  },
  {
    id: 'incomeSteady',
    kind: 'choice',
    ask: 'Does that arrive steadily?',
    help: 'It changes what kind of cushion makes sense for you.',
    options: [
      ['steady', 'The same every month'],
      ['varies', 'It varies'],
      ['irregular', 'Some months there is little or none']
    ]
  },
  {
    id: 'adults',
    kind: 'count',
    ask: 'How many adults live in your household?',
    help: 'Everyone whose living costs come out of this money.',
    placeholder: '2'
  },
  {
    id: 'children',
    kind: 'count',
    ask: 'And how many children?',
    help: 'Leave it blank if none.',
    placeholder: '0'
  },
  {
    id: 'rentPaise',
    kind: 'money',
    ask: 'What do you pay for your home each month?',
    help: 'Rent, or a home loan payment. Skip if you own it outright with nothing to pay.'
  },
  {
    id: 'loanPaise',
    kind: 'money',
    ask: 'Do you have any loan or EMI payments?',
    help: 'Bank loan, gold loan, vehicle, buy-now-pay-later, or money being repaid to family. Add them together.'
  },
  {
    id: 'feesPaise',
    kind: 'yearly',
    ask: 'School or college fees?',
    help: 'Give the yearly amount and Oikonomia will set aside a twelfth each month, so the term bill does not arrive as a shock.'
  },
  {
    id: 'insurancePaise',
    kind: 'yearly',
    ask: 'Insurance premiums?',
    help: 'Life, health or vehicle, for the whole year. Skip if you have none — Oikonomia will mention it later.'
  },
  {
    id: 'travel',
    kind: 'choice',
    ask: 'How does your household usually get about?',
    help: 'This shapes what Oikonomia expects travel to cost.',
    options: [
      ['walk', 'Mostly walking or cycling'],
      ['public', 'Bus, train or shared auto'],
      ['twowheeler', 'A two-wheeler'],
      ['car', 'A car']
    ]
  },
  {
    id: 'givingShare',
    kind: 'choice',
    ask: 'Do you set anything aside for giving?',
    help: 'Church, charity, helping family or neighbours. This is entirely yours to decide — Oikonomia only makes room for whatever you choose.',
    options: [
      ['0.10', 'A tenth of what comes in'],
      ['0.05', 'Around a twentieth'],
      ['other', 'Something else — I will set it myself'],
      ['0', 'Not at the moment']
    ]
  },
  {
    id: 'shortfall',
    kind: 'choice',
    ask: 'Be honest — how do most months end?',
    help: 'Nobody sees this but you. It changes what Oikonomia suggests first.',
    options: [
      ['comfortable', 'There is usually something left'],
      ['tight', 'It is tight but it works out'],
      ['short', 'I often run out before the month does'],
      ['borrow', 'I usually have to borrow']
    ]
  },
  {
    id: 'goal',
    kind: 'choice',
    ask: 'What would you most like money to do for you?',
    help: 'Oikonomia will work towards this once the essentials are steady.',
    options: [
      ['cushion', 'Stop living so close to the edge'],
      ['debt', 'Get out of debt'],
      ['school', "Pay for children's education"],
      ['home', 'A home of our own'],
      ['family', 'Help family who need it'],
      ['later', 'Something for later life']
    ]
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

  body.append(progress);
  body.append(node('h3', 'survey-ask', question.ask));
  body.append(node('p', 'survey-help', question.help));

  const problem = node('p', 'form-error');
  problem.hidden = true;

  if (question.kind === 'choice') {
    renderChoice(body, question, problem);
    return;
  }

  renderNumber(body, question, problem);
}

/** A question answered by picking one of a few plain options. */
function renderChoice(body, question, problem) {
  const list = node('div', 'welcome-choices');

  for (const [value, label] of question.options) {
    const choice = node('button', 'welcome-choice', label);
    choice.type = 'button';
    if (String(answers[question.id]) === value) choice.dataset.chosen = 'true';

    choice.addEventListener('click', () => {
      if (value === 'other') {
        answers[question.id] = 'other';
      } else {
        answers[question.id] = value;
      }
      step++;
      render(body);
    });

    list.append(choice);
  }

  body.append(list, problem);

  if (step > 0) body.append(backButton(body));
}

/** A question answered with a figure. */
function renderNumber(body, question, problem) {
  const field = node('label', 'field');
  const isMoney = question.kind !== 'count';

  if (isMoney) {
    field.append(node('span', 'field-label',
      question.kind === 'yearly' ? 'Amount for the whole year' : 'Amount each month'));
  } else {
    field.append(node('span', 'field-label', 'How many'));
  }

  const wrap = node('div', isMoney ? 'amount-input' : 'plain-input');
  if (isMoney) wrap.append(node('span', 'amount-prefix', '₹'));

  const input = document.createElement('input');
  input.type = 'text';
  input.inputMode = isMoney ? 'decimal' : 'numeric';
  input.autocomplete = 'off';
  input.placeholder = question.placeholder || '';

  const existing = answers[question.id];
  if (existing !== undefined && existing !== null) {
    input.value = isMoney
      ? String((question.kind === 'yearly' ? existing * 12 : existing) / 100)
      : String(existing);
  }

  wrap.append(input);
  field.append(wrap);
  body.append(field, problem);

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
    } else if (isMoney) {
      const paise = readRupees(typed);
      if (paise === null) {
        problem.textContent = 'Please enter an amount, like 5000.';
        problem.hidden = false;
        input.focus();
        return;
      }
      // A yearly figure is carried as the monthly share of it.
      answers[question.id] = question.kind === 'yearly' ? Math.round(paise / 12) : paise;
    } else {
      const count = Number(typed.replace(/\D/g, ''));
      if (!Number.isFinite(count)) {
        problem.textContent = 'Please enter a number.';
        problem.hidden = false;
        return;
      }
      answers[question.id] = count;
    }

    step++;
    render(body);
  };

  const next = node('button', 'primary-action', step === QUESTIONS.length - 1 ? 'Finish' : 'Next');
  next.type = 'button';
  next.addEventListener('click', accept);

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') { event.preventDefault(); accept(); }
  });

  body.append(next);

  if (!question.required) {
    const skip = node('button', 'secondary-action full', 'I do not have this');
    skip.type = 'button';
    skip.addEventListener('click', () => {
      delete answers[question.id];
      step++;
      render(body);
    });
    body.append(skip);
  }

  if (step > 0) body.append(backButton(body));

  input.focus();
}

function backButton(body) {
  const back = node('button', 'link-action', 'Back');
  back.type = 'button';
  back.addEventListener('click', () => { if (step > 0) step--; render(body); });
  return back;
}

/* ---------- what we now know ---------- */

function renderSummary(body) {
  // A share of income for giving, unless they said otherwise.
  const profile = {
    ...answers,
    givingShare: answers.givingShare === 'other' ? 0
      : Number(answers.givingShare ?? 0.10),
    answeredAt: Date.now()
  };

  body.append(node('h3', 'survey-ask', 'That is all Oikonomia needs'));
  body.append(node('p', 'survey-help',
    'It will not ask what you spend on food or travel, because most households have never ' +
    'counted and a guess would only mislead you. Oikonomia will put a starting figure against ' +
    'those, clearly marked as its own estimate. What you actually record this month is what ' +
    'turns them into the truth — and seeing that is the point.'));

  const figures = node('dl', 'understood');
  const row = (label, value) => {
    const item = node('div', 'figure-row');
    item.append(node('dt', null, label));
    item.append(node('dd', null, value));
    figures.append(item);
  };

  row('Money coming in', formatPaise(profile.incomePaise || 0));

  const known = (profile.rentPaise || 0) + (profile.loanPaise || 0) +
    (profile.feesPaise || 0) + (profile.insurancePaise || 0);
  row('Fixed commitments', formatPaise(known));
  row('Left to plan with', formatPaise(Math.max(0, (profile.incomePaise || 0) - known)));

  body.append(figures);

  const make = node('button', 'primary-action', 'Build my plan');
  make.type = 'button';
  make.addEventListener('click', () => {
    saveProfile(profile);
    onFinish(profile);
  });

  const again = node('button', 'secondary-action full', 'Change my answers');
  again.type = 'button';
  again.addEventListener('click', () => { step = 0; render(body); });

  body.append(make, again);
  void t;
}

/* ---------- starting ---------- */

export function startSurvey(body, finished) {
  onFinish = finished || (() => {});
  step = 0;
  answers = { ...(loadProfile() || {}) };
  render(body);
}
