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

/* Each question is one a household can answer without counting anything.
   The wording lives in i18n.js so every one of them speaks both languages. */
const QUESTIONS = [
  { id: 'incomePaise', kind: 'money', key: 'q.income', placeholder: '30000', required: true },
  {
    id: 'incomeSteady', kind: 'choice', key: 'q.steady',
    options: [['steady', 'q.steady.same'], ['varies', 'q.steady.varies'], ['irregular', 'q.steady.irregular']]
  },
  { id: 'adults', kind: 'count', key: 'q.adults', placeholder: '2' },
  { id: 'children', kind: 'count', key: 'q.children', placeholder: '0' },
  { id: 'rentPaise', kind: 'money', key: 'q.rent' },
  { id: 'loanPaise', kind: 'money', key: 'q.loan' },
  { id: 'feesPaise', kind: 'yearly', key: 'q.fees' },
  { id: 'insurancePaise', kind: 'yearly', key: 'q.insurance' },
  {
    id: 'travel', kind: 'choice', key: 'q.travel',
    options: [['walk', 'q.travel.walk'], ['public', 'q.travel.public'],
      ['twowheeler', 'q.travel.twowheeler'], ['car', 'q.travel.car']]
  },
  {
    id: 'givingShare', kind: 'choice', key: 'q.giving',
    options: [['0.10', 'q.giving.tenth'], ['0.05', 'q.giving.twentieth'],
      ['other', 'q.giving.other'], ['0', 'q.giving.none']]
  },
  {
    id: 'shortfall', kind: 'choice', key: 'q.shortfall',
    options: [['comfortable', 'q.shortfall.ok'], ['tight', 'q.shortfall.tight'],
      ['short', 'q.shortfall.short'], ['borrow', 'q.shortfall.borrow']]
  },
  {
    id: 'goal', kind: 'choice', key: 'q.goal',
    options: [['cushion', 'q.goal.cushion'], ['debt', 'q.goal.debt'], ['school', 'q.goal.school'],
      ['home', 'q.goal.home'], ['family', 'q.goal.family'], ['later', 'q.goal.later']]
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
  body.append(node('h3', 'survey-ask', t(question.key)));
  body.append(node('p', 'survey-help', t(question.key + '.help')));

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

  for (const [value, labelKey] of question.options) {
    const choice = node('button', 'welcome-choice', t(labelKey));
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
      t(question.kind === 'yearly' ? 'survey.yearly' : 'survey.monthly')));
  } else {
    field.append(node('span', 'field-label', t('survey.howMany')));
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
        problem.textContent = t('survey.needed');
        problem.hidden = false;
        input.focus();
        return;
      }
      delete answers[question.id];
    } else if (isMoney) {
      const paise = readRupees(typed);
      if (paise === null) {
        problem.textContent = t('add.needAmount');
        problem.hidden = false;
        input.focus();
        return;
      }
      // A yearly figure is carried as the monthly share of it.
      answers[question.id] = question.kind === 'yearly' ? Math.round(paise / 12) : paise;
    } else {
      const count = Number(typed.replace(/\D/g, ''));
      if (!Number.isFinite(count)) {
        problem.textContent = t('survey.notANumber');
        problem.hidden = false;
        return;
      }
      answers[question.id] = count;
    }

    step++;
    render(body);
  };

  const next = node('button', 'primary-action', t(step === QUESTIONS.length - 1 ? 'survey.finish' : 'survey.next'));
  next.type = 'button';
  next.addEventListener('click', accept);

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') { event.preventDefault(); accept(); }
  });

  body.append(next);

  if (!question.required) {
    const skip = node('button', 'secondary-action full', t('survey.dontHave'));
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
  const back = node('button', 'link-action', t('survey.back'));
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

  body.append(node('h3', 'survey-ask', t('survey.done')));
  body.append(node('p', 'survey-help', t('survey.doneHelp')));

  const figures = node('dl', 'understood');
  const row = (label, value) => {
    const item = node('div', 'figure-row');
    item.append(node('dt', null, label));
    item.append(node('dd', null, value));
    figures.append(item);
  };

  row(t('plan.income'), formatPaise(profile.incomePaise || 0));

  const known = (profile.rentPaise || 0) + (profile.loanPaise || 0) +
    (profile.feesPaise || 0) + (profile.insurancePaise || 0);
  row(t('survey.commitments'), formatPaise(known));
  row(t('survey.leftToPlan'), formatPaise(Math.max(0, (profile.incomePaise || 0) - known)));

  body.append(figures);

  const make = node('button', 'primary-action', t('survey.build'));
  make.type = 'button';
  make.addEventListener('click', () => {
    saveProfile(profile);
    onFinish(profile);
  });

  const again = node('button', 'secondary-action full', t('survey.changeAnswers'));
  again.type = 'button';
  again.addEventListener('click', () => { step = 0; render(body); });

  body.append(make, again);
}

/* ---------- starting ---------- */

export function startSurvey(body, finished) {
  onFinish = finished || (() => {});
  step = 0;
  answers = { ...(loadProfile() || {}) };
  render(body);
}
